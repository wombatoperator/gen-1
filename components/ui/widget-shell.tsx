import { cn } from '@/lib/utils';
import { Card, CardEyebrow } from './card';

export function WidgetShell({
  eyebrow,
  title,
  subtitle,
  trailing,
  children,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        'relative isolate',
        // Mount animation — a single resolved landing.
        'animate-[enterWidget_750ms_cubic-bezier(0.2,0.7,0.2,1)_both]',
        // Will-change hint to keep the GPU layer warm during the entrance.
        '[will-change:transform,opacity,filter]',
        className,
      )}
    >
      {/* Decorative edge gleam — a faint highlight sweeps across the top border once on entrance. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden"
      >
        <div
          className="h-full w-full bg-[linear-gradient(90deg,transparent_0%,transparent_30%,rgba(0,122,255,0.55)_50%,transparent_70%,transparent_100%)] bg-[length:200%_100%] animate-[edgeGleam_1400ms_cubic-bezier(0.2,0.7,0.2,1)_300ms_both]"
        />
      </div>
      <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <CardEyebrow>{eyebrow}</CardEyebrow>
          <div className="mt-1 text-[16px] font-medium tracking-tight text-[var(--color-ink)] leading-tight">
            {title}
          </div>
          {subtitle && (
            <div className="mt-1 text-[12.5px] text-[var(--color-ink-muted)] leading-relaxed">{subtitle}</div>
          )}
        </div>
        {trailing && <div className="flex items-center gap-2 shrink-0">{trailing}</div>}
      </div>
      <div className="border-t border-[var(--color-rule-soft)]">{children}</div>
    </Card>
  );
}
