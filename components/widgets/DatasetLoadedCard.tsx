import { WidgetShell } from '@/components/ui/widget-shell';
import { CardActionPill } from '@/components/ui/card';
import { PLATFORM_LABELS } from '@/lib/format';

type DatasetLoadedData = {
  datasetId: string;
  platform: string;
  label: string;
  source: string;
  grain: string;
  rowCount: number;
  totalSourceRows: number;
  truncated: boolean;
  confidence: number;
  mappingSource: 'cache' | 'registry' | 'llm';
  unmappedFields: string[];
  errorCount: number;
  columnsPresent: string[];
  dateRange?: { start: string; end: string; days: number };
  isTimeSeries: boolean;
  categoricalDimensions: string[];
};

const MAPPING_LABEL: Record<DatasetLoadedData['mappingSource'], { label: string; tone: 'neutral' | 'positive' | 'warning' | 'info' }> = {
  cache: { label: 'Cache hit', tone: 'neutral' },
  registry: { label: 'Deterministic registry', tone: 'positive' },
  llm: { label: 'LLM-assisted', tone: 'info' },
};

export function DatasetLoadedCard({ data }: { data: DatasetLoadedData }) {
  const platformLabel = PLATFORM_LABELS[data.platform] ?? data.platform;
  const mapping = MAPPING_LABEL[data.mappingSource];

  return (
    <WidgetShell
      eyebrow="Dataset loaded"
      title={
        <span>
          {platformLabel}
          <span className="text-[var(--color-ink-faint)] font-normal"> · </span>
          <span className="text-[var(--color-ink-soft)] font-normal">{data.grain.replace('_', ' ')} grain</span>
        </span>
      }
      subtitle={
        <span className="font-display italic text-[15px] text-[var(--color-ink-muted)]">{data.label}</span>
      }
      trailing={
        <>
          <CardActionPill tone={mapping.tone}>{mapping.label}</CardActionPill>
          <CardActionPill>{Math.round(data.confidence * 100)}% mapped</CardActionPill>
        </>
      }
    >
      <dl className="grid grid-cols-2 sm:grid-cols-4">
        <Field delay={0} label="Rows" value={data.rowCount.toLocaleString()} sub={`${data.columnsPresent.length} columns`} />
        <Field
          delay={60}
          label="Window"
          value={data.dateRange ? `${data.dateRange.days} days` : '—'}
          sub={data.dateRange ? `${data.dateRange.start} → ${data.dateRange.end}` : 'No date column'}
        />
        <Field delay={120} label="Mode" value={data.isTimeSeries ? 'Time series' : 'Snapshot'} sub={data.truncated ? 'Truncated' : 'Complete'} />
        <Field
          delay={180}
          label="Errors"
          value={data.errorCount.toLocaleString()}
          tone={data.errorCount === 0 ? 'positive' : 'warning'}
          sub={data.errorCount === 0 ? 'Validates against schema' : 'Some rows rejected'}
        />
      </dl>
      <div className="border-t border-[var(--color-rule-soft)] grid grid-cols-1 sm:grid-cols-2">
        <Field
          delay={240}
          label="Dataset id"
          value={<span className="font-mono text-[11.5px]">{data.datasetId}</span>}
          sub={<span className="font-mono text-[10.5px] truncate inline-block max-w-[260px]" title={data.source}>{data.source}</span>}
        />
        <Field
          delay={300}
          label="Dimensions"
          value={
            data.categoricalDimensions.length === 0 ? (
              <span className="text-[var(--color-ink-faint)]">none</span>
            ) : (
              <span className="flex flex-wrap gap-1.5">
                {data.categoricalDimensions.map((dim) => (
                  <span key={dim} className="rounded-md border border-[var(--color-rule)] bg-[var(--color-canvas-sunken)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--color-ink-soft)]">
                    {dim}
                  </span>
                ))}
              </span>
            )
          }
          sub={data.unmappedFields.length > 0 ? `Unmapped: ${data.unmappedFields.join(', ')}` : 'All required fields mapped'}
        />
      </div>
    </WidgetShell>
  );
}

function Field({
  label,
  value,
  sub,
  tone,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'positive' | 'warning';
  delay?: number;
}) {
  const valueColor =
    tone === 'positive'
      ? 'text-[#1f8a3a]'
      : tone === 'warning'
        ? 'text-[#b35f00]'
        : 'text-[var(--color-ink)]';
  return (
    <div
      className="px-5 py-3.5 border-r border-b border-[var(--color-rule-soft)] last:border-r-0 sm:last-of-type:border-r-0 animate-[fadeUp_500ms_cubic-bezier(0.2,0.7,0.2,1)_both]"
      style={{ animationDelay: `${250 + delay}ms` }}
    >
      <div className="eyebrow text-[9.5px]">{label}</div>
      <div className={`mt-1 text-[15px] font-medium leading-tight ${valueColor}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-[var(--color-ink-muted)] leading-snug">{sub}</div>}
    </div>
  );
}
