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

## Why the arithmetic lives in TypeScript

A reasonable question: if the agent already has access to the rows, why not let the model do the math? Hand it the dataset, ask for ROAS by audience, let it sum and divide. Modern models can do arithmetic. Why a query engine at all?

`lib/query.ts` is that engine. It's about 150 lines of pure, dependency-free TypeScript — one function, `queryCampaigns(rows, request)`, that takes the normalized `Campaign[]` rows and a typed `QueryRequest` and returns a typed `QueryResult`. No LLM is in the loop. The reasons it has to be this way, in order of stakes:

**1. Determinism.** `queryCampaigns()` is a pure function. Same rows, same request, byte-identical result. The audience tile shows the same number on every render, and the prose interpretation the model writes is grounded in numbers the user is staring at on the same page. With model-in-the-loop math, the same query at temperature > 0 can return `$4.21` and `$4.18` on consecutive calls. Even at temperature 0, an extra whitespace token earlier in the prompt can shift the third digit. For analytics, that isn't a rounding error — it's a credibility problem.

**2. Cost and accuracy ceiling.** Aggregating CTR over 50,000 rows in JavaScript is on the order of milliseconds and a few KB of memory. The same operation through a model means shipping all 50,000 rows as input tokens, paying for the working tokens to sum them, and accepting whatever multi-digit-arithmetic accuracy frontier models hit at that scale — which is well below 100%. The engine sidesteps all three concerns:

- The model never sees more than a 25-row preview. The `toModelOutput` hook on `queryDataset` (`ai/tools.ts:360-367`) clips `result.rows` to `ROWS_VISIBLE_TO_MODEL` before serialization, so the dataset size is decoupled from the context window. The widget receives the full result; the model receives the head.
- The digits the user reads are computed by the host runtime, not generated token-by-token.
- Adding a 200,000-row CSV doesn't change the model bill — it changes the size of an in-memory `Campaign[]`.

**3. Aggregate-then-rate, not rate-then-aggregate.** This is the subtle one and it's where LLM-computed numbers most often go wrong without anyone noticing. If you give a model a table of per-row CTR values and ask for "overall CTR," the most natural thing it can do is average them. That answer is wrong. The correct overall CTR is `total_clicks / total_impressions` — a click-weighted ratio, not an unweighted mean of ratios. `toQueryRow()` always sums the base metrics first, then derives the rates from the totals, with explicit zero-denominator guards:

```ts
ctr: impressions > 0 ? clicks / impressions : 0,
cpc: clicks > 0 ? spend / clicks : 0,
cpm: impressions > 0 ? spend / (impressions / 1000) : 0,
roas: spend > 0 ? revenue / spend : 0,
```

The CPM line is the one models reliably get wrong inline — dropping the `/ 1000`, flipping numerator and denominator, or quietly using "CPM" to mean cost-per-thousand-clicks. Pinning it to one canonical formula in one place removes a class of silent errors that "give the agent the data" can't.

**The split, in one sentence.** The model emits a typed query (`{ groupBy: ['audienceName'], metrics: ['conversions','spend','roas'], sortBy: 'roas', sortDir: 'desc', limit: 5 }`); the engine resolves it. Intent and execution are cleanly separated. The model never writes a `SUM`, never computes a ratio, never walks the long tail of rows. It picks the slice; the engine returns exact numbers in a stable, typed shape.

A few engineering details fall out of that split:

- **Bounded query DSL.** Nine metrics, ten group keys, seven filter operators (`eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`). The model is selecting from an enumerated set — Zod validates the entire `QueryRequest` at the tool boundary (`ai/tools.ts:347-359`), so it can't accidentally request `SUM(price * 2.3)` and have a silent partial match. Any invalid shape is rejected before a single row is touched.
- **Empty-result honesty.** When filters match no rows, the engine returns `rows: []` and `totalGroups: 0` — not a single fake all-zeros rollup (`lib/query.ts:64-79`). The system prompt teaches the model to surface "your filter matched nothing" rather than confidently quote `$0.00`. This is the single most common way "let the model compute it" fails closed: an all-zero answer that looks like a real answer.
- **Group-key derivation is consistent.** `groupBy` uses an enum of canonical fields. The cache key for buckets is the concatenation of group values, so a `['channel','date']` query and a `['date','channel']` query produce structurally equivalent buckets — there's no ordering ambiguity for the model to trip over.
- **Widgets receive numbers, not strings.** `QueryResult` is fully typed. There's no locale-formatted `"$1,234.56"` the model invented and the widget then had to re-parse. Formatting is a render concern, owned by `lib/format.ts`; numerical truth is a query-engine concern. The two never collide.
- **One set of formulas, applied at every site.** `tool-queryDataset` routes through `toQueryRow()` in `lib/query.ts`; the `show*` widget tools route through a sibling `aggregate()` in `ai/tools.ts`; `showTimeSeries` has its own inline per-date accumulator. All three implement the same five base sums and the same four derived-rate expressions (`ctr`, `cpc`, `cpm`, `roas`) with identical zero-denominator guards. The duplication is deliberate-for-now and small — each site is under twenty lines — but it's the obvious next consolidation: a single `aggregate(rows)` primitive that all four call sites import. If you fork this repo and extend it, that's the refactor to do first.

Net effect: the LLM does what LLMs are good at — picking the right cut, choosing the right widget, narrating the result in two sentences — and the engine does what engines are good at — exact, fast, deterministic math over typed rows. The Demo Mode toggle in the UI makes this contrast concrete: the same model, the same dataset, fired into both panes; the left does its own arithmetic in prose and the right delegates to the engine and renders. The numbers on the right are reproducible. The numbers on the left, you have to take on faith.

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
