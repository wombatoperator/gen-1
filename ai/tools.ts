import { tool, type InferUITools, type UIMessage } from 'ai';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Papa from 'papaparse';
import { adaptCampaignData } from '@/connectors';
import { loadDatasetFromUrl } from '@/connectors/url-fetcher';
import { profileRows } from '@/lib/profiler';
import { putDataset, getDatasetById, type LoadedDataset } from '@/lib/dataset-store';
import { aggregate, bucketBy, queryCampaigns, type QueryRequest, type QueryResult } from '@/lib/query';
import { DATASET_CATALOG, getDataset } from '@/lib/dataset-catalog';
import { traceEvent } from '@/lib/agent-trace';
import type { Campaign } from '@/connectors/schemas';

type ToolError = { toolError: string };

const ROWS_VISIBLE_TO_MODEL = 25;

function fixturePath(filename: string): string {
  return join(process.cwd(), 'sample-data', 'fixtures', filename);
}

function inferGrain(rows: Campaign[]): string {
  if (rows.some((row) => row.audienceName)) return 'audience';
  if (rows.some((row) => row.placementName && row.creativeName)) return 'placement+creative';
  if (rows.some((row) => row.creativeName)) return 'creative';
  if (rows.some((row) => row.adGroupName)) return 'ad_group';
  return 'campaign';
}

function columnsPresentInRows(rows: Campaign[]): string[] {
  if (rows.length === 0) return [];
  const candidate = [
    'name', 'adGroupName', 'placementName', 'creativeName', 'audienceName', 'channel', 'accountName',
    'impressions', 'clicks', 'spend', 'ctr', 'cpc', 'cpm', 'conversions', 'revenue', 'date',
  ] as const;
  return candidate.filter((column) =>
    rows.some((row) => {
      const value = (row as unknown as Record<string, unknown>)[column];
      return value !== undefined && value !== null && value !== '';
    }),
  );
}

function categoricalDimensions(rows: Campaign[]): string[] {
  const dims: string[] = [];
  for (const key of ['channel', 'adGroupName', 'placementName', 'creativeName', 'audienceName'] as const) {
    const seen = new Set<string>();
    for (const row of rows) {
      const v = row[key];
      if (typeof v === 'string' && v.length > 0) seen.add(v);
    }
    if (seen.size >= 2 && seen.size <= 200) dims.push(key);
  }
  return dims;
}

function dateRange(rows: Campaign[]): { start: string; end: string; days: number } | undefined {
  const dates = rows.map((row) => row.date).filter((v): v is string => !!v).sort();
  if (dates.length === 0) return undefined;
  return { start: dates[0], end: dates[dates.length - 1], days: new Set(dates).size };
}

function buildLoadSummary(dataset: LoadedDataset) {
  return {
    datasetId: dataset.datasetId,
    platform: dataset.platform,
    label: dataset.label,
    source: dataset.source,
    grain: inferGrain(dataset.rows),
    rowCount: dataset.rows.length,
    totalSourceRows: dataset.totalSourceRows,
    truncated: dataset.truncated,
    confidence: dataset.confidence,
    mappingSource: dataset.mappingSource,
    unmappedFields: dataset.unmappedFields,
    errorCount: dataset.errors.length,
    columnsPresent: columnsPresentInRows(dataset.rows),
    dateRange: dateRange(dataset.rows),
    isTimeSeries: dataset.profile.isTimeSeries,
    categoricalDimensions: categoricalDimensions(dataset.rows),
  };
}

async function loadFixture(datasetId: string): Promise<LoadedDataset> {
  const entry = getDataset(datasetId);
  if (!entry) throw new Error(`Unknown dataset id "${datasetId}".`);
  const path = fixturePath(entry.filename);
  const text = readFileSync(path, 'utf8');
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  if (parsed.errors.length > 0) {
    throw new Error(`Could not parse fixture ${entry.filename}: ${parsed.errors[0].message}`);
  }
  const rows = parsed.data;
  const adapted = await adaptCampaignData(rows, entry.filename, { platform: entry.platform });
  const profile = profileRows(rows);
  const dataset: LoadedDataset = {
    datasetId: entry.id,
    platform: entry.platform,
    source: entry.filename,
    label: entry.label,
    rows: adapted.data,
    errors: adapted.errors,
    confidence: adapted.confidence,
    unmappedFields: adapted.unmappedFields,
    notes: adapted.notes,
    mappingSource: adapted.mappingSource,
    profile,
    totalSourceRows: rows.length,
    truncated: false,
    loadedAt: Date.now(),
  };
  putDataset(dataset);
  return dataset;
}

function withDataset<T>(datasetId: string, fn: (dataset: LoadedDataset) => T): T | ToolError {
  const dataset = getDatasetById(datasetId);
  if (!dataset) return { toolError: `Dataset "${datasetId}" is not loaded. Call loadDataset first.` };
  return fn(dataset);
}

