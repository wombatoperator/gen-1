# gen-1

**Generative UI for advertising data.** An open chat agent that loads messy CSV exports from any ad platform and answers questions by rendering typed React components — not by writing markdown reports the user has to re-read.

This repo is a working reference implementation of a simple idea: in a chat with an AI, the *components* should be the output medium. Words are the footnote.

---

## The philosophy

Most "AI for analytics" tools take a sensible question, hand it to a language model, and get back paragraphs of text that try — and fail — to be a chart. The model invents numbers. The user squints at a markdown table. The chart that should be there is a stack of pipes and dashes.

We think this gets the medium wrong.

The point of giving an LLM tools is that **tools are the interface**, not just the data fetcher. When the agent calls `showTimeSeries`, the user sees a chart, not a description of a chart. When the agent calls `showAudienceMix`, the user sees segment cards, not a bulleted recap. The model's job is to choose *which* component to render and *what* to pass it. The component's job is to read the data and present it the way an Apple designer would have presented it.

That changes how you write the prompt, how you structure the tools, and how the UI is composed:

- **One tool, one component.** Every render-tool — `showKpiStrip`, `showTimeSeries`, `showBreakdown`, `showAudienceMix`, `showEfficiencyMap` — corresponds to exactly one React component. Adding a new visualization is one component plus one tool definition. The agent composes the dashboard at call time, in whatever order makes sense for the user's question.
- **Chrome stays neutral, color belongs to the data.** Every metric has a fixed semantic color across every widget. Impressions are blue. Spend is orange. Conversions are green. CPC outliers are red. You learn the mapping once and it works everywhere — the discipline Apple's Health, Stocks, and Numbers apps quietly enforce.
- **Deterministic where possible, AI where necessary.** Mapping a Meta export to a canonical schema does not require an LLM call. A registry of per-platform column aliases does it for free, instantly, every time. The model only steps in for the messy headers the registry doesn't know — and only when required fields are still unmapped after the deterministic pass. The result is cached by header signature so the same CSV shape never re-incurs the cost.
- **The agent never invents numbers.** When the user asks "which audience converts cheapest?", the agent calls `queryDataset` against the normalized rows. The aggregation engine is pure TypeScript with no LLM in the loop. The model's answer is grounded in the same data the user sees.

These four ideas, executed together, make the difference between a chatbot that *describes* a dashboard and a chat interface that *is* one.

---

## Built for the advertising community

Six of the seven major platforms an analyst actually deals with — Meta, Google, DV360, CM360, The Trade Desk, Amazon — ship with their own column naming conventions, their own units (Google in micros, Meta in dollars, DV360 in advertiser currency), their own date formats, and their own grain (campaign / ad group / line item / placement / creative / audience). Normalizing across them is the unglamorous work that every ad-ops engineer has reimplemented at least three times.

gen-1 ships that normalization as a first-class, extensible layer. The included field registry recognizes those six platforms out of the box. Adding a seventh — Pinterest, LinkedIn, Snapchat, TikTok, a private DSP, a publisher's internal report — means appending one entry to the registry: the canonical fields, the platform's column names, the transforms. After that, every existing widget works on the new platform automatically.

We hope teams that want a starting point for internal analyst tools, agencies that want to give clients a self-serve view into their own data, and researchers studying the ad ecosystem all find this useful as a base.

---

## Composability is the contract

The repo is organized so that the three things you most often want to do are each a small, focused change:

| What | Where | Cost |
|---|---|---|
| Add a sample dataset | one entry in `lib/dataset-catalog.ts` | 1 file |
| Add a new platform | extend `connectors/field-registry.ts` + `lib/format.ts` | 2 files |
| Add a new visualization | one component + one tool + one render branch | 3 files |
| Add a new metric or filter | extend `lib/query.ts` | 1 file |

The full extension guide lives in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

Nothing is hidden behind a framework. The chat route is a single file. The tool registry is a single file. The aggregation engine is a single file. Every widget is one file with its own data shape. If you can read TypeScript, you can read this codebase end to end in an afternoon.

---

## What's in the box

- **Six realistic platform fixtures** (Meta Insights, Google Ads GAQL, DV360 line item + audience, CM360 placement-creative, The Trade Desk ad group, Amazon Sponsored Ads), seeded for reproducibility, structured exactly the way the platforms export them.
- **A canonical schema** for ad performance, expressed as Zod, with per-field aliases, transforms (micros, percentage, ISO date), and grain detection.
- **A header-hash mapping cache** so the same CSV shape never pays for inference twice.
- **A query engine** with groupBy, filters, metrics, sorting, and derived rates (CTR, CPC, CPM, ROAS).
- **Six display widgets** built on Recharts with a semantic per-metric palette.
- **A chat shell** that uses AI SDK v6's typed tool parts, streams components as the agent calls them, and renders short prose interpretation in proper markdown.

---

## What it intentionally is not

gen-1 is not a BI replacement. It does not connect to your data warehouse, it does not handle hundreds of millions of rows, it does not do incremental refresh or row-level security. It is a small, legible reference for one specific idea: **how a chat agent should render advertising data**.

If you want to build a production analytics product on top of these ideas, the connector layer and the widget contract are designed to be lifted. The registry-first/LLM-fallback pattern works against any tabular source. The per-tool component pattern works for any vertical, not just advertising.

---

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · AI SDK v6 · Anthropic Claude Sonnet 4.6 / Haiku 4.5 · Recharts · Tailwind v4 · Zod · Geist + Instrument Serif.

No database. No auth. No background workers. The whole thing fits in roughly 3,500 lines of source.

---

## Run locally

```bash
cp .env.local.example .env.local
# add your ANTHROPIC_API_KEY

npm install
npm run dev
```

Open <http://localhost:3000>, pick a dataset, ask a question.

## Deploy

It's plain Next.js — `vercel deploy` or any Node host with the App Router works. Set `ANTHROPIC_API_KEY` as an env var.

## License

MIT. Use it, fork it, build on it, ship it.

If you build something interesting on top of this, we'd love to know.
