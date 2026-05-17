'use client';

import * as React from 'react';
import { ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/lib/utils';

export type ChartSeriesConfig = {
  label: string;
  color: string;
};

export type ChartConfig = Record<string, ChartSeriesConfig>;

const ChartContext = React.createContext<ChartConfig | null>(null);

export function useChartConfig() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error('useChartConfig must be called inside <ChartContainer>');
  return ctx;
}

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactElement;
}) {
  return (
    <ChartContext.Provider value={config}>
      <div
        className={cn(
          'w-full text-[11px]',
          '[&_.recharts-cartesian-grid_line]:stroke-[var(--color-rule)]',
          '[&_.recharts-cartesian-grid_line]:opacity-70',
          '[&_.recharts-cartesian-axis-line]:stroke-transparent',
          '[&_.recharts-cartesian-axis-tick-line]:stroke-transparent',
          '[&_.recharts-cartesian-axis-tick-value]:fill-[var(--color-ink-muted)]',
          '[&_.recharts-cartesian-axis-tick-value]:text-[10.5px]',
          '[&_.recharts-reference-line_line]:stroke-[var(--color-rule-strong)]',
          '[&_.recharts-default-legend]:!text-[var(--color-ink-soft)]',
          className,
        )}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

type TooltipFormatter = (value: number, name: string) => string;

export function ChartTooltip({
  formatter,
  labelFormatter,
}: {
  formatter?: TooltipFormatter;
  labelFormatter?: (label: string) => string;
}) {
  const config = useChartConfig();
  return (
    <RechartsTooltip
      cursor={{ fill: 'rgb(26 29 46 / 0.04)' }}
      wrapperStyle={{ outline: 'none' }}
      content={({ active, payload, label }) => {
        if (!active || !payload || payload.length === 0) return null;
        return (
          <div
            className="rounded-lg border border-[var(--color-rule-strong)] bg-[var(--color-canvas-raised)] px-3 py-2 shadow-[var(--shadow-pop)] text-[11.5px] space-y-1.5 min-w-[140px]"
          >
            {label !== undefined && (
              <div className="eyebrow text-[9px]">
                {labelFormatter ? labelFormatter(String(label)) : String(label)}
              </div>
            )}
            {payload.map((entry, idx) => {
              const key = String(entry.dataKey ?? entry.name ?? idx);
              const seriesConfig = config[key];
              const color = seriesConfig?.color ?? (entry.color as string) ?? 'var(--color-accent)';
              const seriesLabel = seriesConfig?.label ?? entry.name ?? key;
              const value = Number(entry.value ?? 0);
              return (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[var(--color-ink-muted)]">{seriesLabel}</span>
                  <span className="ml-auto tabular-nums text-[var(--color-ink)] font-medium">
                    {formatter ? formatter(value, key) : value.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        );
      }}
    />
  );
}

// Apple-system data palette — high distinguishability at chart scale.
// Prefer `metricColor()` / `SERIES_PALETTE` from lib/format.ts so the same hue
// follows a metric across every widget. This array exists for legacy callers.
export const CHART_COLORS = [
  '#007aff', // blue
  '#ff9500', // orange
  '#34c759', // green
  '#af52de', // purple
  '#30b0c7', // teal
  '#ff3b30', // red
  '#5856d6', // indigo
  '#ff2d92', // pink
];
