'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { WidgetShell } from '@/components/ui/widget-shell';
import { CardActionPill } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { formatMetric, metricColor, type MetricKey } from '@/lib/format';

type Bucket = {
  label: string;
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

type BreakdownData = {
  datasetId: string;
  dimension: string;
  metric: MetricKey;
  buckets: Bucket[];
  totalBuckets: number;
};

const DIMENSION_LABEL: Record<string, string> = {
  channel: 'Channel',
  adGroupName: 'Ad Group',
  placementName: 'Placement',
  creativeName: 'Creative',
  audienceName: 'Audience',
};

export function BreakdownWidget({ data }: { data: BreakdownData }) {
  const dimensionLabel = DIMENSION_LABEL[data.dimension] ?? data.dimension;
  // Audience dimension always gets purple regardless of metric — it's the dimensional identity.
  // For all other dimensions, the bar inherits the metric's color.
  const color = data.dimension === 'audienceName' ? metricColor('conversions') : metricColor(data.metric);
  const config: ChartConfig = { value: { label: data.metric.toUpperCase(), color: color.solid } };
  const chartRows = data.buckets.map((bucket) => ({
    label: bucket.label,
    value: (bucket as unknown as Record<string, number>)[data.metric] ?? 0,
  }));
  const showingAll = data.buckets.length >= data.totalBuckets;
  // Bias: use audience purple when ranking audiences specifically.
  const barColor = data.dimension === 'audienceName' ? '#af52de' : color.solid;

  return (
    <WidgetShell
      eyebrow={`Breakdown · ${dimensionLabel.toLowerCase()}`}
      title={
        <span>
          Top {data.buckets.length} by {data.metric.toUpperCase()}
        </span>
      }
      subtitle={
        showingAll
          ? `${data.totalBuckets} total ${dimensionLabel.toLowerCase()}${data.totalBuckets === 1 ? '' : 's'}`
          : `Showing ${data.buckets.length} of ${data.totalBuckets}`
      }
      trailing={
        <CardActionPill style={{ color: color.ink, borderColor: barColor, backgroundColor: color.soft }}>
          {data.metric.toUpperCase()}
        </CardActionPill>
      }
    >
      <div className="px-5 py-5">
        <ChartContainer config={config} className={chartRows.length > 6 ? 'h-[320px]' : 'h-[240px]'}>
          <BarChart data={chartRows} layout="vertical" margin={{ top: 2, right: 24, bottom: 0, left: 12 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 4" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatMetric(data.metric, v)}
            />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              axisLine={false}
              width={150}
              tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
            />
            <ChartTooltip formatter={(value) => formatMetric(data.metric, value)} />
            <Bar dataKey="value" fill={barColor} radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ChartContainer>
      </div>
    </WidgetShell>
  );
}
