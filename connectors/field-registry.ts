import { z } from 'zod';
import { CampaignSchema, PLATFORMS } from './schemas';

export type TransformName =
  | 'none'
  | 'percentage_to_decimal'
  | 'micros_to_dollars'
  | 'cents_to_dollars'
  | 'string_to_number'
  | 'iso_date';

export type CanonicalField = {
  targetField: string;
  description: string;
  required: boolean;
  aliases: string[];
  transforms?: TransformName[];
};

export type PlatformFieldDefinition = {
  canonicalField: string;
  aliases: string[];
  transform?: TransformName;
  confidence?: number;
  notes?: string;
};

export type PlatformFieldRegistry = {
  platform: (typeof PLATFORMS)[number];
  label: string;
  reportType: 'campaign_performance';
  notes?: string;
  fields: PlatformFieldDefinition[];
};

export type MappingCandidate = {
  sourceField: string;
  targetField: string;
  transform: TransformName;
  confidence: number;
  matchType: 'exact' | 'normalized' | 'alias' | 'fuzzy';
  registry?: string;
};

export type MappingContext = {
  canonicalFields: CanonicalField[];
  candidates: MappingCandidate[];
  platform?: string;
  registry?: PlatformFieldRegistry;
};

const COMMON_CAMPAIGN_FIELDS: CanonicalField[] = [
  {
    targetField: 'id',
    description: 'Campaign or deal identifier',
    required: true,
    aliases: ['id', 'campaign_id', 'campaign id', 'campaign.id', 'campaignId', 'Campaign ID'],
  },
  {
    targetField: 'name',
    description: 'Campaign or deal name',
    required: true,
    aliases: ['name', 'campaign_name', 'campaign name', 'campaign.name', 'campaignName', 'Campaign Name', 'Campaign'],
  },
  {
    targetField: 'grain',
    description: 'Reporting grain represented by each row',
    required: false,
    aliases: ['grain', 'report_grain', 'report grain', 'level', 'entity_level'],
  },
  {
    targetField: 'adGroupId',
    description: 'Ad group, ad set, line item, or media buy identifier',
    required: false,
    aliases: ['ad_group_id', 'ad group id', 'ad_group.id', 'adGroupId', 'adset_id', 'ad set id', 'line_item_id', 'line item id', 'Line Item ID'],
  },
  {
    targetField: 'adGroupName',
    description: 'Ad group, ad set, line item, or media buy name',
    required: false,
    aliases: ['ad_group_name', 'ad group name', 'ad_group.name', 'adGroupName', 'adset_name', 'ad set name', 'line_item_name', 'line item', 'Line Item'],
  },
  {
    targetField: 'placementId',
    description: 'Placement identifier, especially for ad-server reporting',
    required: false,
    aliases: ['placement_id', 'placement id', 'placementId', 'Placement ID'],
  },
  {
    targetField: 'placementName',
    description: 'Placement name, especially for ad-server reporting',
    required: false,
    aliases: ['placement_name', 'placement name', 'placement', 'Placement'],
  },
  {
    targetField: 'creativeId',
    description: 'Creative or ad identifier',
    required: false,
    aliases: ['creative_id', 'creative id', 'creativeId', 'ad_id', 'ad id', 'Ad ID', 'Creative ID'],
  },
  {
    targetField: 'creativeName',
    description: 'Creative or ad name',
    required: false,
    aliases: ['creative_name', 'creative name', 'creative', 'ad_name', 'ad name', 'Ad Name', 'Creative'],
  },
  {
    targetField: 'audienceId',
    description: 'Audience segment identifier when the report is audience-grained',
    required: false,
    aliases: ['audience_id', 'audience id', 'audience_segment_id', 'audience segment id', 'segment_id', 'segment id', 'Audience ID'],
  },
  {
    targetField: 'audienceName',
    description: 'Audience segment name when the report is audience-grained',
    required: false,
    aliases: ['audience_name', 'audience name', 'audience', 'audience_segment', 'audience segment', 'segment_name', 'segment name', 'Audience'],
  },
  {
    targetField: 'channel',
    description: 'Buying channel, inventory type, network, or campaign type',
    required: false,
    aliases: ['channel', 'inventory type', 'inventory_type', 'campaign_type', 'campaign type', 'advertising_channel_type', 'segments.ad_network_type'],
  },
  {
    targetField: 'accountId',
    description: 'Advertiser, account, or customer identifier',
    required: false,
    aliases: ['account_id', 'account id', 'advertiser_id', 'advertiser id', 'customer.id', 'Advertiser ID', 'Partner ID'],
  },
  {
    targetField: 'accountName',
    description: 'Advertiser, account, or customer name',
    required: false,
    aliases: ['account_name', 'account name', 'advertiser', 'advertiser_name', 'advertiser name', 'customer.descriptive_name', 'Advertiser'],
  },
  {
    targetField: 'impressions',
    description: 'Total ad impressions',
    required: true,
    aliases: ['impressions', 'metrics.impressions', 'metrics_impressions', 'Impressions', 'served impressions'],
    transforms: ['string_to_number'],
  },
  {
    targetField: 'clicks',
    description: 'Total clicks',
    required: false,
    aliases: ['clicks', 'metrics.clicks', 'metrics_clicks', 'Clicks', 'inline_link_clicks', 'link_clicks'],
    transforms: ['string_to_number'],
  },
  {
    targetField: 'spend',
    description: 'Total media cost or spend in US dollars',
    required: false,
    aliases: ['spend', 'cost', 'metrics.cost_micros', 'cost_micros', 'media cost', 'advertiser cost', 'Amount spent (USD)', 'Media Cost', 'Advertiser Cost'],
    transforms: ['none', 'string_to_number', 'micros_to_dollars', 'cents_to_dollars'],
  },
  {
    targetField: 'ctr',
    description: 'Click-through rate as decimal 0-1',
    required: false,
    aliases: ['ctr', 'metrics.ctr', 'metrics_ctr', 'CTR', 'Click-through rate', 'inline_link_click_ctr', 'clickThroughRate'],
    transforms: ['none', 'percentage_to_decimal', 'string_to_number'],
  },
  {
    targetField: 'cpm',
    description: 'Cost per 1000 impressions in US dollars',
    required: false,
    aliases: ['cpm', 'metrics.average_cpm', 'average_cpm_micros', 'Avg. CPM', 'CPM'],
    transforms: ['none', 'string_to_number', 'micros_to_dollars', 'cents_to_dollars'],
  },
  {
    targetField: 'cpc',
    description: 'Cost per click in US dollars',
    required: false,
    aliases: ['cpc', 'metrics.average_cpc', 'average_cpc_micros', 'costPerClick', 'Avg. CPC', 'CPC'],
    transforms: ['none', 'string_to_number', 'micros_to_dollars', 'cents_to_dollars'],
  },
  {
    targetField: 'conversions',
    description: 'Total conversions, purchases, orders, or attributed actions',
    required: false,
    aliases: ['conversions', 'metrics.conversions', 'purchases', 'orders', 'attributed conversions', 'totalConversions'],
    transforms: ['string_to_number'],
  },
  {
    targetField: 'revenue',
    description: 'Attributed revenue or sales in US dollars',
    required: false,
    aliases: ['revenue', 'sales', 'metrics.conversions_value', 'metrics.revenue_micros', 'sales14d', 'attributedSales14d'],
    transforms: ['none', 'string_to_number', 'micros_to_dollars', 'cents_to_dollars'],
  },
  {
    targetField: 'date',
    description: 'Report date in YYYY-MM-DD format',
    required: false,
    aliases: ['date', 'segments.date', 'report_date', 'date_start', 'Date', 'Day'],
    transforms: ['none', 'iso_date'],
  },
  {
    targetField: 'platform',
    description: 'Ad platform or supply vendor name',
    required: false,
    aliases: ['platform', 'source_platform'],
  },
];

