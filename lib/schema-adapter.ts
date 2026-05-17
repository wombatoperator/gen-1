import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import {
  buildMappingContext,
  getCampaignCanonicalFields,
  type MappingContext,
} from '@/connectors/field-registry';
import { traceEvent } from '@/lib/agent-trace';

const LLM_SAMPLE_LIMIT = 25;

const FieldMappingSchema = z.object({
  mappings: z.array(
    z.object({
      sourceField: z.string().describe('Field name as it appears in the raw source data'),
      targetField: z.string().describe('Field name in the standardized target schema'),
      transform: z
        .enum([
          'none',
          'percentage_to_decimal', // 2.5 → 0.025
          'micros_to_dollars',     // 4800000000 → 4800.00
          'cents_to_dollars',      // 480000 → 4800.00
          'string_to_number',      // "4850.00" → 4850
          'iso_date',              // any date format → YYYY-MM-DD
        ])
        .default('none')
        .describe('Unit or format transform to apply to the source value'),
      defaultValue: z
        .string()
        .optional()
        .describe('String representation of default to use when source field is absent'),
    }),
  ).describe('One entry per target schema field'),
  unmappedTargetFields: z
    .array(z.string())
    .describe('Target fields that have no reasonable match in the source data'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Overall mapping confidence: 1.0 = perfect match, 0.0 = no usable mapping'),
  notes: z.string().optional().describe('Ambiguities or caveats about the mapping'),
});

export type FieldMapping = z.infer<typeof FieldMappingSchema>;

export async function inferMapping(
  sample: Record<string, unknown>[],
  targetSchema: z.ZodObject<Record<string, z.ZodTypeAny>>,
  options: { platform?: string; mappingContext?: MappingContext } = {},
): Promise<FieldMapping> {
  const llmSample = sample.slice(0, LLM_SAMPLE_LIMIT);
  const targetFields = Object.entries(targetSchema.shape).map(([key, shape]) => ({
    name: key,
    description: (shape as z.ZodTypeAny & { description?: string }).description ?? key,
  }));
  const sourceColumns = Object.keys(sample[0] ?? {});
  const mappingContext = options.mappingContext ?? buildMappingContext(sourceColumns, options.platform);
  const allowedTargetFields = new Set(targetFields.map((field) => field.name));
  const deterministicMappings = mappingContext.candidates
    .filter((candidate) => candidate.confidence >= 0.95 && allowedTargetFields.has(candidate.targetField))
    .filter(
      (candidate, index, list) =>
        list.findIndex((item) => item.targetField === candidate.targetField) === index,
    );

  if (deterministicMappings.length > 0) {
    console.log('[schema-adapter] registry candidates', {
      platform: mappingContext.platform,
      highConfidence: deterministicMappings.map(
        (m) => `${m.sourceField} → ${m.targetField} (${m.transform}, ${m.confidence})`,
      ),
    });
  }

  const t0 = Date.now();
  console.log('[schema-adapter] inferMapping start', {
    fullRows: sample.length,
    llmSampleRows: llmSample.length,
    llmSampleLimit: LLM_SAMPLE_LIMIT,
    sourceColumns,
    targetFields: targetFields.map((f) => f.name),
    platform: mappingContext.platform,
    candidateCount: mappingContext.candidates.length,
  });
  traceEvent('schema_adapter.llm_sample', {
    fullRows: sample.length,
    llmSampleRows: llmSample.length,
    llmSampleLimit: LLM_SAMPLE_LIMIT,
    sourceColumnCount: sourceColumns.length,
    platform: mappingContext.platform,
  });

  const { object } = await generateObject({
    model: anthropic('claude-haiku-4-5-20251001'),
    schema: FieldMappingSchema,
    prompt: `You are mapping a raw advertising dataset to a standardized campaign performance schema.

Use the registry context as guardrails. You may handle messy headers, but you must map only to allowed target fields.

Raw data sample (${llmSample.length} rows, hard limit ${LLM_SAMPLE_LIMIT}; never infer from more rows than this):
${JSON.stringify(llmSample, null, 2)}

Allowed canonical fields:
${JSON.stringify(mappingContext.canonicalFields.length > 0 ? mappingContext.canonicalFields : getCampaignCanonicalFields(), null, 2)}

Known platform registry:
${JSON.stringify(mappingContext.registry ?? null, null, 2)}

Deterministic mapping candidates from aliases and fuzzy matching:
${JSON.stringify(mappingContext.candidates.slice(0, 30), null, 2)}

Rules:
- Map source fields only to these target fields: ${targetFields.map((f) => f.name).join(', ')}
- Prefer deterministic mapping candidates when they are semantically correct
- Do not invent target fields
- Do not map dimensions to metrics or metrics to identifiers
- Identify unit transforms: if CTR is stored as a percentage (e.g. 2.5 meaning 2.5%) use percentage_to_decimal; if costs are in Google micros use micros_to_dollars; if a numeric field is stored as a string use string_to_number; if a date is not YYYY-MM-DD use iso_date
- Set confidence based on completeness and clarity of the mapping
- List any target fields with no reasonable source match in unmappedTargetFields`,
  });

  const sanitized = sanitizeMapping(object, allowedTargetFields);

  console.log(`[schema-adapter] inferMapping done in ${Date.now() - t0}ms`, {
    confidence: sanitized.confidence,
    unmapped: sanitized.unmappedTargetFields,
    notes: sanitized.notes,
    mappings: sanitized.mappings.map((m) => `${m.sourceField} → ${m.targetField} (${m.transform})`),
  });

  return sanitized;
}

function sanitizeMapping(mapping: FieldMapping, allowedTargetFields: Set<string>): FieldMapping {
  const mappings = mapping.mappings.filter((candidate) => {
    return allowedTargetFields.has(candidate.targetField);
  });
  const mappedTargets = new Set(mappings.map((candidate) => candidate.targetField));
  const unmappedTargetFields = Array.from(
    new Set([
      ...mapping.unmappedTargetFields.filter((field) => allowedTargetFields.has(field)),
      ...Array.from(allowedTargetFields).filter((field) => !mappedTargets.has(field)),
    ]),
  );

  const removedCount = mapping.mappings.length - mappings.length;
  return {
    ...mapping,
    mappings,
    unmappedTargetFields,
    confidence: removedCount > 0 ? Math.min(mapping.confidence, 0.75) : mapping.confidence,
    notes: [
      mapping.notes,
      removedCount > 0 ? `${removedCount} mapping(s) removed because they targeted fields outside the canonical schema.` : undefined,
    ].filter(Boolean).join(' '),
  };
}
