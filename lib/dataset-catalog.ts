import type { Platform } from '@/connectors/schemas';

export type DatasetEntry = {
  id: string;
  filename: string;
  platform: Platform;
  label: string;
  description: string;
};

export const DATASET_CATALOG: DatasetEntry[] = [
  {
    id: 'meta_adset',
    filename: 'meta-insights-adset-realistic.csv',
    platform: 'meta',
    label: 'Meta Ads — Insights',
    description: 'Ad set + creative grain across Facebook and Instagram with time-series rows.',
  },
  {
    id: 'google_adgroup',
    filename: 'google-ads-gaql-adgroup-realistic.csv',
    platform: 'google',
    label: 'Google Ads — GAQL',
    description: 'Ad group reporting via GAQL. Costs stored in micros.',
  },
  {
    id: 'dv360_line_item',
    filename: 'dv360-line-item-realistic.csv',
    platform: 'dv360',
    label: 'DV360 — Line item',
    description: 'Line item performance with inventory type and conversion counts.',
  },
  {
    id: 'dv360_audience',
    filename: 'dv360-audience-report-realistic.csv',
    platform: 'dv360',
    label: 'DV360 — Audience segments',
    description: 'Audience segment performance — third-party in-market and affinity audiences.',
  },
  {
    id: 'cm360_placement',
    filename: 'cm360-placement-creative-realistic.csv',
    platform: 'cm360',
    label: 'CM360 — Placement + creative',
    description: 'Placement-level delivery across creatives and sites.',
  },
  {
    id: 'ttd_adgroup',
    filename: 'tradedesk-adgroup-realistic.csv',
    platform: 'ttd',
    label: 'The Trade Desk — Ad group',
    description: 'Ad group performance with advertiser cost.',
  },
  {
    id: 'amazon_adgroup',
    filename: 'amazon-sponsored-ads-adgroup-realistic.csv',
    platform: 'amazon',
    label: 'Amazon — Sponsored Ads',
    description: 'Sponsored Ads ad group report with attributed sales.',
  },
];

export function getDataset(id: string): DatasetEntry | undefined {
  return DATASET_CATALOG.find((entry) => entry.id === id);
}
