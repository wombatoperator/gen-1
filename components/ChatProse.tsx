'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ChatProse({ text }: { text: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Strip headings — the agent should not write them; if it does, demote
          h1: ({ children }) => <p className="font-medium text-[var(--color-ink)]">{children}</p>,
          h2: ({ children }) => <p className="font-medium text-[var(--color-ink)]">{children}</p>,
          h3: ({ children }) => <p className="font-medium text-[var(--color-ink)]">{children}</p>,
          h4: ({ children }) => <p className="font-medium text-[var(--color-ink)]">{children}</p>,
          // Strip tables — widgets render them. Show a single line note instead.
          table: () => (
            <p className="text-[12px] italic text-[var(--color-ink-muted)]">
              (Table omitted — see the rendered widget above.)
            </p>
          ),
          hr: () => <hr className="my-3 border-[var(--color-rule-soft)]" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
