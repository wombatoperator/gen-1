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
    <Card className={cn('grain', className)}>
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
