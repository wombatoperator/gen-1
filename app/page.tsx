'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { DatasetLoadedCard } from '@/components/widgets/DatasetLoadedCard';
import { KpiStripWidget } from '@/components/widgets/KpiStripWidget';
import { TimeSeriesWidget } from '@/components/widgets/TimeSeriesWidget';
import { BreakdownWidget } from '@/components/widgets/BreakdownWidget';
import { AudienceMixWidget } from '@/components/widgets/AudienceMixWidget';
import { EfficiencyMapWidget } from '@/components/widgets/EfficiencyMapWidget';
import { QueryResultView } from '@/components/QueryResult';
import { ChatProse } from '@/components/ChatProse';
import { DATASET_CATALOG } from '@/lib/dataset-catalog';
import { PLATFORM_LABELS } from '@/lib/format';
import type { ChatMessage } from '@/ai/tools';

const PLATFORM_GLYPH: Record<string, string> = {
  meta: 'M',
  google: 'G',
  dv360: 'DV',
  cm360: 'CM',
  ttd: 'TD',
  amazon: 'AZ',
};

function buildDatasetPrompt(dataset: (typeof DATASET_CATALOG)[number]): string {
  return `Analyze the "${dataset.label}" dataset (id: ${dataset.id}). Pick the most useful widgets — do not render all of them.`;
}

function ToolPending({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--color-rule)] bg-[var(--color-canvas-raised)] pl-1 pr-3.5 py-1 text-[11.5px] text-[var(--color-ink-muted)] shadow-[var(--shadow-card)]">
      <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-canvas-sunken)] overflow-hidden">
        <span className="absolute inset-0 shimmer rounded-full" />
        <span className="relative w-1.5 h-1.5 rounded-full bg-[var(--color-data-blue)]" />
      </span>
      <span className="font-mono uppercase tracking-[0.08em] text-[10px]">{label}</span>
    </div>
  );
}

function ToolFailed({ message }: { message: string }) {
  return (
    <div className="flex items-stretch rounded-lg overflow-hidden border border-[var(--color-rule)] bg-[var(--color-canvas-raised)] shadow-[var(--shadow-card)]">
      <div className="w-1 bg-[var(--color-data-red)]" />
      <div className="px-4 py-3 flex flex-col gap-0.5">
        <div className="eyebrow text-[#a31b14] text-[9.5px]">Tool error</div>
        <div className="text-[13px] text-[var(--color-ink)] leading-snug">{message}</div>
      </div>
    </div>
  );
}

