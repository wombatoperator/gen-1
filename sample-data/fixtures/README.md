# Reporting Fixture CSVs

These CSVs are synthetic, deterministic, and shaped to match real-world platform reporting exports more closely than the original prototype data.

## Files

- `meta-insights-adset-realistic.csv` uses Meta Ads Insights-style fields such as `campaign_id`, `campaign_name`, `adset_id`, `adset_name`, `ad_id`, `ad_name`, `impressions`, `clicks`, `inline_link_clicks`, `spend`, `ctr`, `cpm`, `cpc`, and `date_start`.
- `google-ads-gaql-adgroup-realistic.csv` uses Google Ads GAQL-style dotted fields such as `campaign.id`, `campaign.name`, `ad_group.id`, `ad_group.name`, `metrics.impressions`, `metrics.clicks`, `metrics.cost_micros`, `metrics.ctr`, and `segments.date`.
- `dv360-line-item-realistic.csv` uses DV360 reporting-style insertion order and line item fields, including `Insertion Order ID`, `Insertion Order`, `Line Item ID`, `Line Item`, `Creative ID`, `Creative`, `Media Cost (Advertiser Currency)`, `CTR`, `CPM`, and `Date`.
- `cm360-placement-creative-realistic.csv` uses CM360-style ad-server dimensions such as `campaignId`, `Campaign`, `placementId`, `Placement`, `creativeId`, `Creative`, `Site`, `Impressions`, `Clicks`, `Media Cost`, and `Total Conversions`.
- `tradedesk-adgroup-realistic.csv` uses common The Trade Desk report-template fields such as `Campaign ID`, `Campaign Name`, `Ad Group ID`, `Ad Group Name`, `Creative ID`, `Advertiser Cost (Adv Currency)`, `CTR`, and `CPM`.
- `amazon-sponsored-ads-adgroup-realistic.csv` uses Amazon Sponsored Ads-style fields such as `campaignId`, `campaignName`, `adGroupId`, `adGroupName`, `targeting`, `campaignType`, `impressions`, `clicks`, `cost`, `clickThroughRate`, `costPerClick`, `purchases14d`, and `sales14d`.
- `dv360-audience-report-realistic.csv` is a smaller audience-grained DV360 report using `Audience Segment ID` and `Audience Segment` alongside IO, line item, and delivery metrics.

## Row Counts

- Main platform fixtures contain 1,200 data rows plus a header.
- The DV360 audience report contains 240 data rows plus a header.
- The main platform fixtures are time series datasets spread across 30 reporting days. This covers the requested 4/5 time-series requirement; in practice, all current main platform fixtures include a date column.

## Expected Mapping

Each file should map into the canonical campaign performance schema while preserving lower-grain dimensions when present:

- campaign: `id`, `name`
- ad group / line item / ad set: `adGroupId`, `adGroupName`
- placement: `placementId`, `placementName`
- creative: `creativeId`, `creativeName`
- audience: `audienceId`, `audienceName`
- delivery metrics: `impressions`, `clicks`, `spend`, `ctr`, `cpm`, `cpc`
- outcome metrics: `conversions`, `revenue`
- context: `date`, `channel`, `accountId`, `accountName`, `platform`
