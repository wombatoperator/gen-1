'use client';

import { WidgetShell } from '@/components/ui/widget-shell';
import { fmt, metricColor, PLATFORM_LABELS, type MetricKey } from '@/lib/format';
import { useCountUp } from '@/lib/animation';

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

type Cell = { label: string; metric: MetricKey; raw: number; format: (n: number) => string; sub?: string };

export function KpiStripWidget({ data }: { data: KpiData }) {
  const t = data.totals;
  const cells: Cell[] = [
    { label: 'Impressions', metric: 'impressions', raw: t.impressions, format: fmt.compact, sub: fmt.number(t.impressions) },
    { label: 'Clicks',      metric: 'clicks',      raw: t.clicks,      format: fmt.compact, sub: fmt.number(t.clicks) },
    { label: 'Spend',       metric: 'spend',       raw: t.spend,       format: (v) => (v > 0 ? fmt.currency(v) : '—') },
    { label: 'CTR',         metric: 'ctr',         raw: t.ctr,         format: (v) => (v > 0 ? fmt.percent(v) : '—') },
    { label: 'CPC',         metric: 'cpc',         raw: t.cpc,         format: (v) => (v > 0 ? fmt.currency(v) : '—') },
    { label: 'CPM',         metric: 'cpm',         raw: t.cpm,         format: (v) => (v > 0 ? fmt.currency(v) : '—') },
  ];
  if (t.conversions > 0) cells.push({ label: 'Conversions', metric: 'conversions', raw: t.conversions, format: fmt.number });
  if (t.roas > 0) cells.push({ label: 'ROAS', metric: 'roas', raw: t.roas, format: (v) => `${v.toFixed(2)}x` });

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
        {cells.map((cell, i) => (
          <KpiCell key={cell.label} cell={cell} index={i} total={cells.length} />
        ))}
      </div>
    </WidgetShell>
  );
}

function KpiCell({ cell, index, total }: { cell: Cell; index: number; total: number }) {
  const c = metricColor(cell.metric);
  // Stagger the countup so they cascade across the strip — 80ms per cell.
  const duration = 900 + (index % 4) * 60;
  const animated = useCountUp(cell.raw, duration);

  // Border calc for the cell grid — last column has no right border at each breakpoint.
  const borderClasses = [
    'border-b border-[var(--color-rule-soft)]',
    index % 2 !== 1 ? 'sm:border-r' : '',
    index % 3 !== 2 ? 'sm:border-r' : '',
    index % 4 !== 3 ? 'lg:border-r' : '',
    'border-[var(--color-rule-soft)]',
    // Bottom row: drop bottom border
    index >= total - (total % 4 || 4) ? 'last:border-b-0' : '',
  ].join(' ');

  return (
    <div
      className={`relative px-5 py-4 ${borderClasses} animate-[fadeUp_500ms_cubic-bezier(0.2,0.7,0.2,1)_both]`}
      style={{ animationDelay: `${250 + index * 60}ms` }}
    >
      <div className="flex items-center gap-2">
        <span className="inline-block w-1 h-3.5 rounded-sm" style={{ backgroundColor: c.solid }} aria-hidden />
        <span className="eyebrow text-[9.5px]">{cell.label}</span>
      </div>
      <div className="mt-2 text-[24px] tracking-tight font-medium tabular-nums text-[var(--color-ink)] leading-none">
        {cell.format(animated)}
      </div>
      {cell.sub && cell.sub !== cell.format(animated) && (
        <div className="mt-1.5 text-[11px] text-[var(--color-ink-muted)] tabular-nums">{cell.sub}</div>
      )}
    </div>
  );
}
