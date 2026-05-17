import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'group/card relative isolate overflow-hidden rounded-xl',
        'bg-[var(--color-canvas-raised)]',
        'border border-[var(--color-rule)]',
        'shadow-[var(--shadow-card)]',
        'transition-[box-shadow,transform] duration-300 ease-out',
        'hover:shadow-[var(--shadow-card-hover)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 px-5 pt-4 pb-3 border-b border-[var(--color-rule-soft)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardEyebrow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('eyebrow', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-[15px] font-medium tracking-tight text-[var(--color-ink)]', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-[12.5px] text-[var(--color-ink-muted)] leading-relaxed', className)} {...props} />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'px-5 py-3 border-t border-[var(--color-rule-soft)] bg-[var(--color-canvas-sunken)]/40 text-[12px] text-[var(--color-ink-muted)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardActionPill({
  tone = 'neutral',
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'positive' | 'warning' | 'info' | 'negative' }) {
  const palette =
    tone === 'positive'
      ? 'border-[color:var(--color-data-green)] bg-[color:var(--color-data-green-soft)] text-[#1f8a3a]'
      : tone === 'warning'
        ? 'border-[color:var(--color-data-orange)] bg-[color:var(--color-data-orange-soft)] text-[#b35f00]'
        : tone === 'info'
          ? 'border-[color:var(--color-data-blue)] bg-[color:var(--color-data-blue-soft)] text-[#0050a8]'
          : tone === 'negative'
            ? 'border-[color:var(--color-data-red)] bg-[color:var(--color-data-red-soft)] text-[#a31b14]'
            : 'border-[var(--color-rule)] bg-[var(--color-canvas-sunken)] text-[var(--color-ink-soft)]';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium tracking-[0.04em]',
        palette,
        className,
      )}
      style={style}
      {...props}
    />
  );
}
