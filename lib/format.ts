export const fmt = {
  currency: (v: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: v >= 1000 ? 0 : 2,
    }).format(v),
  percent: (v: number) => `${(v * 100).toFixed(2)}%`,
  number: (v: number) => v.toLocaleString(),
  compact: (v: number) =>
    new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(v),
};

export const PLATFORM_LABELS: Record<string, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  dv360: 'DV360',
  cm360: 'CM360',
  ttd: 'The Trade Desk',
  amazon: 'Amazon Ads',
  unknown: 'Dataset',
};

export type MetricKey = 'impressions' | 'clicks' | 'spend' | 'ctr' | 'cpc' | 'cpm' | 'conversions' | 'revenue' | 'roas';

export function formatMetric(key: MetricKey, value: number): string {
  if (key === 'spend' || key === 'cpc' || key === 'cpm' || key === 'revenue') return fmt.currency(value);
  if (key === 'ctr') return fmt.percent(value);
  if (key === 'roas') return `${value.toFixed(2)}x`;
  return fmt.number(Math.round(value));
}

// Semantic color assignment — chrome stays neutral; color belongs to the data.
// Each metric carries a consistent hue across every widget so the eye learns the mapping.
export type DataHue =
  | 'blue'    // impressions, primary baseline
  | 'teal'    // clicks, CTR (engagement)
  | 'green'   // conversions, revenue, ROAS, positive states
  | 'orange'  // spend, energy
  | 'red'     // CPC outliers, errors, negative states
  | 'purple'  // audiences
  | 'indigo'  // secondary breakdown dimensions
  | 'yellow'  // highlights, reference lines
  | 'pink';   // creatives / assets

export const HUE: Record<DataHue, { solid: string; soft: string; ink: string }> = {
  blue:   { solid: '#007aff', soft: '#e5f1ff', ink: '#0050a8' },
  teal:   { solid: '#30b0c7', soft: '#e0f4f8', ink: '#1e7d8e' },
  green:  { solid: '#34c759', soft: '#e6f7eb', ink: '#1f8a3a' },
  orange: { solid: '#ff9500', soft: '#fff1de', ink: '#b35f00' },
  red:    { solid: '#ff3b30', soft: '#ffe3e1', ink: '#a31b14' },
  purple: { solid: '#af52de', soft: '#f3e7fa', ink: '#7a36a0' },
  indigo: { solid: '#5856d6', soft: '#ebebf5', ink: '#3c3aa3' },
  yellow: { solid: '#ffcc00', soft: '#fff8d6', ink: '#8a6d00' },
  pink:   { solid: '#ff2d92', soft: '#ffdcef', ink: '#a31561' },
};

export const METRIC_HUE: Record<MetricKey, DataHue> = {
  impressions: 'blue',
  clicks:      'teal',
  ctr:         'teal',
  spend:       'orange',
  cpc:         'red',
  cpm:         'red',
  conversions: 'green',
  revenue:     'green',
  roas:        'green',
};

export function metricColor(metric: MetricKey): { solid: string; soft: string; ink: string } {
  return HUE[METRIC_HUE[metric]];
}

// Ordered palette for breakdown series (when one metric splits across N dimensions).
// Picked from the Apple system palette to maximize distinguishability at small scale.
export const SERIES_PALETTE: string[] = [
  HUE.blue.solid,
  HUE.orange.solid,
  HUE.green.solid,
  HUE.purple.solid,
  HUE.teal.solid,
  HUE.red.solid,
  HUE.indigo.solid,
  HUE.pink.solid,
];