function MessagePart({ part }: { part: ChatMessage['parts'][number] }) {
  if (part.type === 'text') return part.text.trim() ? <ChatProse text={part.text} /> : null;
  if (part.type === 'tool-listDatasets') return null;

  if (part.type === 'tool-loadDataset') {
    if (part.state === 'input-streaming' || part.state === 'input-available') return <ToolPending label="loading dataset" />;
    if (part.state === 'output-error') return <ToolFailed message={part.errorText} />;
    if (part.state === 'output-available') {
      if ('toolError' in part.output) return <ToolFailed message={(part.output as { toolError: string }).toolError} />;
      return <DatasetLoadedCard data={part.output} />;
    }
    return null;
  }
  if (part.type === 'tool-showKpiStrip') {
    if (part.state === 'input-streaming' || part.state === 'input-available') return <ToolPending label="computing kpis" />;
    if (part.state === 'output-error') return <ToolFailed message={part.errorText} />;
    if (part.state === 'output-available') {
      if ('toolError' in part.output) return <ToolFailed message={(part.output as { toolError: string }).toolError} />;
      return <KpiStripWidget data={part.output} />;
    }
    return null;
  }
  if (part.type === 'tool-showTimeSeries') {
    if (part.state === 'input-streaming' || part.state === 'input-available') return <ToolPending label="building trend" />;
    if (part.state === 'output-error') return <ToolFailed message={part.errorText} />;
    if (part.state === 'output-available') {
      if ('toolError' in part.output) return <ToolFailed message={(part.output as { toolError: string }).toolError} />;
      return <TimeSeriesWidget data={part.output} />;
    }
    return null;
  }
  if (part.type === 'tool-showBreakdown') {
    if (part.state === 'input-streaming' || part.state === 'input-available') return <ToolPending label="aggregating buckets" />;
    if (part.state === 'output-error') return <ToolFailed message={part.errorText} />;
    if (part.state === 'output-available') {
      if ('toolError' in part.output) return <ToolFailed message={(part.output as { toolError: string }).toolError} />;
      return <BreakdownWidget data={part.output} />;
    }
    return null;
  }
  if (part.type === 'tool-showAudienceMix') {
    if (part.state === 'input-streaming' || part.state === 'input-available') return <ToolPending label="building audience mix" />;
    if (part.state === 'output-error') return <ToolFailed message={part.errorText} />;
    if (part.state === 'output-available') {
      if ('toolError' in part.output) return <ToolFailed message={(part.output as { toolError: string }).toolError} />;
      return <AudienceMixWidget data={part.output} />;
    }
    return null;
  }
  if (part.type === 'tool-showEfficiencyMap') {
    if (part.state === 'input-streaming' || part.state === 'input-available') return <ToolPending label="plotting efficiency" />;
    if (part.state === 'output-error') return <ToolFailed message={part.errorText} />;
    if (part.state === 'output-available') {
      if ('toolError' in part.output) return <ToolFailed message={(part.output as { toolError: string }).toolError} />;
      return <EfficiencyMapWidget data={part.output} />;
    }
    return null;
  }
  if (part.type === 'tool-queryDataset') {
    if (part.state === 'input-streaming' || part.state === 'input-available') return <ToolPending label="querying dataset" />;
    if (part.state === 'output-error') return <ToolFailed message={part.errorText} />;
    if (part.state === 'output-available') {
      if ('toolError' in part.output) return <ToolFailed message={(part.output as { toolError: string }).toolError} />;
      return <QueryResultView result={part.output} />;
    }
    return null;
  }
  return null;
}

function DatasetCard({
  dataset,
  index,
  onSelect,
  disabled,
}: {
  dataset: (typeof DATASET_CATALOG)[number];
  index: number;
  onSelect: () => void;
  disabled: boolean;
}) {
  const platformLabel = PLATFORM_LABELS[dataset.platform] ?? dataset.platform;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      style={{ animationDelay: `${index * 40}ms` }}
      className="group relative text-left rounded-xl border border-[var(--color-rule)] bg-[var(--color-canvas-raised)] px-5 py-4 transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--color-rule-strong)] hover:shadow-[var(--shadow-card-hover)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 animate-[fadeUp_400ms_ease-out_both]"
    >
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center shrink-0 w-9 h-9 rounded-md bg-[var(--color-accent)] text-[var(--color-canvas-raised)] font-mono text-[11px] tracking-tight">
          {PLATFORM_GLYPH[dataset.platform] ?? dataset.platform.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-medium text-[var(--color-ink)] truncate">{dataset.label}</div>
          <div className="mt-0.5 text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-ink-faint)]">
            {platformLabel}
          </div>
          <p className="mt-2 text-[12px] text-[var(--color-ink-muted)] leading-relaxed">{dataset.description}</p>
        </div>
      </div>
      <div className="absolute top-4 right-4 text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-0.5 transition-all duration-200">
        Run →
      </div>
    </button>
  );
}

