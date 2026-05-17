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
import { PlainProse } from '@/components/PlainProse';
import { DATASET_CATALOG } from '@/lib/dataset-catalog';
import { PLATFORM_LABELS } from '@/lib/format';
import type { ChatMessage } from '@/ai/tools';

type ChatHandle = ReturnType<typeof useChat<ChatMessage>>;

const PLATFORM_GLYPH: Record<string, string> = {
  meta: 'M',
  google: 'G',
  dv360: 'DV',
  cm360: 'CM',
  ttd: 'TD',
  amazon: 'AZ',
};

function buildDatasetPrompt(dataset: (typeof DATASET_CATALOG)[number]): string {
  return `Analyze the "${dataset.label}" dataset (${dataset.id}).`;
}

// Match the elegant short form emitted by buildDatasetPrompt and resolve back
// to the catalog entry. If the id doesn't exist (user typed something weird),
// return null and we fall back to the normal text bubble.
const DATASET_PICK_RE = /^Analyze the "([^"]+)" dataset \(([a-z0-9_]+)\)\.?\s*$/;
function parseDatasetPick(text: string): (typeof DATASET_CATALOG)[number] | null {
  const match = text.match(DATASET_PICK_RE);
  if (!match) return null;
  return DATASET_CATALOG.find((dataset) => dataset.id === match[2]) ?? null;
}

function asDatasetPick(message: ChatMessage): (typeof DATASET_CATALOG)[number] | null {
  if (message.role !== 'user') return null;
  if (message.parts.length !== 1) return null;
  const part = message.parts[0];
  if (part.type !== 'text') return null;
  return parseDatasetPick(part.text);
}

