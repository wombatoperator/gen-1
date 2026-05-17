'use client';

import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { WidgetShell } from '@/components/ui/widget-shell';
import { CardActionPill } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { formatMetric, metricColor, SERIES_PALETTE, type MetricKey } from '@/lib/format';

type TimeSeriesData = {
  datasetId: string;
  metric: MetricKey;
  breakdownBy: string | null;
  series: { name: string; points: { date: string; value: number }[] }[];
};

export function TimeSeriesWidget({ data }: { data: TimeSeriesData }) {
  const dateSet = new Set<string>();
  for (const s of data.series) for (const p of s.points) dateSet.add(p.date);
  const allDates = Array.from(dateSet).sort();
  const merged = allDates.map((date) => {
    const row: Record<string, number | string> = { date };
    for (const s of data.series) {
      const point = s.points.find((p) => p.date === date);
      row[s.name] = point?.value ?? 0;
    }
    return row;
  });

  const singleSeries = data.series.length === 1;
  // Single series → use the metric's semantic color. Multi series → ordered palette.
  const seriesColor = (i: number) => (singleSeries ? metricColor(data.metric).solid : SERIES_PALETTE[i % SERIES_PALETTE.length]);

  const config: ChartConfig = {};
  data.series.forEach((s, i) => {
    config[s.name] = { label: s.name, color: seriesColor(i) };
  });

  const primary = seriesColor(0);

  return (
    <WidgetShell
      eyebrow={`Trend · ${data.metric}`}
      title={
        <span>
          {metricTitle(data.metric)} over time
          {data.breakdownBy && (
            <span className="font-normal text-[var(--color-ink-muted)]"> · split by {data.breakdownBy}</span>
          )}
        </span>
      }
      subtitle={
        <span>
          {allDates.length} reporting day{allDates.length === 1 ? '' : 's'}
          <span className="text-[var(--color-ink-faint)]"> · </span>
          {data.series.length} series
        </span>
      }
      trailing={
        <CardActionPill style={{ color: metricColor(data.metric).ink, borderColor: metricColor(data.metric).solid, backgroundColor: metricColor(data.metric).soft }}>
          {data.metric.toUpperCase()}
        </CardActionPill>
      }
    >
      <div className="px-5 py-5">
        <ChartContainer config={config} className="h-[260px]">
          {singleSeries ? (
            <AreaChart data={merged} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={`ts-fill-${data.datasetId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 4" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={32}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                width={54}
                tickFormatter={(v: number) => formatMetric(data.metric, v)}
              />
              <ChartTooltip formatter={(value) => formatMetric(data.metric, value)} />
              <Area
                type="monotone"
                dataKey={data.series[0].name}
                stroke={primary}
                strokeWidth={2}
                fill={`url(#ts-fill-${data.datasetId})`}
                dot={false}
                activeDot={{ r: 4, fill: primary, stroke: 'white', strokeWidth: 2 }}
              />
            </AreaChart>
          ) : (
            <LineChart data={merged} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 4" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={32}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                width={54}
                tickFormatter={(v: number) => formatMetric(data.metric, v)}
              />
              <ChartTooltip formatter={(value) => formatMetric(data.metric, value)} />
              {data.series.map((s, i) => (
                <Line
                  key={s.name}
                  dataKey={s.name}
                  type="monotone"
                  stroke={seriesColor(i)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: seriesColor(i), stroke: 'white', strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          )}
        </ChartContainer>
        {!singleSeries && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 pl-1">
            {data.series.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-muted)]">
                <span
                  className="inline-block w-2.5 h-1 rounded-full"
                  style={{ backgroundColor: seriesColor(i) }}
                />
                <span className="truncate max-w-[140px]" title={s.name}>{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetShell>
  );
}

function metricTitle(metric: MetricKey): string {
  if (metric === 'ctr') return 'CTR';
  if (metric === 'cpc') return 'CPC';
  if (metric === 'cpm') return 'CPM';
  if (metric === 'roas') return 'ROAS';
  return metric.charAt(0).toUpperCase() + metric.slice(1);
}