function DatasetShelf({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto scroll-quiet pb-1 -mx-1 px-1">
      {DATASET_CATALOG.map((dataset) => (
        <button
          key={dataset.id}
          type="button"
          onClick={() => onSelect(buildDatasetPrompt(dataset))}
          disabled={disabled}
          className="group inline-flex items-center gap-2 shrink-0 rounded-full border border-[var(--color-rule)] bg-[var(--color-canvas-raised)] pl-1 pr-3 py-1 transition-colors hover:border-[var(--color-rule-strong)] hover:bg-[var(--color-canvas-sunken)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-accent)] text-[var(--color-canvas-raised)] font-mono text-[9px] tracking-tight">
            {PLATFORM_GLYPH[dataset.platform] ?? dataset.platform.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-[12px] font-medium text-[var(--color-ink)]">
            {dataset.label.split('—')[1]?.trim() ?? dataset.label}
          </span>
        </button>
      ))}
    </div>
  );
}

const SUGGESTED_PROMPTS = [
  'How did Black Friday week compare to the rest of the month?',
  'Which audience converts cheapest?',
  'Show CTR over time split by channel.',
  'Where am I burning budget at high CPC?',
];

export default function Page() {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, status, sendMessage, setMessages } = useChat<ChatMessage>({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const isActive = status === 'submitted' || status === 'streaming';
  const isEmpty = messages.length === 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, status]);

  const send = (text: string) => {
    if (!text.trim() || isActive) return;
    sendMessage({ text });
    setInput('');
    inputRef.current?.focus();
  };

  const resetToHome = () => {
    if (isActive) return;
    setMessages([]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen">
      <Header isEmpty={isEmpty} onHome={resetToHome} disabled={isActive} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-quiet">
        {isEmpty ? (
          <EmptyState onSelect={send} disabled={isActive} />
        ) : (
          <ConversationView messages={messages} isActive={isActive} />
        )}
      </div>

      <Composer
        isEmpty={isEmpty}
        value={input}
        onChange={setInput}
        onSubmit={() => send(input)}
        onPickDataset={send}
        disabled={isActive}
        inputRef={inputRef}
      />
    </div>
  );
}

function Header({ isEmpty, onHome, disabled }: { isEmpty: boolean; onHome: () => void; disabled: boolean }) {
  return (
    <header className="px-8 py-5 border-b border-[var(--color-rule)] bg-[var(--color-canvas-raised)]/85 backdrop-blur-md shrink-0">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
        <button
          type="button"
          onClick={onHome}
          disabled={isEmpty || disabled}
          className="group flex items-baseline gap-2.5 disabled:cursor-default"
          aria-label={isEmpty ? 'gen-1 home' : 'Return to home'}
        >
          <span className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-muted)] transition-colors group-enabled:group-hover:text-[var(--color-ink)]">
            gen-1
          </span>
          <span className="font-display italic text-[22px] leading-none text-[var(--color-ink)] transition-transform group-enabled:group-hover:-translate-x-0.5">
            workbench
          </span>
          {!isEmpty && (
            <span className="ml-1 text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)] group-enabled:group-hover:text-[var(--color-ink-soft)] transition-colors">
              ← new analysis
            </span>
          )}
        </button>
        <div className="hidden md:flex items-center gap-3 text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
          <a
            href="https://github.com/wombatoperator/gen-1"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-[var(--color-ink)] transition-colors"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-data-green)]" />
            open source
          </a>
          <span className="text-[var(--color-rule-strong)]">·</span>
          <span>AI SDK v6</span>
        </div>
      </div>
    </header>
  );
}

