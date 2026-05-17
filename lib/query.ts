import type { Campaign } from '@/connectors/schemas';

export type Metric = 'impressions' | 'clicks' | 'spend' | 'ctr' | 'cpc' | 'cpm' | 'conversions' | 'revenue' | 'roas';
export type GroupKey =
  | 'name'
  | 'adGroupName'
  | 'placementName'
  | 'creativeName'
  | 'audienceName'
  | 'channel'
  | 'accountName'
  | 'platform'
  | 'date';

export type Filter = {
  field: GroupKey | Metric;
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  value: string | number;
};

export type QueryRequest = {
  groupBy?: GroupKey[];
  metrics?: Metric[];
  filters?: Filter[];
  sortBy?: Metric;
  sortDir?: 'asc' | 'desc';
  limit?: number;
};

export type Totals = {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
};

export type QueryRow = Totals & {
  group: Partial<Record<GroupKey, string>>;
};

// One canonical bucketing pass. Every show* tool that asks "group these rows by X"
// routes through here so the Map+get-or-init dance lives in exactly one place.
// keyFn returns the bucket label; callers handle their own fallback for missing
// dimension values (typically 'Unspecified' or 'Other') so the label is explicit.
export function bucketBy(
  rows: Campaign[],
  keyFn: (row: Campaign) => string,
): Map<string, Campaign[]> {
  const buckets = new Map<string, Campaign[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const existing = buckets.get(key);
    if (existing) existing.push(row);
    else buckets.set(key, [row]);
  }
  return buckets;
}

// Single source of truth for ad-data arithmetic. Sum the base metrics across rows,
// then derive rates from the totals — never average per-row rates (that's the
// classic rate-then-aggregate bug). Every show* widget and queryDataset call
// routes through this function so "the chart's CTR" and "the query's CTR" are
// literally the same code path.
export function aggregate(rows: Campaign[]): Totals {
  let impressions = 0;
  let clicks = 0;
  let spend = 0;
  let conversions = 0;
  let revenue = 0;
  for (const row of rows) {
    impressions += row.impressions ?? 0;
    clicks += row.clicks ?? 0;
    spend += row.spend ?? 0;
    conversions += row.conversions ?? 0;
    revenue += row.revenue ?? 0;
  }
  return {
    impressions,
    clicks,
    spend,
    conversions,
    revenue,
    ctr: impressions > 0 ? clicks / impressions : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? spend / (impressions / 1000) : 0,
    roas: spend > 0 ? revenue / spend : 0,
  };
}

export type QueryResult = {
  rows: QueryRow[];
  totalGroups: number;
  groupBy: GroupKey[];
  metrics: Metric[];
  sortBy: Metric;
  sortDir: 'asc' | 'desc';
  limit?: number;
  filtersApplied: number;
};

const DEFAULT_METRICS: Metric[] = ['impressions', 'clicks', 'spend', 'ctr'];

export function queryCampaigns(campaigns: Campaign[], request: QueryRequest = {}): QueryResult {
  const groupBy = (request.groupBy ?? []).slice(0, 4);
  const metrics = request.metrics?.length ? request.metrics : DEFAULT_METRICS;
  const filters = request.filters ?? [];
  const filtered = filters.length === 0 ? campaigns : campaigns.filter((row) => filters.every((filter) => matchesFilter(row, filter)));

  let groups: QueryRow[];
  if (groupBy.length === 0) {
    // Empty result after filtering — return zero groups, not a fake all-zeros rollup.
    // The UI renders an "empty result" state which is far more useful than a row of $0s.
    if (filtered.length === 0) {
      const sortBy = request.sortBy ?? (metrics.includes('spend') ? 'spend' : metrics[0]);
      const sortDir = request.sortDir ?? 'desc';
      return {
        rows: [],
        totalGroups: 0,
        groupBy,
        metrics,
        sortBy,
        sortDir,
        limit: request.limit,
        filtersApplied: filters.length,
      };
    }
    groups = [toQueryRow({}, filtered)];
  } else {
    const buckets = new Map<string, { group: Partial<Record<GroupKey, string>>; rows: Campaign[] }>();
    for (const row of filtered) {
      const groupValues: Partial<Record<GroupKey, string>> = {};
      for (const key of groupBy) groupValues[key] = String(getField(row, key) ?? 'Unspecified');
      const cacheKey = groupBy.map((k) => groupValues[k]).join('');
      const existing = buckets.get(cacheKey);
      if (existing) existing.rows.push(row);
      else buckets.set(cacheKey, { group: groupValues, rows: [row] });
    }
    groups = Array.from(buckets.values()).map(({ group, rows }) => toQueryRow(group, rows));
  }

  const sortBy = request.sortBy ?? (metrics.includes('spend') ? 'spend' : metrics[0]);
  const sortDir = request.sortDir ?? 'desc';
  groups.sort((a, b) => (sortDir === 'asc' ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy]));

  const totalGroups = groups.length;
  const limit = request.limit ?? (groupBy.length === 0 ? undefined : 25);
  if (limit) groups = groups.slice(0, limit);

  return {
    rows: groups,
    totalGroups,
    groupBy,
    metrics,
    sortBy,
    sortDir,
    limit,
    filtersApplied: filters.length,
  };
}

function toQueryRow(group: Partial<Record<GroupKey, string>>, rows: Campaign[]): QueryRow {
  return { group, ...aggregate(rows) };
}

function getField(row: Campaign, key: GroupKey): unknown {
  return row[key];
}

function matchesFilter(row: Campaign, filter: Filter): boolean {
  const value = (row as unknown as Record<string, unknown>)[filter.field];
  if (value === undefined || value === null) return false;
  if (filter.op === 'eq') return String(value) === String(filter.value);
  if (filter.op === 'ne') return String(value) !== String(filter.value);
  if (filter.op === 'contains') return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
  const numericValue = Number(value);
  const numericFilter = Number(filter.value);
  if (!Number.isFinite(numericValue) || !Number.isFinite(numericFilter)) return false;
  if (filter.op === 'gt') return numericValue > numericFilter;
  if (filter.op === 'gte') return numericValue >= numericFilter;
  if (filter.op === 'lt') return numericValue < numericFilter;
  if (filter.op === 'lte') return numericValue <= numericFilter;
  return false;
}
