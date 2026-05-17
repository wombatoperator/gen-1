'use client';

import { CartesianGrid, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { WidgetShell } from '@/components/ui/widget-shell';
import { CardActionPill } from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { fmt, HUE } from '@/lib/format';

type EfficiencyPoint = {
  name: string;
  adGroup: string | null;
  ctr: number;
  cpc: number;
  spend: number;
};

type EfficiencyMapData = {
  datasetId: string;
  points: EfficiencyPoint[];
  avgCtr: number;
  avgCpc: number;
};

export function EfficiencyMapWidget({ data }: { data: EfficiencyMapData }) {
  // Semantic mapping: efficient = green (positive), high CPC = red (negative), neutral = system blue.
  const efficient = data.points.filter((p) => p.ctr >= data.avgCtr && p.cpc <= data.avgCpc);
  const expensive = data.points.filter((p) => p.cpc > data.avgCpc);
  const other = data.points.filter((p) => !efficient.includes(p) && !expensive.includes(p));

  const groups = [
    { points: other,     color: HUE.blue.solid,  key: 'other',     label: 'Average' },
    { points: efficient, color: HUE.green.solid, key: 'efficient', label: 'Efficient' },
    { points: expensive, color: HUE.red.solid,   key: 'expensive', label: 'High CPC' },
  ];

  const config: ChartConfig = {
    efficient: { label: 'Efficient', color: HUE.green.solid },
    expensive: { label: 'High CPC',  color: HUE.red.solid },
    other:     { label: 'Average',   color: HUE.blue.solid },
  };

  return (
    <WidgetShell
      eyebrow="Efficiency map"
      title="CTR versus CPC"
      subtitle={
        <span className="font-mono text-[11px]">
          avg CTR {fmt.percent(data.avgCtr)} · avg CPC {fmt.currency(data.avgCpc)} · {data.points.length} rows
        </span>
      }
      trailing={<CardActionPill>bubble = spend</CardActionPill>}
    >
      <div className="px-5 py-5">
        <ChartContainer config={config} className="h-[320px]">
          <ScatterChart margin={{ top: 4, right: 16, bottom: 12, left: 4 }}>
            <CartesianGrid strokeDasharray="3 4" />
            <XAxis
              type="number"
              dataKey="ctr"
              name="CTR"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmt.percent(v)}
            />
            <YAxis
              type="number"
              dataKey="cpc"
              name="CPC"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmt.currency(v)}
            />
            <ZAxis type="number" dataKey="spend" range={[40, 360]} />
            <ReferenceLine x={data.avgCtr} stroke="var(--color-rule-strong)" strokeDasharray="3 4" />
            <ReferenceLine y={data.avgCpc} stroke="var(--color-rule-strong)" strokeDasharray="3 4" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: 'var(--color-rule)' }}
              wrapperStyle={{ outline: 'none' }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0].payload as EfficiencyPoint;
                return (
                  <div className="rounded-lg border border-[var(--color-rule-strong)] bg-[var(--color-canvas-raised)] px-3 py-2 shadow-[var(--shadow-pop)] text-[11.5px] space-y-1 min-w-[160px]">
                    <div className="text-[var(--color-ink)] font-medium max-w-[220px] truncate">{point.name}</div>
                    {point.adGroup && (
                      <div className="text-[10.5px] text-[var(--color-ink-muted)]">{point.adGroup}</div>
                    )}
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 font-mono tabular-nums text-[var(--color-ink-soft)] pt-0.5 border-t border-[var(--color-rule-soft)]">
                      <span style={{ color: HUE.teal.ink }}>{fmt.percent(point.ctr)} CTR</span>
                      <span style={{ color: HUE.red.ink }}>{fmt.currency(point.cpc)} CPC</span>
                      <span style={{ color: HUE.orange.ink }}>{fmt.currency(point.spend)}</span>
                    </div>
                  </div>
                );
              }}
            />
            {groups.map((group) => (
              <Scatter
                key={group.key}
                name={group.label}
                data={group.points}
                fill={group.color}
                fillOpacity={0.78}
                stroke={group.color}
                strokeWidth={0.5}
              />
            ))}
          </ScatterChart>
        </ChartContainer>
        <div className="mt-3 flex gap-4 pl-1">
          {groups.map((group) => (
            <div key={group.key} className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-muted)]">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: group.color, opacity: 0.85 }} />
              <span>{group.label}</span>
              <span className="text-[var(--color-ink-faint)] tabular-nums">{group.points.length}</span>
            </div>
          ))}
        </div>
      </div>
    </WidgetShell>
  );
}