function ConversationView({ messages, isActive }: { messages: ChatMessage[]; isActive: boolean }) {
  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10 space-y-10">
      {messages.map((message) => (
        <div key={message.id} className="flex gap-4">
          <div className="shrink-0 w-7 mt-0.5">
            {message.role === 'user' ? (
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-accent)] text-[var(--color-canvas-raised)] font-mono text-[10px] uppercase tracking-tight">
                You
              </span>
            ) : (
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-canvas-sunken)] border border-[var(--color-rule)] font-display italic text-[14px] text-[var(--color-ink)]">
                g
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="eyebrow text-[9.5px]">{message.role === 'user' ? 'You' : 'gen-1'}</div>
            {message.parts.map((part, i) => (
              <MessagePart key={i} part={part} />
            ))}
          </div>
        </div>
      ))}

      {isActive && messages[messages.length - 1]?.role === 'user' && (
        <div className="flex gap-4">
          <div className="shrink-0 w-7">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-canvas-sunken)] border border-[var(--color-rule)] font-display italic text-[14px] text-[var(--color-ink)]">
              g
            </span>
          </div>
          <div className="flex-1">
            <ToolPending label="thinking" />
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onSelect, disabled }: { onSelect: (prompt: string) => void; disabled: boolean }) {
  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-10 pt-16 pb-12">
      <div className="max-w-3xl animate-[fadeUp_500ms_ease-out_both]">
        <div className="eyebrow text-[10px]">generative ui for advertising data</div>
        <h1 className="mt-4 text-[clamp(34px,5vw,52px)] leading-[1.04] tracking-[-0.02em] text-[var(--color-ink)]">
          Talk to your ad data.{' '}
          <span className="font-display italic text-[var(--color-ink-soft)]">
            Render typed components
          </span>{' '}
          instead of text walls.
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-[var(--color-ink-muted)] max-w-[58ch]">
          Pick a sample export below. The agent normalizes the CSV into a canonical schema,
          then composes a report by calling React components as tools — only the ones that
          actually answer your question.
        </p>
      </div>

      <div className="mt-12">
        <div className="flex items-baseline justify-between mb-4">
          <div className="eyebrow text-[10px]">sample datasets</div>
          <div className="text-[11px] text-[var(--color-ink-faint)] tabular-nums">
            {DATASET_CATALOG.length} fixtures
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {DATASET_CATALOG.map((dataset, i) => (
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              index={i}
              disabled={disabled}
              onSelect={() => onSelect(buildDatasetPrompt(dataset))}
            />
          ))}
        </div>
      </div>

      <footer className="mt-16 pt-6 border-t border-[var(--color-rule-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-6 text-[11px] text-[var(--color-ink-muted)]">
          <div className="flex items-center gap-2">
            <span className="font-mono uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">v0</span>
            <span className="text-[var(--color-rule-strong)]">·</span>
            <span>MIT licensed</span>
            <span className="text-[var(--color-rule-strong)]">·</span>
            <a
              href="https://github.com/wombatoperator/gen-1"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-[var(--color-rule-strong)] underline-offset-2 hover:decoration-[var(--color-ink)] hover:text-[var(--color-ink)] transition-colors"
            >
              github.com/wombatoperator/gen-1
            </a>
          </div>
          <div className="text-[10.5px] font-mono tracking-[0.06em] text-[var(--color-ink-faint)]">
            one tool · one component · color is the data
          </div>
        </div>
      </footer>
    </div>
  );
}

function Composer({
  isEmpty,
  value,
  onChange,
  onSubmit,
  onPickDataset,
  disabled,
  inputRef,
}: {
  isEmpty: boolean;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onPickDataset: (prompt: string) => void;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="shrink-0 border-t border-[var(--color-rule)] bg-[var(--color-canvas-raised)]/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-3 space-y-2.5">
        {/* Dataset shelf + suggested prompts only show during an active conversation —
            on the empty state, the main grid above already does this job. */}
        {!isEmpty && (
          <>
            <DatasetShelf onSelect={onPickDataset} disabled={disabled} />
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onPickDataset(prompt)}
                  disabled={disabled}
                  className="text-[11.5px] text-[var(--color-ink-muted)] px-2.5 py-1 rounded-md border border-[var(--color-rule-soft)] hover:border-[var(--color-rule-strong)] hover:bg-[var(--color-canvas-sunken)] transition-colors disabled:opacity-40"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex gap-2"
        >
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={
                isEmpty
                  ? 'Or paste a public CSV URL to load it directly…'
                  : 'Ask a follow-up — slice by audience, compare windows, anything…'
              }
              disabled={disabled}
              className="w-full pl-4 pr-4 py-2.5 text-[13.5px] rounded-full bg-[var(--color-canvas-sunken)] border border-[var(--color-rule)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:border-[var(--color-data-blue)] focus:ring-2 focus:ring-[var(--color-data-blue)]/15 disabled:opacity-50 transition-shadow"
            />
          </div>
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-medium bg-[var(--color-accent)] text-[var(--color-canvas-raised)] hover:bg-[var(--color-accent-soft)] disabled:bg-[var(--color-rule-strong)] disabled:text-[var(--color-canvas-raised)] disabled:cursor-not-allowed transition-colors"
          >
            Send
            <span className="font-mono text-[10px] opacity-70">⏎</span>
          </button>
        </form>
      </div>
    </div>
  );
}
