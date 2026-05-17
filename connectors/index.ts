import { inferMapping, type FieldMapping } from '@/lib/schema-adapter';
import { applyMapping, getCachedMapping, setCachedMapping, headerHash } from '@/lib/apply-mapping';
import { CampaignSchema, AudienceSchema } from './schemas';
import type { Campaign, Audience } from './schemas';
import { buildMappingContext, getRequiredCampaignFields } from './field-registry';

export type { Campaign, Audience };

// Below this we refuse — data is fundamentally incompatible with the target schema
const HARD_FAIL_THRESHOLD = 0.3;
// At/above this from the deterministic registry we skip the LLM entirely
const REGISTRY_SHORT_CIRCUIT_CONFIDENCE = 0.9;

type AdaptResult = {
  data: Campaign[];
  errors: { row: number; error: string }[];
  confidence: number;
  unmappedFields: string[];
  notes?: string;
  mappingSource: 'cache' | 'registry' | 'llm';
};

export async function adaptCampaignData(
  rawData: Record<string, unknown>[],
  cacheKey: string,
  options: { platform?: string } = {},
): Promise<AdaptResult> {
  const sourceFields = Object.keys(rawData[0] ?? {});
  const headerKey = headerHash(sourceFields);

  const cached = getCachedMapping({ sourceKey: cacheKey, headerKey });
  if (cached) {
    const { data, errors } = applyMapping<Campaign>(rawData, cached, CampaignSchema);
    return {
      data,
      errors,
      confidence: cached.confidence,
      unmappedFields: cached.unmappedTargetFields,
      notes: cached.notes,
      mappingSource: 'cache',
    };
  }

  const mappingContext = buildMappingContext(sourceFields, options.platform);
  const registryMapping = registryOnlyMapping(mappingContext.candidates);
  const requiredFields = getRequiredCampaignFields();
  const registryCoversRequired = requiredFields.every((field) =>
    registryMapping.mappings.some((m) => m.targetField === field),
  );

  let mapping: FieldMapping;
  let mappingSource: 'registry' | 'llm';

  if (registryCoversRequired && registryMapping.confidence >= REGISTRY_SHORT_CIRCUIT_CONFIDENCE) {
    mapping = registryMapping;
    mappingSource = 'registry';
    console.log(`[connector] short-circuit registry mapping for "${cacheKey}" — confidence ${registryMapping.confidence.toFixed(2)}`);
  } else {
    mapping = await inferMapping(rawData, CampaignSchema, {
      platform: options.platform,
      mappingContext,
    });
    mappingSource = 'llm';
  }

  if (mapping.confidence < HARD_FAIL_THRESHOLD) {
    throw new Error(
      `Dataset is incompatible with the campaign schema (confidence ${(mapping.confidence * 100).toFixed(0)}%). ` +
      `Could not find meaningful matches for: ${mapping.unmappedTargetFields.join(', ')}. ` +
      (mapping.notes ? `Details: ${mapping.notes.slice(0, 200)}` : ''),
    );
  }

  if (mapping.confidence < 0.6) {
    console.warn(
      `[connector] Partial mapping for "${cacheKey}" — confidence ${(mapping.confidence * 100).toFixed(0)}%. ` +
      `Missing: ${mapping.unmappedTargetFields.join(', ')}`,
    );
  }

  setCachedMapping({ sourceKey: cacheKey, headerKey }, mapping);

  const { data, errors } = applyMapping<Campaign>(rawData, mapping, CampaignSchema);

  return {
    data,
    errors,
    confidence: mapping.confidence,
    unmappedFields: mapping.unmappedTargetFields,
    notes: mapping.notes,
    mappingSource,
  };
}

function registryOnlyMapping(
  candidates: { sourceField: string; targetField: string; transform: string; confidence: number }[],
): FieldMapping {
  const bestByTarget = new Map<string, (typeof candidates)[number]>();
  for (const candidate of candidates) {
    const current = bestByTarget.get(candidate.targetField);
    if (!current || candidate.confidence > current.confidence) {
      bestByTarget.set(candidate.targetField, candidate);
    }
  }
  const mappings = Array.from(bestByTarget.values())
    .filter((candidate) => candidate.confidence >= 0.85)
    .map((candidate) => ({
      sourceField: candidate.sourceField,
      targetField: candidate.targetField,
      transform: candidate.transform as FieldMapping['mappings'][number]['transform'],
    }));

  const mappedTargets = new Set(mappings.map((m) => m.targetField));
  const unmappedTargetFields = getRequiredCampaignFields().filter((field) => !mappedTargets.has(field));
  const avgConfidence = mappings.length
    ? mappings.reduce((sum, m) => sum + (bestByTarget.get(m.targetField)?.confidence ?? 0), 0) / mappings.length
    : 0;

  return {
    mappings,
    unmappedTargetFields,
    confidence: avgConfidence,
    notes: 'Mapping derived from deterministic registry without LLM assistance.',
  };
}

export async function adaptAudienceData(
  rawData: Record<string, unknown>[],
  cacheKey: string,
): Promise<{ data: Audience[]; errors: { row: number; error: string }[] }> {
  const headerKey = headerHash(Object.keys(rawData[0] ?? {}));
  let mapping = getCachedMapping({ sourceKey: cacheKey, headerKey });

  if (!mapping) {
    mapping = await inferMapping(rawData, AudienceSchema);

    if (mapping.confidence < HARD_FAIL_THRESHOLD) {
      throw new Error(
        `Dataset is incompatible with the audience schema (confidence ${(mapping.confidence * 100).toFixed(0)}%).`,
      );
    }

    setCachedMapping({ sourceKey: cacheKey, headerKey }, mapping);
  }

  return applyMapping<Audience>(rawData, mapping, AudienceSchema);
}
