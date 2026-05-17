import { WidgetShell } from '@/components/ui/widget-shell';
import { fmt, HUE } from '@/lib/format';

type AudienceCard = {
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

type AudienceMixData = {
  datasetId: string;
  cards: AudienceCard[];
};

export function AudienceMixWidget({ data }: { data: AudienceMixData }) {
  const totalImpr = data.cards.reduce((sum, card) => sum + card.impressions, 0);
  const purple = HUE.purple;

  return (
    <WidgetShell
      eyebrow="Audience mix"
      title={`${data.cards.length} segment${data.cards.length === 1 ? '' : 's'}`}
      subtitle="Share of impressions, weighted CTR, and spend"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-rule-soft)]">
        {data.cards.map((card, i) => {
          const share = totalImpr > 0 ? card.impressions / totalImpr : 0;
          return (
            <div
              key={card.label}
              className={`relative px-5 py-4 ${i >= 2 ? 'sm:border-t border-[var(--color-rule-soft)]' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-[13.5px] font-medium text-[var(--color-ink)] truncate" title={card.label}>
                  {card.label}
                </div>
                <div className="font-mono text-[11px] tabular-nums" style={{ color: purple.ink }}>
                  {fmt.percent(share)}
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-[var(--color-ink-muted)]">
                <span>{fmt.compact(card.impressions)} impr</span>
                <span className="text-[var(--color-ink-faint)]">·</span>
                <span>{fmt.percent(card.ctr)} CTR</span>
                <span className="text-[var(--color-ink-faint)]">·</span>
                <span>{fmt.currency(card.spend)}</span>
                {card.conversions > 0 && (
                  <>
                    <span className="text-[var(--color-ink-faint)]">·</span>
                    <span>{fmt.number(card.conversions)} conv</span>
                  </>
                )}
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: purple.soft }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(3, share * 100)}%`, backgroundColor: purple.solid }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}
