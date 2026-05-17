import { z } from 'zod';

export const PLATFORMS = ['meta', 'google', 'dv360', 'cm360', 'ttd', 'amazon', 'unknown'] as const;
export const REPORT_GRAINS = ['campaign', 'ad_group', 'placement', 'creative', 'audience', 'mixed', 'unknown'] as const;
export type Platform = (typeof PLATFORMS)[number];
export type ReportGrain = (typeof REPORT_GRAINS)[number];

// Required: id, name, impressions — everything else is optional
// so partial datasets still pass validation and render what they have
export const CampaignSchema = z.object({
  id:          z.coerce.string().describe('Campaign or deal identifier'),
  name:        z.coerce.string().describe('Campaign or deal name'),
  grain:       z.enum(REPORT_GRAINS).default('unknown').describe('Reporting grain represented by each row'),
  adGroupId:   z.coerce.string().optional().describe('Ad group, ad set, line item, or placement identifier'),
  adGroupName: z.coerce.string().optional().describe('Ad group, ad set, line item, or placement name'),
  placementId: z.coerce.string().optional().describe('Placement identifier, especially for ad-server reporting'),
  placementName:z.coerce.string().optional().describe('Placement name, especially for ad-server reporting'),
  creativeId:  z.coerce.string().optional().describe('Creative or ad identifier'),
  creativeName:z.coerce.string().optional().describe('Creative or ad name'),
  audienceId:  z.coerce.string().optional().describe('Audience segment identifier when the report is audience-grained'),
  audienceName:z.coerce.string().optional().describe('Audience segment name when the report is audience-grained'),
  channel:     z.coerce.string().optional().describe('Buying channel, inventory type, or campaign type'),
  accountId:   z.coerce.string().optional().describe('Advertiser, account, or customer identifier'),
  accountName: z.coerce.string().optional().describe('Advertiser, account, or customer name'),
  impressions: z.number().describe('Total ad impressions'),
  clicks:      z.number().optional().describe('Total clicks or conversions (whichever is closest available metric)'),
  spend:       z.number().optional().describe('Total spend in US dollars — may be derived as (impressions / 1000) * cpm'),
  ctr:         z.number().optional().describe('Click-through or conversion rate as decimal 0–1 (e.g. 0.025 = 2.5%)'),
  cpm:         z.number().optional().describe('Cost per 1000 impressions in US dollars'),
  cpc:         z.number().optional().describe('Cost per click in US dollars'),
  conversions: z.number().optional().describe('Total conversions or orders when present'),
  revenue:     z.number().optional().describe('Attributed revenue or sales in US dollars when present'),
  date:        z.string().optional().describe('Report date in YYYY-MM-DD format'),
  platform:    z.enum(PLATFORMS).default('unknown').describe('Ad platform or supply vendor name'),
});

export type Campaign = z.infer<typeof CampaignSchema>;

export const AudienceSchema = z.object({
  id:        z.string().describe('Audience segment identifier'),
  name:      z.string().describe('Audience segment name'),
  size:      z.number().describe('Total audience size in number of users'),
  reach:     z.number().describe('Estimated number of reachable users'),
  frequency: z.number().describe('Average number of times an ad is shown per user'),
  platform:  z.enum(PLATFORMS).describe('Ad platform name'),
});

export type Audience = z.infer<typeof AudienceSchema>;