export const PLATFORM_REGISTRIES: PlatformFieldRegistry[] = [
  {
    platform: 'meta',
    label: 'Meta Ads',
    reportType: 'campaign_performance',
    fields: [
      { canonicalField: 'id', aliases: ['campaign_id', 'Campaign ID'] },
      { canonicalField: 'name', aliases: ['campaign_name', 'Campaign name'] },
      { canonicalField: 'adGroupId', aliases: ['adset_id', 'Ad Set ID'] },
      { canonicalField: 'adGroupName', aliases: ['adset_name', 'Ad Set Name'] },
      { canonicalField: 'creativeId', aliases: ['ad_id', 'Ad ID'] },
      { canonicalField: 'creativeName', aliases: ['ad_name', 'Ad Name'] },
      { canonicalField: 'channel', aliases: ['publisher_platform', 'platform_position', 'impression_device'] },
      { canonicalField: 'accountId', aliases: ['account_id', 'Account ID'] },
      { canonicalField: 'accountName', aliases: ['account_name', 'Account name'] },
      { canonicalField: 'impressions', aliases: ['impressions', 'Impressions'], transform: 'string_to_number' },
      { canonicalField: 'clicks', aliases: ['clicks', 'inline_link_clicks', 'Clicks', 'Inline link clicks'], transform: 'string_to_number' },
      { canonicalField: 'spend', aliases: ['spend', 'Amount spent (USD)'], transform: 'string_to_number' },
      { canonicalField: 'ctr', aliases: ['ctr', 'inline_link_click_ctr', 'CTR', 'Link CTR'], transform: 'percentage_to_decimal' },
      { canonicalField: 'cpm', aliases: ['cpm', 'CPM'], transform: 'string_to_number' },
      { canonicalField: 'cpc', aliases: ['cpc', 'cost_per_inline_link_click', 'CPC'], transform: 'string_to_number' },
      { canonicalField: 'conversions', aliases: ['conversions', 'purchases', 'actions'], transform: 'string_to_number' },
      { canonicalField: 'date', aliases: ['date_start', 'Date starts', 'Day'], transform: 'iso_date' },
      { canonicalField: 'platform', aliases: ['platform'] },
    ],
  },
  {
    platform: 'google',
    label: 'Google Ads',
    reportType: 'campaign_performance',
    fields: [
      { canonicalField: 'id', aliases: ['campaign.id', 'campaign_id', 'Campaign ID'] },
      { canonicalField: 'name', aliases: ['campaign.name', 'campaign_name', 'Campaign'] },
      { canonicalField: 'adGroupId', aliases: ['ad_group.id', 'ad_group_id', 'Ad group ID'] },
      { canonicalField: 'adGroupName', aliases: ['ad_group.name', 'ad_group_name', 'Ad group'] },
      { canonicalField: 'creativeId', aliases: ['ad_group_ad.ad.id', 'ad_id', 'Ad ID'] },
      { canonicalField: 'channel', aliases: ['campaign.advertising_channel_type', 'advertising_channel_type', 'segments.ad_network_type'] },
      { canonicalField: 'accountId', aliases: ['customer.id', 'customer_id'] },
      { canonicalField: 'accountName', aliases: ['customer.descriptive_name', 'customer_name'] },
      { canonicalField: 'impressions', aliases: ['metrics.impressions', 'metrics_impressions', 'Impressions'], transform: 'string_to_number' },
      { canonicalField: 'clicks', aliases: ['metrics.clicks', 'metrics_clicks', 'Clicks'], transform: 'string_to_number' },
      { canonicalField: 'spend', aliases: ['metrics.cost_micros', 'cost_micros'], transform: 'micros_to_dollars' },
      { canonicalField: 'ctr', aliases: ['metrics.ctr', 'metrics_ctr', 'CTR'] },
      { canonicalField: 'cpm', aliases: ['metrics.average_cpm', 'average_cpm', 'Avg. CPM'], transform: 'string_to_number' },
      { canonicalField: 'cpm', aliases: ['average_cpm_micros'], transform: 'micros_to_dollars' },
      { canonicalField: 'cpc', aliases: ['metrics.average_cpc', 'average_cpc', 'Avg. CPC'], transform: 'string_to_number' },
      { canonicalField: 'cpc', aliases: ['average_cpc_micros'], transform: 'micros_to_dollars' },
      { canonicalField: 'conversions', aliases: ['metrics.conversions', 'metrics.all_conversions', 'Conversions'], transform: 'string_to_number' },
      { canonicalField: 'revenue', aliases: ['metrics.conversions_value', 'metrics.revenue_micros'], transform: 'micros_to_dollars' },
      { canonicalField: 'date', aliases: ['segments.date', 'report_date', 'Day'] },
      { canonicalField: 'platform', aliases: ['platform'] },
    ],
  },
  {
    platform: 'dv360',
    label: 'DV360',
    reportType: 'campaign_performance',
    fields: [
      { canonicalField: 'id', aliases: ['Insertion Order ID', 'IO ID', 'Campaign ID'] },
      { canonicalField: 'name', aliases: ['Insertion Order', 'IO Name', 'Campaign'] },
      { canonicalField: 'adGroupId', aliases: ['Line Item ID'] },
      { canonicalField: 'adGroupName', aliases: ['Line Item'] },
      { canonicalField: 'creativeId', aliases: ['Creative ID'] },
      { canonicalField: 'creativeName', aliases: ['Creative'] },
      { canonicalField: 'audienceId', aliases: ['Audience Segment ID', 'Audience ID'] },
      { canonicalField: 'audienceName', aliases: ['Audience Segment', 'Audience'] },
      { canonicalField: 'channel', aliases: ['Inventory Type', 'Environment', 'Line Item Type'] },
      { canonicalField: 'accountId', aliases: ['Advertiser ID'] },
      { canonicalField: 'accountName', aliases: ['Advertiser'] },
      { canonicalField: 'impressions', aliases: ['Impressions'], transform: 'string_to_number' },
      { canonicalField: 'clicks', aliases: ['Clicks'], transform: 'string_to_number' },
      { canonicalField: 'spend', aliases: ['Media Cost (Advertiser Currency)', 'Revenue (Advertiser Currency)', 'Media Cost'], transform: 'string_to_number' },
      { canonicalField: 'ctr', aliases: ['CTR'], transform: 'percentage_to_decimal' },
      { canonicalField: 'cpm', aliases: ['CPM'], transform: 'string_to_number' },
      { canonicalField: 'cpc', aliases: ['CPC'], transform: 'string_to_number' },
      { canonicalField: 'conversions', aliases: ['Total Conversions', 'Post-Click Conversions', 'Post-View Conversions'], transform: 'string_to_number' },
      { canonicalField: 'date', aliases: ['Date', 'Day'], transform: 'iso_date' },
    ],
  },
  {
    platform: 'cm360',
    label: 'CM360',
    reportType: 'campaign_performance',
    fields: [
      { canonicalField: 'id', aliases: ['campaignId', 'Campaign ID'] },
      { canonicalField: 'name', aliases: ['campaign', 'Campaign'] },
      { canonicalField: 'placementId', aliases: ['placementId', 'Placement ID'] },
      { canonicalField: 'placementName', aliases: ['placement', 'Placement'] },
      { canonicalField: 'creativeId', aliases: ['creativeId', 'Creative ID'] },
      { canonicalField: 'creativeName', aliases: ['creative', 'Creative'] },
      { canonicalField: 'channel', aliases: ['site', 'Site', 'environment', 'Environment'] },
      { canonicalField: 'accountId', aliases: ['advertiserId', 'Advertiser ID'] },
      { canonicalField: 'accountName', aliases: ['advertiser', 'Advertiser'] },
      { canonicalField: 'impressions', aliases: ['impressions', 'Impressions'], transform: 'string_to_number' },
      { canonicalField: 'clicks', aliases: ['clicks', 'Clicks'], transform: 'string_to_number' },
      { canonicalField: 'spend', aliases: ['mediaCost', 'Media Cost', 'plannedMediaCost', 'Planned Media Cost'], transform: 'string_to_number' },
      { canonicalField: 'cpm', aliases: ['effectiveCpm', 'Effective CPM'], transform: 'string_to_number' },
      { canonicalField: 'conversions', aliases: ['totalConversions', 'Total Conversions', 'clickThroughConversions', 'Click-through Conversions'], transform: 'string_to_number' },
      { canonicalField: 'revenue', aliases: ['revenue', 'Revenue'], transform: 'string_to_number' },
      { canonicalField: 'date', aliases: ['date', 'Date'], transform: 'iso_date' },
    ],
  },
  {
    platform: 'ttd',
    label: 'The Trade Desk',
    reportType: 'campaign_performance',
    notes: 'TTD report fields are template-dependent; aliases cover common standard report exports.',
    fields: [
      { canonicalField: 'id', aliases: ['Campaign ID', 'campaignId'] },
      { canonicalField: 'name', aliases: ['Campaign Name', 'Campaign', 'campaign'] },
      { canonicalField: 'adGroupId', aliases: ['Ad Group ID', 'adGroupId'] },
      { canonicalField: 'adGroupName', aliases: ['Ad Group Name', 'Ad Group', 'adGroup'] },
      { canonicalField: 'creativeId', aliases: ['Creative ID', 'creativeId'] },
      { canonicalField: 'creativeName', aliases: ['Creative Name', 'Creative', 'creative'] },
      { canonicalField: 'audienceId', aliases: ['Audience ID'] },
      { canonicalField: 'audienceName', aliases: ['Audience'] },
      { canonicalField: 'channel', aliases: ['Channel', 'Ad Format'] },
      { canonicalField: 'accountId', aliases: ['Advertiser ID', 'Partner ID'] },
      { canonicalField: 'accountName', aliases: ['Advertiser Name', 'Advertiser'] },
      { canonicalField: 'impressions', aliases: ['Impressions'], transform: 'string_to_number' },
      { canonicalField: 'clicks', aliases: ['Clicks'], transform: 'string_to_number' },
      { canonicalField: 'spend', aliases: ['Advertiser Cost (Adv Currency)', 'Advertiser Cost (USD)', 'TTD Total Cost', 'Media Cost (USD)'], transform: 'string_to_number' },
      { canonicalField: 'ctr', aliases: ['CTR'], transform: 'percentage_to_decimal' },
      { canonicalField: 'cpm', aliases: ['CPM'], transform: 'string_to_number' },
      { canonicalField: 'cpc', aliases: ['CPC'], transform: 'string_to_number' },
      { canonicalField: 'conversions', aliases: ['Total Conversions', 'Click Conversions', 'View Conversions'], transform: 'string_to_number' },
      { canonicalField: 'date', aliases: ['Date'], transform: 'iso_date' },
    ],
  },
  {
    platform: 'amazon',
    label: 'Amazon Ads',
    reportType: 'campaign_performance',
    fields: [
      { canonicalField: 'id', aliases: ['campaignId', 'campaign_id', 'Campaign ID'] },
      { canonicalField: 'name', aliases: ['campaignName', 'campaign_name', 'Campaign Name'] },
      { canonicalField: 'adGroupId', aliases: ['adGroupId', 'ad_group_id', 'Ad Group ID'] },
      { canonicalField: 'adGroupName', aliases: ['adGroupName', 'ad_group_name', 'Ad Group Name'] },
      { canonicalField: 'placementName', aliases: ['placement', 'Placement'] },
      { canonicalField: 'audienceName', aliases: ['targeting', 'Targeting', 'Audience'] },
      { canonicalField: 'channel', aliases: ['campaignType', 'Campaign Type', 'adProduct'] },
      { canonicalField: 'impressions', aliases: ['impressions', 'Impressions'], transform: 'string_to_number' },
      { canonicalField: 'clicks', aliases: ['clicks', 'Clicks'], transform: 'string_to_number' },
      { canonicalField: 'spend', aliases: ['cost', 'spend', 'Spend'], transform: 'string_to_number' },
      { canonicalField: 'ctr', aliases: ['clickThroughRate', 'CTR', 'CTR (%)'], transform: 'percentage_to_decimal' },
      { canonicalField: 'cpc', aliases: ['costPerClick', 'CPC'], transform: 'string_to_number' },
      { canonicalField: 'conversions', aliases: ['purchases', 'orders', 'purchases14d', 'Orders'], transform: 'string_to_number' },
      { canonicalField: 'revenue', aliases: ['sales', 'sales14d', 'attributedSales14d', 'Sales'], transform: 'string_to_number' },
      { canonicalField: 'date', aliases: ['date', 'Date'], transform: 'iso_date' },
      { canonicalField: 'platform', aliases: ['platform'] },
    ],
  },
];

