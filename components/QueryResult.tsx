import { WidgetShell } from '@/components/ui/widget-shell';
import { CardActionPill } from '@/components/ui/card';
import type { QueryResult } from '@/lib/query';
import { fmt, formatMetric, metricColor, type MetricKey } from '@/lib/format';

const GROUP_LABELS: Record<string, string> = {
  name: 'Campaign',
  adGroupName: 'Ad Group',
  placementName: 'Placement',
  creativeName: 'Creative',
  audienceName: 'Audience',
  channel: 'Channel',
  accountName: 'Account',
  platform: 'Platform',
  date: 'Date',
};

const METRIC_LABELS: Record<MetricKey, string> = {
  impressions: 'Impressions',
  clicks: 'Clicks',
  spend: 'Spend',
  ctr: 'CTR',
  cpc: 'CPC',
  cpm: 'CPM',
  conversions: 'Conv.',
  revenue: 'Revenue',
  roas: 'ROAS',
};

export function QueryResultView({ result }: { result: QueryResult }) {
  const { rows, groupBy, metrics, sortBy, sortDir, totalGroups, limit, filtersApplied } = result;

  if (rows.length === 0) {
    return (
      <WidgetShell eyebrow="Query result" title="No rows matched" subtitle="Try widening filters or different groupBy dimensions.">
        <div className="px-5 py-5 text-[12.5px] text-[var(--color-ink-muted)]">
          The query returned an empty result set.
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      eyebrow="Query result"
      title={
        groupBy.length === 0
          ? 'Total rollup'
          : `Grouped by ${groupBy.map((g) => GROUP_LABELS[g] ?? g).join(' · ')}`
      }
      subtitle={
        <span className="font-mono text-[11px]">
          sort {sortBy} {sortDir} · {rows.length} of {totalGroups} group{totalGroups === 1 ? '' : 's'}
          {limit && totalGroups > rows.length && ` · limit ${limit}`}
          {filtersApplied > 0 && ` · ${filtersApplied} filter${filtersApplied === 1 ? '' : 's'}`}
        </span>
      }
      trailing={metrics.slice(0, 2).map((m) => <CardActionPill key={m}>{METRIC_LABELS[m]}</CardActionPill>)}
    >
      <div className="overflow-auto max-h-[440px] scroll-quiet">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--color-canvas-raised)] border-b border-[var(--color-rule)] shadow-[0_1px_0_var(--color-rule-soft)]">
              {groupBy.map((key) => (
                <th
                  key={key}
                  className="px-5 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-muted)]"
                >
                  {GROUP_LABELS[key] ?? key}
                </th>
              ))}
              {groupBy.length === 0 && (
                <th className="px-5 py-2.5 text-left text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">
                  Total
                </th>
              )}
              {metrics.map((metric) => {
                const c = metricColor(metric);
                return (
                  <th
                    key={metric}
                    className="px-5 py-2.5 text-right text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink-muted)]"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-1 h-2.5 rounded-sm" style={{ backgroundColor: c.solid }} />
                      {METRIC_LABELS[metric]}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className={`group/row border-b border-[var(--color-rule-soft)] last:border-b-0 transition-colors ${
                  index % 2 === 1 ? 'bg-[var(--color-canvas-sunken)]/35' : ''
                } hover:bg-[var(--color-data-blue-soft)]/40`}
              >
                {groupBy.map((key) => (
                  <td key={key} className="px-5 py-2.5 text-[var(--color-ink)] font-medium max-w-[280px] truncate">
                    {row.group[key] ?? <span className="text-[var(--color-ink-faint)]">—</span>}
                  </td>
                ))}
                {groupBy.length === 0 && (
                  <td className="px-5 py-2.5 text-[var(--color-ink)] font-medium">All rows</td>
                )}
                {metrics.map((metric) => {
                  const value = (row as unknown as Record<string, number>)[metric] ?? 0;
                  return (
                    <td key={metric} className="px-5 py-2.5 text-right font-mono text-[12px] tabular-nums text-[var(--color-ink-soft)]">
                      {formatMetric(metric, value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {rows.length > 1 && groupBy.length > 0 && (
            <tfoot>
              <tr className="bg-[var(--color-canvas-sunken)]/70 border-t-2 border-[var(--color-rule)] text-[12.5px]">
                <td className="px-5 py-2.5 font-medium text-[var(--color-ink)]" colSpan={groupBy.length}>
                  Visible total
                </td>
                {metrics.map((metric) => {
                  if (metric === 'ctr' || metric === 'cpc' || metric === 'cpm' || metric === 'roas') {
                    return (
                      <td key={metric} className="px-5 py-2.5 text-right text-[var(--color-ink-faint)]">
                        —
                      </td>
                    );
                  }
                  const sum = rows.reduce((acc, row) => acc + ((row as unknown as Record<string, number>)[metric] ?? 0), 0);
                  return (
                    <td
                      key={metric}
                      className="px-5 py-2.5 text-right font-mono tabular-nums font-medium text-[var(--color-ink)]"
                    >
                      {metric === 'spend' || metric === 'revenue' ? fmt.currency(sum) : fmt.number(sum)}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </WidgetShell>
  );
}