function DatasetPickChip({ dataset }: { dataset: (typeof DATASET_CATALOG)[number] }) {
  const platformLabel = PLATFORM_LABELS[dataset.platform] ?? dataset.platform;
  return (
    <div className="relative inline-flex items-center gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-canvas-raised)] pl-2 pr-4 py-2 shadow-[var(--shadow-card)] overflow-hidden animate-[chipIn_420ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[var(--color-canvas-sunken)] to-transparent animate-[chipSweep_900ms_180ms_cubic-bezier(0.2,0.7,0.2,1)_both]" />
      <span className="relative flex items-center justify-center w-8 h-8 rounded-md bg-[var(--color-accent)] text-[var(--color-canvas-raised)] font-mono text-[10.5px] tracking-tight animate-[glyphKick_500ms_120ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
        {PLATFORM_GLYPH[dataset.platform] ?? dataset.platform.slice(0, 2).toUpperCase()}
      </span>
      <div className="relative flex flex-col gap-0.5 min-w-0">
        <span className="eyebrow text-[9px] leading-none">analyze</span>
        <span className="text-[13.5px] font-medium text-[var(--color-ink)] leading-tight truncate">
          {dataset.label}
        </span>
      </div>
      <span className="relative ml-1 text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)] tabular-nums">
        {platformLabel}
      </span>
    </div>
  );
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

function PlainMessagePart({ part }: { part: ChatMessage['parts'][number] }) {
  if (part.type === 'text') return part.text.trim() ? <PlainProse text={part.text} /> : null;
  if (part.type === 'tool-listDatasets') return null;
  if (part.type === 'tool-loadDataset') {
    if (part.state === 'input-streaming' || part.state === 'input-available') return <ToolPending label="loading dataset" />;
    if (part.state === 'output-error') return <ToolFailed message={part.errorText} />;
    return null;
  }
  if (part.type === 'tool-queryDataset') {
    if (part.state === 'input-streaming' || part.state === 'input-available') return <ToolPending label="querying dataset" />;
    if (part.state === 'output-error') return <ToolFailed message={part.errorText} />;
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
      style={{ animationDelay: `${980 + index * 60}ms` }}
      className="group relative text-left rounded-xl border border-[var(--color-rule)] bg-[var(--color-canvas-raised)] px-5 py-4 transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--color-rule-strong)] hover:shadow-[var(--shadow-card-hover)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 animate-[fadeUp_500ms_cubic-bezier(0.2,0.7,0.2,1)_both]"
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

function useAutoScroll(
  ref: React.RefObject<HTMLDivElement | null>,
  messages: ChatMessage[],
  status: string,
  enabled: boolean,
) {
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    if (messages.length === 0) {
      prevCountRef.current = 0;
      return;
    }
    const newMessageArrived = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;
    if (newMessageArrived) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      return;
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [ref, messages, status, enabled]);
}

export default function Page() {
  const [input, setInput] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textScrollRef = useRef<HTMLDivElement>(null);
  const uiScrollRef = useRef<HTMLDivElement>(null);

  const uiChat = useChat<ChatMessage>({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const textChat = useChat<ChatMessage>({
    transport: new DefaultChatTransport({ api: '/api/chat', body: { mode: 'text' } }),
  });

  const uiActive = uiChat.status === 'submitted' || uiChat.status === 'streaming';
  const textActive = textChat.status === 'submitted' || textChat.status === 'streaming';
  const isActive = demoMode ? uiActive || textActive : uiActive;
  const isEmpty = demoMode
    ? uiChat.messages.length === 0 && textChat.messages.length === 0
    : uiChat.messages.length === 0;

  useAutoScroll(scrollRef, uiChat.messages, uiChat.status, !demoMode);
  useAutoScroll(uiScrollRef, uiChat.messages, uiChat.status, demoMode);
  useAutoScroll(textScrollRef, textChat.messages, textChat.status, demoMode);

  const send = (text: string) => {
    if (!text.trim() || isActive) return;
    if (demoMode) {
      textChat.sendMessage({ text });
      uiChat.sendMessage({ text });
    } else {
      uiChat.sendMessage({ text });
    }
    setInput('');
    inputRef.current?.focus();
  };

  const resetToHome = () => {
    if (isActive) return;
    uiChat.setMessages([]);
    textChat.setMessages([]);
    setInput('');
  };

  const toggleDemoMode = () => {
    if (isActive) return;
    uiChat.setMessages([]);
    textChat.setMessages([]);
    setInput('');
    setDemoMode((prev) => !prev);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header
        isEmpty={isEmpty}
        onHome={resetToHome}
        disabled={isActive}
        demoMode={demoMode}
        onToggleDemo={toggleDemoMode}
      />

      {demoMode && !isEmpty ? (
        <SplitConversation
          textChat={textChat}
          uiChat={uiChat}
          textScrollRef={textScrollRef}
          uiScrollRef={uiScrollRef}
        />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-quiet">
          {isEmpty ? (
            <EmptyState onSelect={send} disabled={isActive} demoMode={demoMode} />
          ) : (
            <ConversationView messages={uiChat.messages} isActive={uiActive} />
          )}
        </div>
      )}

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

function SplitConversation({
  textChat,
  uiChat,
  textScrollRef,
  uiScrollRef,
}: {
  textChat: ChatHandle;
  uiChat: ChatHandle;
  textScrollRef: React.RefObject<HTMLDivElement | null>;
  uiScrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const textActive = textChat.status === 'submitted' || textChat.status === 'streaming';
  const uiActive = uiChat.status === 'submitted' || uiChat.status === 'streaming';

  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
      <PaneColumn
        eyebrow="without gen-1"
        title="Plain text chatbot"
        note="Same model · data tools only · no UI components"
        dotColor="var(--color-data-red)"
        bordered
        scrollRef={textScrollRef}
        tint="bg-[var(--color-canvas-sunken)]/50"
      >
        <PlainConversation messages={textChat.messages} isActive={textActive} />
      </PaneColumn>
      <PaneColumn
        eyebrow="with gen-1"
        title="Generative UI"
        note="Same model · renders typed React components as tools"
        dotColor="var(--color-data-green)"
        scrollRef={uiScrollRef}
        tint=""
      >
        <ConversationView messages={uiChat.messages} isActive={uiActive} />
      </PaneColumn>
    </div>
  );
}

function PaneColumn({
  eyebrow,
  title,
  note,
  dotColor,
  bordered,
  scrollRef,
  tint,
  children,
}: {
  eyebrow: string;
  title: string;
  note: string;
  dotColor: string;
  bordered?: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col min-h-0 ${bordered ? 'lg:border-r border-b lg:border-b-0 border-[var(--color-rule)]' : ''}`}
    >
      <div className="shrink-0 px-6 sm:px-8 py-3 border-b border-[var(--color-rule)] bg-[var(--color-canvas-raised)]/85 backdrop-blur-md">
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: dotColor }}
            />
            <span className="eyebrow text-[9.5px]">{eyebrow}</span>
            <span className="text-[13px] font-medium text-[var(--color-ink)] truncate">{title}</span>
          </div>
          <span className="hidden md:inline text-[10.5px] text-[var(--color-ink-faint)] truncate">{note}</span>
        </div>
      </div>
      <div ref={scrollRef} className={`flex-1 overflow-y-auto scroll-quiet ${tint}`}>
        {children}
      </div>
    </div>
  );
}

function PlainConversation({ messages, isActive }: { messages: ChatMessage[]; isActive: boolean }) {
  return (
    <div className="max-w-3xl mx-auto px-6 sm:px-8 py-8 space-y-8">
      {messages.map((message) => {
        const pick = asDatasetPick(message);
        if (pick) {
          return (
            <div key={message.id} className="flex">
              <DatasetPickChip dataset={pick} />
            </div>
          );
        }
        return (
          <div key={message.id} className="flex gap-3">
            <div className="shrink-0 w-6 mt-0.5">
              {message.role === 'user' ? (
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-accent)] text-[var(--color-canvas-raised)] font-mono text-[9px] uppercase tracking-tight">
                  You
                </span>
              ) : (
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-canvas-raised)] border border-[var(--color-rule)] font-mono text-[10px] text-[var(--color-ink-muted)]">
                  AI
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="eyebrow text-[9px]">{message.role === 'user' ? 'You' : 'Assistant'}</div>
              {message.parts.map((part, i) => (
                <PlainMessagePart key={i} part={part} />
              ))}
            </div>
          </div>
        );
      })}
      {isActive && messages[messages.length - 1]?.role === 'user' && (
        <div className="flex gap-3">
          <div className="shrink-0 w-6">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-canvas-raised)] border border-[var(--color-rule)] font-mono text-[10px] text-[var(--color-ink-muted)]">
              AI
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

function Header({
  isEmpty,
  onHome,
  disabled,
  demoMode,
  onToggleDemo,
}: {
  isEmpty: boolean;
  onHome: () => void;
  disabled: boolean;
  demoMode: boolean;
  onToggleDemo: () => void;
}) {
  return (
    <header className="px-8 py-5 border-b border-[var(--color-rule)] bg-[var(--color-canvas-raised)]/85 backdrop-blur-md shrink-0 animate-[slideDown_600ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
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
        <div className="flex items-center gap-3">
          <DemoModeToggle active={demoMode} disabled={disabled} onToggle={onToggleDemo} />
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
      </div>
    </header>
  );
}

function DemoModeToggle({
  active,
  disabled,
  onToggle,
}: {
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      title={active ? 'Exit side-by-side demo mode' : 'Compare plain text vs generative UI side-by-side'}
      className={`group inline-flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1 text-[11px] tracking-[0.04em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-[var(--color-accent)] text-[var(--color-canvas-raised)] hover:bg-[var(--color-accent-soft)]'
          : 'border border-[var(--color-rule)] bg-[var(--color-canvas-raised)] text-[var(--color-ink)] hover:border-[var(--color-rule-strong)] hover:bg-[var(--color-canvas-sunken)]'
      }`}
    >
      <span
        className={`relative inline-flex items-center w-7 h-4 rounded-full transition-colors ${
          active ? 'bg-[var(--color-data-green)]' : 'bg-[var(--color-rule-strong)]'
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-[var(--color-canvas-raised)] shadow-sm transition-transform ${
            active ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="font-medium">Demo mode</span>
    </button>
  );
}

function ConversationView({ messages, isActive }: { messages: ChatMessage[]; isActive: boolean }) {
  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10 space-y-10">
      {messages.map((message) => {
        const pick = asDatasetPick(message);
        if (pick) {
          return (
            <div key={message.id} className="flex">
              <DatasetPickChip dataset={pick} />
            </div>
          );
        }
        return (
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
        );
      })}

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

function EmptyState({
  onSelect,
  disabled,
  demoMode,
}: {
  onSelect: (prompt: string) => void;
  disabled: boolean;
  demoMode: boolean;
}) {
  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-10 pt-16 pb-12">
      <div className="max-w-3xl">
        <div className="eyebrow text-[10px] animate-[reveal_700ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
          {demoMode ? 'side-by-side demo · plain text vs generative ui' : 'generative ui for advertising data'}
        </div>
        {demoMode ? (
          <h1 className="mt-4 text-[clamp(34px,5vw,52px)] leading-[1.04] tracking-[-0.02em] text-[var(--color-ink)]">
            <span className="inline-block animate-[fadeUp_700ms_120ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
              Same model, same data.{' '}
            </span>
            <span className="font-display italic text-[var(--color-ink-soft)] inline-block animate-[settleIn_900ms_320ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
              Two responses
            </span>
            <span className="inline-block animate-[fadeUp_700ms_540ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
              {' '}side by side.
            </span>
          </h1>
        ) : (
          <h1 className="mt-4 text-[clamp(34px,5vw,52px)] leading-[1.04] tracking-[-0.02em] text-[var(--color-ink)]">
            <span className="inline-block animate-[fadeUp_700ms_120ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
              Talk to your ad data.{' '}
            </span>
            <span className="font-display italic text-[var(--color-ink-soft)] inline-block animate-[settleIn_900ms_320ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
              Render typed components
            </span>
            <span className="inline-block animate-[fadeUp_700ms_540ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
              {' '}instead of text walls.
            </span>
          </h1>
        )}
        <p className="mt-5 text-[15px] leading-relaxed text-[var(--color-ink-muted)] max-w-[58ch] animate-[fadeUp_700ms_680ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
          {demoMode
            ? 'Pick a sample below. The same query fires to both panes — on the left, a plain Claude response with markdown tables and prose; on the right, the gen-1 agent rendering typed React components.'
            : 'Pick a sample export below. The agent normalizes the CSV into a canonical schema, then composes a report by calling React components as tools — only the ones that actually answer your question.'}
        </p>
      </div>

      <div className="mt-12 animate-[fadeUp_700ms_820ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
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

      <footer className="mt-16 pt-6 border-t border-[var(--color-rule-soft)] animate-[fadeUp_700ms_1100ms_cubic-bezier(0.2,0.7,0.2,1)_both]">
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
