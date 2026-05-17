import { WidgetShell } from '@/components/ui/widget-shell';
import { fmt, metricColor, PLATFORM_LABELS, type MetricKey } from '@/lib/format';

type KpiData = {
  datasetId: string;
  label: string;
  platform: string;
  rowCount: number;
  dateRange?: { start: string; end: string; days: number };
  totals: {
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
};

type Cell = { label: string; metric: MetricKey; value: string; sub?: string };

export function KpiStripWidget({ data }: { data: KpiData }) {
  const t = data.totals;
  const cells: Cell[] = [
    { label: 'Impressions', metric: 'impressions', value: fmt.compact(t.impressions), sub: fmt.number(t.impressions) },
    { label: 'Clicks',      metric: 'clicks',      value: fmt.compact(t.clicks), sub: fmt.number(t.clicks) },
    { label: 'Spend',       metric: 'spend',       value: t.spend > 0 ? fmt.currency(t.spend) : '—' },
    { label: 'CTR',         metric: 'ctr',         value: t.ctr > 0 ? fmt.percent(t.ctr) : '—' },
    { label: 'CPC',         metric: 'cpc',         value: t.cpc > 0 ? fmt.currency(t.cpc) : '—' },
    { label: 'CPM',         metric: 'cpm',         value: t.cpm > 0 ? fmt.currency(t.cpm) : '—' },
  ];
  if (t.conversions > 0) cells.push({ label: 'Conversions', metric: 'conversions', value: fmt.number(t.conversions) });
  if (t.roas > 0) cells.push({ label: 'ROAS', metric: 'roas', value: `${t.roas.toFixed(2)}x` });

  return (
    <WidgetShell
      eyebrow="Totals"
      title={PLATFORM_LABELS[data.platform] ?? data.platform}
      subtitle={
        <span>
          {data.rowCount.toLocaleString()} rows
          {data.dateRange && (
            <>
              <span className="text-[var(--color-ink-faint)]"> · </span>
              <span className="font-mono text-[11px]">{data.dateRange.start} → {data.dateRange.end}</span>
            </>
          )}
        </span>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {cells.map((cell, i) => {
          const c = metricColor(cell.metric);
          return (
            <div
              key={cell.label}
              className={`relative px-5 py-4 border-b border-[var(--color-rule-soft)] ${
                i % 2 !== 1 ? 'sm:border-r' : ''
              } ${i % 3 !== 2 ? 'sm:border-r' : ''} ${i % 4 !== 3 ? 'lg:border-r' : ''} border-[var(--color-rule-soft)]`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-1 h-3.5 rounded-sm"
                  style={{ backgroundColor: c.solid }}
                  aria-hidden
                />
                <span className="eyebrow text-[9.5px]">{cell.label}</span>
              </div>
              <div className="mt-2 text-[24px] tracking-tight font-medium tabular-nums text-[var(--color-ink)] leading-none">
                {cell.value}
              </div>
              {cell.sub && cell.sub !== cell.value && (
                <div className="mt-1.5 text-[11px] text-[var(--color-ink-muted)] tabular-nums">{cell.sub}</div>
              )}
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}
