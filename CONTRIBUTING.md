# Contributing to gen-1

This project is designed so that the three things you most often want to extend are each a small, focused change. Below is the actual cost of each.

## 1. Add a new sample dataset

If you have a platform-native CSV export you want to make available in the picker:

1. Drop the CSV at `sample-data/fixtures/<your-file>.csv`.
2. Append an entry to `DATASET_CATALOG` in `lib/dataset-catalog.ts`:
   ```ts
   {
     id: 'my_platform_report',
     filename: 'my-platform-report.csv',
     platform: 'unknown', // or an existing platform key
     label: 'My Platform — Performance',
     description: 'One-line description shown on the picker card.',
   }
   ```

That is the whole change. The mapping engine is registry-first; if your CSV uses headers already known to the field registry, the LLM is never invoked.

## 2. Add a new ad platform

If you want first-class detection and column aliases for a new platform (e.g. Pinterest, LinkedIn, Snapchat):

1. Add the new key to `PLATFORMS` in `connectors/schemas.ts`.
2. Append a `PlatformFieldRegistry` entry in `connectors/field-registry.ts` — list each canonical field and its aliases as they appear in that platform's exports, plus any transforms (`micros_to_dollars`, `percentage_to_decimal`, etc.).
3. Add a label in `PLATFORM_LABELS` (`lib/format.ts`) and a glyph in `PLATFORM_GLYPH` (`app/page.tsx`).
4. Optional: add a fixture per step 1.

After this, `detectPlatformFromColumns()` will auto-recognize that platform's exports by header signature.

## 3. Add a new display widget

A widget is one React component + one tool definition. The agent picks when to render it.

1. Create `components/widgets/MyWidget.tsx` exposing a single React component that takes a `data` prop with whatever shape it needs. Use `WidgetShell` for the card chrome and `ChartContainer`/`ChartTooltip` for any Recharts charts. For metric-coloring, import `metricColor()` from `lib/format.ts` — every widget that displays a metric should use the semantic palette so the color follows the metric across the UI.
2. Add a tool to `tools` in `ai/tools.ts`:
   ```ts
   showMyWidget: tool({
     description: 'When the agent should call this and what it renders.',
     inputSchema: z.object({ datasetId: z.string(), /* whatever else */ }),
     execute: async ({ datasetId }) =>
       withDataset(datasetId, (dataset) => {
         // compute the shape MyWidget expects from dataset.rows
         return { /* data */ };
       }),
   }),
   ```
3. Add the rendering branch in `MessagePart` in `app/page.tsx`:
   ```tsx
   if (part.type === 'tool-showMyWidget') {
     if (part.state === 'output-available') {
       if ('toolError' in part.output) return <ToolFailed message={(part.output as { toolError: string }).toolError} />;
       return <MyWidget data={part.output} />;
     }
     return <ToolPending label="rendering my widget" />;
   }
   ```
4. Mention the tool in the `DISPLAY` section of `SYSTEM_PROMPT` in `app/api/chat/route.ts` so the agent knows when to call it.

## 4. Add a new metric or aggregation to queryDataset

`lib/query.ts` is the entire aggregation engine. To add a metric, extend `Metric`, add the per-row accumulation in `toQueryRow`, and add a label entry in `METRIC_LABELS` (`components/QueryResult.tsx`). Filters and groupBy keys are similarly localized.

## Design conventions

- **Chrome is neutral, color belongs to the data.** All chrome elements use `--color-accent` (`#1c1c1e`). Data uses the semantic palette in `lib/format.ts` (`HUE`, `METRIC_HUE`, `SERIES_PALETTE`).
- **No emojis** in code, UI, prompts, or docs. The tone is professional and editorial.
- **No markdown tables in agent prose.** The widgets render tables; the agent writes prose interpretation only.
- **Components stay shallow.** A widget should be one file under ~150 lines. If you need shared logic, put it in `lib/`.

## Local development

```bash
cp .env.local.example .env.local
# add ANTHROPIC_API_KEY

npm install
npm run dev
```

The dev server runs at <http://localhost:3000>. Mapping cache is process-local — restart the server to clear it.

## Running the fixture generator

`scripts/generate-fixtures.mjs` regenerates the sample CSVs with a fixed seed for reproducibility. Run with `node scripts/generate-fixtures.mjs` if you want to refresh them after schema changes.
