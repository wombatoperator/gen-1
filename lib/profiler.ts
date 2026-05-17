export type CsvProfile = {
  rows: number;
  columns: string[];
  dateColumns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  isTimeSeries: boolean;
  dateSummary: Record<string, { min: string; max: string; uniqueDays: number }>;
  numericSummary: Record<string, { sum: number; min: number; max: number; avg: number }>;
  categorySummary: Record<string, [string, number][]>;
};

const ISO_LIKE = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/;
const US_LIKE = /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/;
const CATEGORICAL_MAX_UNIQUE = 50;
const TOP_CATEGORIES = 8;

export function profileRows(rows: Record<string, unknown>[]): CsvProfile {
  if (rows.length === 0) {
    return {
      rows: 0,
      columns: [],
      dateColumns: [],
      numericColumns: [],
      categoricalColumns: [],
      isTimeSeries: false,
      dateSummary: {},
      numericSummary: {},
      categorySummary: {},
    };
  }

  const columns = Object.keys(rows[0]);
  const dateColumns: string[] = [];
  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];
  const dateSummary: CsvProfile['dateSummary'] = {};
  const numericSummary: CsvProfile['numericSummary'] = {};
  const categorySummary: CsvProfile['categorySummary'] = {};

  for (const column of columns) {
    const values = rows.map((row) => row[column]).filter((value) => value !== null && value !== undefined && value !== '');
    if (values.length === 0) continue;

    if (isDateColumn(column, values)) {
      const isoDates = values.map((value) => toIsoDate(value)).filter((value): value is string => value !== undefined);
      if (isoDates.length > 0) {
        const sorted = [...isoDates].sort();
        dateColumns.push(column);
        dateSummary[column] = {
          min: sorted[0],
          max: sorted[sorted.length - 1],
          uniqueDays: new Set(isoDates).size,
        };
        continue;
      }
    }

    if (isNumericColumn(values)) {
      const numbers = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
      if (numbers.length > values.length * 0.7) {
        numericColumns.push(column);
        const sum = numbers.reduce((acc, value) => acc + value, 0);
        numericSummary[column] = {
          sum,
          min: Math.min(...numbers),
          max: Math.max(...numbers),
          avg: sum / numbers.length,
        };
        continue;
      }
    }

    const counts = new Map<string, number>();
    for (const value of values) {
      const key = String(value);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (counts.size <= CATEGORICAL_MAX_UNIQUE) {
      categoricalColumns.push(column);
      categorySummary[column] = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_CATEGORIES);
    }
  }

  const isTimeSeries = dateColumns.some((column) => (dateSummary[column]?.uniqueDays ?? 0) >= 2);

  return {
    rows: rows.length,
    columns,
    dateColumns,
    numericColumns,
    categoricalColumns,
    isTimeSeries,
    dateSummary,
    numericSummary,
    categorySummary,
  };
}

function isDateColumn(name: string, values: unknown[]): boolean {
  const lower = name.toLowerCase();
  const nameLooksDate = lower === 'date' || lower === 'day' || lower.endsWith('_date') || lower.endsWith(' date') || lower.includes('date_');
  const sample = values.slice(0, 20).map(String);
  const valueLooksDate = sample.filter((value) => ISO_LIKE.test(value) || US_LIKE.test(value)).length / Math.max(1, sample.length);
  return nameLooksDate || valueLooksDate > 0.7;
}

function isNumericColumn(values: unknown[]): boolean {
  const sample = values.slice(0, 50);
  const numeric = sample.filter((value) => {
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') {
      const stripped = value.replace(/[,$%\s]/g, '');
      return stripped.length > 0 && Number.isFinite(Number(stripped));
    }
    return false;
  });
  return numeric.length / Math.max(1, sample.length) > 0.8;
}

function toIsoDate(value: unknown): string | undefined {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return value.toISOString().split('T')[0];
  }
  const text = String(value).trim();
  if (!text) return undefined;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return undefined;
}