const groupKeyEnum = z.enum([
  'name', 'adGroupName', 'placementName', 'creativeName', 'audienceName', 'channel', 'accountName', 'platform', 'date',
]);
const metricEnum = z.enum(['impressions', 'clicks', 'spend', 'ctr', 'cpc', 'cpm', 'conversions', 'revenue', 'roas']);
const breakdownDimensionEnum = z.enum(['channel', 'adGroupName', 'placementName', 'creativeName', 'audienceName']);

const jsonOutput = (value: unknown) => ({ type: 'json' as const, value: value as never });

export const tools = {
  listDatasets: tool({
    description:
      'List available advertising datasets in the catalog. Returns ids you can pass to loadDataset. ' +
      'Call this when the user asks what data exists, or when you need to discover a dataset id.',
    inputSchema: z.object({}),
    execute: async (): Promise<{ datasets: typeof DATASET_CATALOG }> => ({ datasets: DATASET_CATALOG }),
  }),

  loadDataset: tool({
    description:
      'Normalize a dataset into the canonical schema and cache it for downstream tools. ' +
      'Returns the dataset shape only (grain, columns, date range, dimensions, mapping confidence). ' +
      'Does NOT return totals or rows — use show* or queryDataset for those.',
    inputSchema: z.object({
      id: z.string().optional().describe('Dataset id from the catalog (e.g. "meta_adset"). Mutually exclusive with url.'),
      url: z.string().url().optional().describe('Public CSV URL. Mutually exclusive with id.'),
    }),
    execute: async ({ id, url }, options) => {
      const t0 = Date.now();
      traceEvent('tool.start', { toolName: 'loadDataset', toolCallId: options.toolCallId, id, url });
      try {
        if (!id && !url) return { toolError: 'Provide either id or url.' } as const;
        if (id && url) return { toolError: 'Pass only one of id or url, not both.' } as const;
        const dataset = id ? await loadFixture(id) : await loadDatasetFromUrl(url!);
        const summary = buildLoadSummary(dataset);
        traceEvent('tool.finish', {
          toolName: 'loadDataset', toolCallId: options.toolCallId, durationMs: Date.now() - t0,
          rows: dataset.rows.length, confidence: dataset.confidence, mappingSource: dataset.mappingSource,
        });
        return summary;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        traceEvent('tool.error', { toolName: 'loadDataset', toolCallId: options.toolCallId, error: message });
        return { toolError: message } as const;
      }
    },
  }),

  showKpiStrip: tool({
    description:
      'Show a row of KPI cards (Impressions, Clicks, Spend, CTR, CPC, CPM, Conversions, ROAS). ' +
      'This is the default first widget to render after loadDataset.',
    inputSchema: z.object({
      datasetId: z.string(),
    }),
    execute: async ({ datasetId }) => withDataset(datasetId, (dataset) => ({
      datasetId,
      label: dataset.label,
      platform: dataset.platform,
      totals: aggregate(dataset.rows),
      rowCount: dataset.rows.length,
      dateRange: dateRange(dataset.rows),
    })),
  }),

  showTimeSeries: tool({
    description:
      'Show a daily line chart of a metric over time. Only useful when the dataset has a date column. ' +
      'Optionally breakdownBy a dimension (e.g. "channel") to split into multiple series.',
    inputSchema: z.object({
      datasetId: z.string(),
      metric: metricEnum.describe('Which metric to plot.'),
      breakdownBy: breakdownDimensionEnum.optional().describe('Optional dimension to split into multiple series.'),
    }),
    execute: async ({ datasetId, metric, breakdownBy }) =>
      withDataset(datasetId, (dataset) => {
        const dated = dataset.rows.filter((row) => row.date);
        if (dated.length === 0) {
          return { toolError: 'No date column in this dataset — cannot render a time series.' } as const;
        }
        // Two-level bucketing: first by series, then per-series by date. Each leaf bucket
        // is aggregated exactly once and we only read the requested metric from the totals.
        const seriesBuckets = bucketBy(dated, (row) =>
          breakdownBy ? String(row[breakdownBy] ?? 'Other') : 'all',
        );
        const series = Array.from(seriesBuckets.entries()).map(([name, seriesRows]) => {
          const dateBuckets = bucketBy(seriesRows, (row) => row.date!);
          return {
            name,
            points: Array.from(dateBuckets.entries())
              .map(([date, rowsForDate]) => ({ date, value: aggregate(rowsForDate)[metric] }))
              .sort((a, b) => a.date.localeCompare(b.date)),
          };
        });
        return { datasetId, metric, breakdownBy: breakdownBy ?? null, series };
      }),
  }),

  showBreakdown: tool({
    description:
      'Show top N buckets for a dimension as a horizontal bar chart, sorted by the chosen metric. ' +
      'Use to compare channels, ad groups, creatives, placements, or audiences.',
    inputSchema: z.object({
      datasetId: z.string(),
      dimension: breakdownDimensionEnum,
      metric: metricEnum.default('spend'),
      limit: z.number().int().positive().max(20).default(8),
    }),
    execute: async ({ datasetId, dimension, metric, limit }) =>
      withDataset(datasetId, (dataset) => {
        const buckets = bucketBy(dataset.rows, (row) => String(row[dimension] ?? 'Unspecified'));
        const result = Array.from(buckets.entries()).map(([label, rows]) => ({ label, ...aggregate(rows) }));
        result.sort((a, b) => (b as unknown as Record<string, number>)[metric] - (a as unknown as Record<string, number>)[metric]);
        return {
          datasetId,
          dimension,
          metric,
          buckets: result.slice(0, limit),
          totalBuckets: result.length,
        };
      }),
  }),

  showAudienceMix: tool({
    description:
      'Show audience segments as share cards with impressions, CTR, and spend. ' +
      'Only call if the dataset has an audienceName dimension (check categoricalDimensions from loadDataset).',
    inputSchema: z.object({
      datasetId: z.string(),
    }),
    execute: async ({ datasetId }) =>
      withDataset(datasetId, (dataset) => {
        const audienceRows = dataset.rows.filter((row) => row.audienceName);
        if (audienceRows.length === 0) {
          return { toolError: 'This dataset has no audience column — call showBreakdown instead.' } as const;
        }
        const buckets = bucketBy(audienceRows, (row) => String(row.audienceName));
        const cards = Array.from(buckets.entries()).map(([label, rows]) => ({ label, ...aggregate(rows) }));
        cards.sort((a, b) => b.impressions - a.impressions);
        return { datasetId, cards: cards.slice(0, 12) };
      }),
  }),

  showEfficiencyMap: tool({
    description:
      'Show a scatter plot mapping CTR (x) against CPC (y). Bubble size = spend. ' +
      'Highlights efficient outliers (high CTR + low CPC) versus inefficient ones.',
    inputSchema: z.object({
      datasetId: z.string(),
    }),
    execute: async ({ datasetId }) =>
      withDataset(datasetId, (dataset) => {
        const points = dataset.rows
          .filter((row) => row.ctr !== undefined && row.spend !== undefined && (row.clicks ?? 0) > 0)
          .map((row) => ({
            name: row.name,
            adGroup: row.adGroupName ?? null,
            ctr: row.ctr ?? 0,
            cpc: row.cpc ?? (row.spend ?? 0) / (row.clicks || 1),
            spend: row.spend ?? 0,
          }))
          .sort((a, b) => b.spend - a.spend)
          .slice(0, 200);
        if (points.length === 0) {
          return { toolError: 'Not enough rows with CTR + CPC + clicks > 0 to render the efficiency map.' } as const;
        }
        const totals = aggregate(dataset.rows);
        return { datasetId, points, avgCtr: totals.ctr, avgCpc: totals.cpc };
      }),
  }),

  queryDataset: tool({
    description:
      'Aggregate, filter, sort, and slice the normalized rows of a loaded dataset. ' +
      'Use to answer specific value questions ("top 5 audiences by ROAS", "spend on Nov 15"). ' +
      'For visual summaries prefer show* tools instead.',
    inputSchema: z.object({
      datasetId: z.string(),
      groupBy: z.array(groupKeyEnum).max(4).optional(),
      metrics: z.array(metricEnum).optional(),
      filters: z.array(z.object({
        field: z.enum(['name', 'adGroupName', 'placementName', 'creativeName', 'audienceName', 'channel', 'accountName', 'platform', 'date', 'impressions', 'clicks', 'spend', 'ctr', 'cpc', 'cpm', 'conversions', 'revenue']),
        op: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains']),
        value: z.union([z.string(), z.number()]),
      })).optional(),
      sortBy: metricEnum.optional(),
      sortDir: z.enum(['asc', 'desc']).optional(),
      limit: z.number().int().positive().max(200).optional(),
    }),
    toModelOutput: ({ output }) => {
      if (output && typeof output === 'object' && 'toolError' in (output as object)) {
        return jsonOutput(output);
      }
      const result = output as QueryResult & { datasetId: string };
      if (result.rows.length <= ROWS_VISIBLE_TO_MODEL) return jsonOutput(result);
      return jsonOutput({ ...result, rows: result.rows.slice(0, ROWS_VISIBLE_TO_MODEL) });
    },
    execute: async (args, options) => {
      traceEvent('tool.start', { toolName: 'queryDataset', toolCallId: options.toolCallId, datasetId: args.datasetId });
      const dataset = getDatasetById(args.datasetId);
      if (!dataset) return { toolError: `Dataset "${args.datasetId}" is not loaded. Call loadDataset first.` } as const;
      try {
        const result = queryCampaigns(dataset.rows, args as QueryRequest);
        return { ...result, datasetId: args.datasetId };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { toolError: message } as const;
      }
    },
  }),
};

export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<unknown, Record<string, never>, ChatTools>;
