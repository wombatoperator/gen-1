import { z } from 'zod';
import type { FieldMapping } from './schema-adapter';

const TRANSFORMS: Record<string, (v: unknown) => unknown> = {
  none:                  (v) => v,
  percentage_to_decimal: (v) => toFiniteNumber(v) / 100,
  micros_to_dollars:     (v) => toFiniteNumber(v) / 1_000_000,
  cents_to_dollars:      (v) => toFiniteNumber(v) / 100,
  string_to_number:      (v) => toFiniteNumber(v),
  iso_date:              (v) => toIsoDate(v),
};

// Duck-typed schema interface: avoids Zod's input/output generic mismatch
// when schemas use .default() (which splits input vs output types)
type ParseableSchema<T> = {
  safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: z.ZodError };
};

export function applyMapping<T>(
  rows: Record<string, unknown>[],
  mapping: FieldMapping,
  targetSchema: ParseableSchema<T>,
): { data: T[]; errors: { row: number; error: string }[] } {
  const t0 = Date.now();
  console.log(`[apply-mapping] start — ${rows.length} rows, ${mapping.mappings.length} field mappings`);

  const data: T[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const mapped: Record<string, unknown> = {};

    for (const m of mapping.mappings) {
      const rawValue = m.sourceField in raw ? raw[m.sourceField] : m.defaultValue;
      if (rawValue !== undefined) {
        try {
          const transform = TRANSFORMS[m.transform ?? 'none'] ?? TRANSFORMS.none;
          mapped[m.targetField] = transform(rawValue);
        } catch (error) {
          errors.push({
            row: i,
            error: `Could not transform "${m.sourceField}" to "${m.targetField}": ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      }
    }

    const result = targetSchema.safeParse(mapped);
    if (result.success) {
      data.push(result.data);
    } else {
      errors.push({ row: i, error: result.error.message });
    }
  }

  console.log(`[apply-mapping] done in ${Date.now() - t0}ms — ${data.length} ok, ${errors.length} errors`);
  if (errors.length > 0) {
    console.warn('[apply-mapping] first error:', errors[0]);
  }

  return { data, errors };
}

// Module-level cache — survives across requests in the same process instance.
// Keyed by header signature so the same column shape reuses the same mapping
// across files. Source key (filename/url) is a secondary index.
const mappingByHeader = new Map<string, FieldMapping>();
const mappingBySource = new Map<string, FieldMapping>();

export function headerHash(columns: string[]): string {
  return columns.map((c) => c.trim().toLowerCase()).sort().join('|');
}

export function getCachedMapping(args: { sourceKey?: string; headerKey?: string }): FieldMapping | undefined {
  if (args.headerKey) {
    const hit = mappingByHeader.get(args.headerKey);
    if (hit) {
      console.log(`[apply-mapping] header cache hit (${args.headerKey.slice(0, 32)}…)`);
      return hit;
    }
  }
  if (args.sourceKey) {
    const hit = mappingBySource.get(args.sourceKey);
    if (hit) {
      console.log(`[apply-mapping] source cache hit for "${args.sourceKey}"`);
      return hit;
    }
  }
  return undefined;
}

export function setCachedMapping(args: { sourceKey?: string; headerKey?: string }, mapping: FieldMapping): void {
  if (args.headerKey) mappingByHeader.set(args.headerKey, mapping);
  if (args.sourceKey) mappingBySource.set(args.sourceKey, mapping);
}

function toFiniteNumber(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Expected a finite number, received ${String(value)}`);
  }
  return number;
}

function toIsoDate(value: unknown): string {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Expected a valid date, received ${String(value)}`);
  }
  return date.toISOString().split('T')[0];
}