const TARGET_FIELDS = new Set(Object.keys(CampaignSchema.shape));
const REQUIRED_TARGET_FIELDS = Object.entries(CampaignSchema.shape)
  .filter(([, shape]) => !isOptionalLike(shape))
  .map(([key]) => key);

function isOptionalLike(shape: z.ZodTypeAny): boolean {
  return shape.isOptional() || shape instanceof z.ZodDefault;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function tokenScore(source: string, alias: string): number {
  const sourceTokens = source.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const aliasTokens = alias.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (sourceTokens.length === 0 || aliasTokens.length === 0) return 0;
  const overlap = aliasTokens.filter((token) => sourceTokens.includes(token)).length;
  return overlap / Math.max(sourceTokens.length, aliasTokens.length);
}

function inferTransform(sourceField: string, defaultTransform?: TransformName): TransformName {
  if (defaultTransform) return defaultTransform;
  const normalized = normalize(sourceField);
  if (normalized.includes('micros')) return 'micros_to_dollars';
  if (normalized.includes('cents')) return 'cents_to_dollars';
  if (normalized.includes('date') || normalized === 'day') return 'iso_date';
  return 'none';
}

function upsertCandidate(candidates: MappingCandidate[], candidate: MappingCandidate): void {
  const existingIndex = candidates.findIndex(
    (item) => item.sourceField === candidate.sourceField && item.targetField === candidate.targetField,
  );

  if (existingIndex === -1 || candidates[existingIndex].confidence < candidate.confidence) {
    if (existingIndex === -1) candidates.push(candidate);
    else candidates[existingIndex] = candidate;
  }
}

export function getCampaignCanonicalFields(): CanonicalField[] {
  return COMMON_CAMPAIGN_FIELDS;
}

export function getPlatformRegistry(platform?: string): PlatformFieldRegistry | undefined {
  return PLATFORM_REGISTRIES.find((registry) => registry.platform === platform);
}

export function detectPlatformFromColumns(sourceFields: string[]): PlatformFieldRegistry | undefined {
  const normalizedSource = new Set(sourceFields.map(normalize));

  return PLATFORM_REGISTRIES
    .map((registry) => {
      const matches = registry.fields.reduce((count, field) => {
        const matched = field.aliases.some((alias) => normalizedSource.has(normalize(alias)));
        return count + (matched ? 1 : 0);
      }, 0);
      return { registry, matches };
    })
    .filter((item) => item.matches >= 2)
    .sort((a, b) => b.matches - a.matches)[0]?.registry;
}

export function buildMappingContext(
  sourceFields: string[],
  platform?: string,
): MappingContext {
  const detectedRegistry = getPlatformRegistry(platform) ?? detectPlatformFromColumns(sourceFields);
  const candidates: MappingCandidate[] = [];
  const sourceByNormalized = new Map(sourceFields.map((field) => [normalize(field), field]));

  for (const field of COMMON_CAMPAIGN_FIELDS) {
    for (const alias of [field.targetField, ...field.aliases]) {
      const sourceField = sourceByNormalized.get(normalize(alias));
      if (!sourceField) continue;
      upsertCandidate(candidates, {
        sourceField,
        targetField: field.targetField,
        transform: inferTransform(sourceField),
        confidence: normalize(sourceField) === normalize(field.targetField) ? 0.95 : 0.9,
        matchType: normalize(sourceField) === normalize(field.targetField) ? 'exact' : 'alias',
      });
    }
  }

  if (detectedRegistry) {
    for (const definition of detectedRegistry.fields) {
      for (const alias of definition.aliases) {
        const sourceField = sourceByNormalized.get(normalize(alias));
        if (!sourceField) continue;
        upsertCandidate(candidates, {
          sourceField,
          targetField: definition.canonicalField,
          transform: inferTransform(sourceField, definition.transform),
          confidence: definition.confidence ?? 1,
          matchType: 'alias',
          registry: detectedRegistry.platform,
        });
      }
    }
  }

  for (const sourceField of sourceFields) {
    const sourceNorm = normalize(sourceField);
    for (const field of COMMON_CAMPAIGN_FIELDS) {
      for (const alias of field.aliases) {
        const aliasNorm = normalize(alias);
        const score =
          sourceNorm.includes(aliasNorm) || aliasNorm.includes(sourceNorm)
            ? 0.78
            : tokenScore(sourceField, alias) * 0.75;
        if (score >= 0.55) {
          upsertCandidate(candidates, {
            sourceField,
            targetField: field.targetField,
            transform: inferTransform(sourceField),
            confidence: score,
            matchType: 'fuzzy',
          });
        }
      }
    }
  }

  return {
    canonicalFields: COMMON_CAMPAIGN_FIELDS,
    candidates: candidates.sort((a, b) => b.confidence - a.confidence),
    platform: detectedRegistry?.platform ?? platform,
    registry: detectedRegistry,
  };
}

export function validateTargetField(field: string): boolean {
  return TARGET_FIELDS.has(field);
}

export function getRequiredCampaignFields(): string[] {
  return REQUIRED_TARGET_FIELDS;
}
