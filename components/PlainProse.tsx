'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function PlainProse({ text }: { text: string }) {
  return (
    <div className="plain-prose text-[13.5px] leading-relaxed text-[var(--color-ink)] space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="mt-4 mb-1.5 text-[15px] font-semibold text-[var(--color-ink)]">{children}</h3>
          ),
          h2: ({ children }) => (
            <h4 className="mt-3 mb-1 text-[14px] font-semibold text-[var(--color-ink)]">{children}</h4>
          ),
          h3: ({ children }) => (
            <h5 className="mt-2.5 mb-1 text-[13.5px] font-semibold text-[var(--color-ink)]">{children}</h5>
          ),
          h4: ({ children }) => (
            <h6 className="mt-2 mb-1 text-[13px] font-semibold text-[var(--color-ink-soft)]">{children}</h6>
          ),
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-[13px]">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--color-ink)]">{children}</strong>
          ),
          code: ({ children }) => (
            <code className="font-mono text-[12px] px-1 py-0.5 rounded bg-[var(--color-canvas-sunken)] text-[var(--color-ink)]">
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full text-[12px] border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b border-[var(--color-rule)]">{children}</thead>,
          th: ({ children }) => (
            <th className="text-left font-medium px-2 py-1.5 text-[var(--color-ink-soft)]">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1.5 border-b border-[var(--color-rule-soft)] tabular-nums text-[var(--color-ink)]">
              {children}
            </td>
          ),
          hr: () => <hr className="my-3 border-[var(--color-rule-soft)]" />,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-[var(--color-rule-strong)] underline-offset-2 hover:text-[var(--color-accent)]"
            >
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
