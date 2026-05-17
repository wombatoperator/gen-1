import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'sample-data', 'fixtures');
const ROWS_PER_PLATFORM = 1200;
const AUDIENCE_ROWS = 240;

mkdirSync(OUT_DIR, { recursive: true });

function mulberry32(seed) {
  return function rand() {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pick(rand, values) {
  return values[Math.floor(rand() * values.length)];
}

function int(rand, min, max) {
  return Math.round(min + rand() * (max - min));
}

function money(value) {
  return value.toFixed(2);
}

function pct(value) {
  return (value * 100).toFixed(2);
}

function dateFor(index) {
  const date = new Date(Date.UTC(2024, 10, 1 + (index % 30)));
  return date.toISOString().slice(0, 10);
}

function usDateFor(index) {
  const date = new Date(Date.UTC(2024, 10, 1 + (index % 30)));
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

function csvEscape(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(filename, headers, rows) {
  const body = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? '')).join(',')),
  ].join('\n');

  writeFileSync(join(OUT_DIR, filename), `${body}\n`);
}

function campaignName(rand, channel) {
  const seasons = ['Holiday', 'Evergreen', 'New Arrivals', 'Black Friday', 'Cyber Week', 'Loyalty'];
  const audiences = ['Prospecting', 'Retargeting', 'Lookalike', 'Lapsed Customers', 'High Intent', 'Cart Abandoners'];
  const tactics = ['Broad', 'Core Terms', 'Gift Guide', 'Top Sellers', 'Value Props', 'Promo Push'];
  return `${pick(rand, seasons)} ${pick(rand, audiences)} - ${pick(rand, tactics)} ${channel}`;
}

function makeBaseRows(seed, platform, channels, count = ROWS_PER_PLATFORM) {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, index) => {
    const channel = pick(rand, channels);
    const impressions = int(rand, 15000, 950000);
    const ctrDecimal = 0.0025 + rand() * 0.075;
    const clicks = Math.max(1, Math.round(impressions * ctrDecimal));
    const cpm = 7 + rand() * 48;
    const spend = impressions / 1000 * cpm;
    const cpc = spend / clicks;
    const conversions = Math.max(0, Math.round(clicks * (0.008 + rand() * 0.07)));
    const revenue = conversions * (35 + rand() * 115);
    return {
      index,
      platform,
      channel,
      name: campaignName(rand, channel),
      impressions,
      clicks,
      spend,
      ctrDecimal,
      cpm,
      cpc,
      conversions,
      revenue,
      date: dateFor(index),
      usDate: usDateFor(index),
    };
  });
}

function generateMeta() {
  const rows = makeBaseRows(11, 'meta', ['facebook_feed', 'instagram_reels', 'instagram_stories', 'audience_network']).map((row) => ({
    campaign_id: `meta_cmp_${String(Math.floor(row.index / 12) + 1).padStart(4, '0')}`,
    campaign_name: row.name,
    adset_id: `meta_adset_${String(row.index + 1).padStart(5, '0')}`,
    adset_name: `${pick(mulberry32(row.index + 300), ['Broad 18-44', 'Purchasers 180d', 'Site Visitors 30d', 'Lookalike 2pct'])}`,
    ad_id: `meta_ad_${String(row.index + 1).padStart(5, '0')}`,
    ad_name: `${pick(mulberry32(row.index + 700), ['Static', 'Carousel', 'UGC Video', 'Collection'])} ${row.index % 6}`,
    account_id: 'act_2345678901',
    account_name: 'Northstar Retail',
    publisher_platform: row.channel.split('_')[0],
    platform_position: row.channel,
    impressions: String(row.impressions),
    clicks: String(row.clicks),
    inline_link_clicks: String(Math.round(row.clicks * 0.82)),
    spend: money(row.spend),
    ctr: pct(row.ctrDecimal),
    inline_link_click_ctr: pct(row.ctrDecimal * 0.82),
    cpm: money(row.cpm),
    cpc: money(row.cpc),
    purchases: String(row.conversions),
    date_start: row.usDate,
    platform: 'meta',
  }));

  writeCsv('meta-insights-adset-realistic.csv', Object.keys(rows[0]), rows);
}

function generateGoogle() {
  const rows = makeBaseRows(22, 'google', ['SEARCH', 'PERFORMANCE_MAX', 'SHOPPING', 'VIDEO', 'DISPLAY']).map((row) => ({
    'campaign.id': `300${String(Math.floor(row.index / 10) + 1).padStart(7, '0')}`,
    'campaign.name': row.name,
    'ad_group.id': `400${String(row.index + 1).padStart(7, '0')}`,
    'ad_group.name': `${pick(mulberry32(row.index + 1200), ['Exact', 'Phrase', 'Broad', 'Product Group', 'Asset Group'])} ${row.index % 9}`,
    'customer.id': '1234567890',
    'customer.descriptive_name': 'Northstar Retail',
    'campaign.advertising_channel_type': row.channel,
    'metrics.impressions': row.impressions,
    'metrics.clicks': row.clicks,
    'metrics.cost_micros': Math.round(row.spend * 1_000_000),
    'metrics.ctr': row.ctrDecimal.toFixed(5),
    average_cpm_micros: Math.round(row.cpm * 1_000_000),
    average_cpc_micros: Math.round(row.cpc * 1_000_000),
    'metrics.conversions': row.conversions,
    'metrics.conversions_value': money(row.revenue),
    'segments.date': row.date,
    platform: 'google',
  }));

  writeCsv('google-ads-gaql-adgroup-realistic.csv', Object.keys(rows[0]), rows);
}

function generateDv360() {
  const rows = makeBaseRows(33, 'dv360', ['Display', 'Video', 'Connected TV', 'Audio', 'Native']).map((row) => ({
    'Insertion Order ID': `780${String(Math.floor(row.index / 16) + 1).padStart(5, '0')}`,
    'Insertion Order': row.name,
    'Line Item ID': `880${String(row.index + 1).padStart(5, '0')}`,
    'Line Item': `${pick(mulberry32(row.index + 2100), ['Prospecting', 'Remarketing', 'Contextual', 'Private Marketplace'])} ${row.channel}`,
    'Creative ID': `990${String(row.index + 1).padStart(5, '0')}`,
    Creative: `${row.channel} ${pick(mulberry32(row.index + 2200), ['300x250', '728x90', '15s', '30s', 'Native'])}`,
    'Inventory Type': row.channel,
    'Advertiser ID': '556677',
    Advertiser: 'Northstar Retail',
    Impressions: row.impressions,
    Clicks: row.clicks,
    'Media Cost (Advertiser Currency)': money(row.spend),
    CTR: pct(row.ctrDecimal),
    CPM: money(row.cpm),
    CPC: money(row.cpc),
    'Total Conversions': row.conversions,
    Date: row.date,
    Currency: 'USD',
    platform: 'dv360',
  }));

  writeCsv('dv360-line-item-realistic.csv', Object.keys(rows[0]), rows);
}

function generateCm360() {
  const rows = makeBaseRows(39, 'cm360', ['Publisher Site', 'Mobile App', 'CTV App', 'Programmatic Site']).map((row) => ({
    campaignId: `660${String(Math.floor(row.index / 20) + 1).padStart(5, '0')}`,
    Campaign: row.name,
    placementId: `770${String(row.index + 1).padStart(5, '0')}`,
    Placement: `${pick(mulberry32(row.index + 2400), ['Homepage', 'Article', 'Video Pre-roll', 'ROS', 'Newsletter'])} ${row.channel}`,
    creativeId: `880${String(row.index + 1).padStart(5, '0')}`,
    Creative: `${pick(mulberry32(row.index + 2500), ['Display', 'Video', 'HTML5', 'Tracking'])} Creative ${row.index % 8}`,
    advertiserId: '445566',
    Advertiser: 'Northstar Retail',
    Site: row.channel,
    Impressions: row.impressions,
    Clicks: row.clicks,
    'Media Cost': money(row.spend),
    'Effective CPM': money(row.cpm),
    'Total Conversions': row.conversions,
    Revenue: money(row.revenue),
    Date: row.date,
    platform: 'cm360',
  }));

  writeCsv('cm360-placement-creative-realistic.csv', Object.keys(rows[0]), rows);
}

function generateTradeDesk() {
  const rows = makeBaseRows(44, 'ttd', ['Display', 'CTV', 'Audio', 'Native', 'Online Video']).map((row) => ({
    'Campaign ID': `ttd_cmp_${String(Math.floor(row.index / 14) + 1).padStart(5, '0')}`,
    'Campaign Name': row.name,
    'Ad Group ID': `ttd_ag_${String(row.index + 1).padStart(5, '0')}`,
    'Ad Group Name': `${pick(mulberry32(row.index + 3100), ['Behavioral', 'Contextual', 'Retargeting', 'Lookalike'])} ${row.channel}`,
    'Creative ID': `ttd_cr_${String(row.index + 1).padStart(5, '0')}`,
    'Creative Name': `${row.channel} Creative ${row.index % 10}`,
    'Advertiser ID': '998877',
    'Advertiser Name': 'Northstar Retail',
    Channel: row.channel,
    Impressions: row.impressions,
    Clicks: row.clicks,
    'Advertiser Cost (Adv Currency)': money(row.spend),
    CTR: pct(row.ctrDecimal),
    CPM: money(row.cpm),
    CPC: money(row.cpc),
    'Total Conversions': row.conversions,
    Date: row.date,
    platform: 'ttd',
  }));

  writeCsv('tradedesk-adgroup-realistic.csv', Object.keys(rows[0]), rows);
}

function generateAmazon() {
  const rows = makeBaseRows(55, 'amazon', ['SPONSORED_PRODUCTS', 'SPONSORED_BRANDS', 'SPONSORED_DISPLAY', 'SPONSORED_BRANDS_VIDEO']).map((row) => ({
    campaignId: `amzn_cmp_${String(Math.floor(row.index / 10) + 1).padStart(5, '0')}`,
    campaignName: row.name,
    adGroupId: `amzn_ag_${String(row.index + 1).padStart(5, '0')}`,
    adGroupName: `${pick(mulberry32(row.index + 4100), ['Auto', 'Manual Exact', 'Manual Phrase', 'ASIN Targeting'])} ${row.index % 12}`,
    targeting: pick(mulberry32(row.index + 4200), ['running shoes', 'holiday gifts', 'kitchen storage', 'wireless earbuds', 'competitor ASIN']),
    campaignType: row.channel,
    impressions: row.impressions,
    clicks: row.clicks,
    cost: money(row.spend),
    clickThroughRate: pct(row.ctrDecimal),
    costPerClick: money(row.cpc),
    purchases14d: row.conversions,
    sales14d: money(row.revenue),
    date: row.date,
    platform: 'amazon',
  }));

  writeCsv('amazon-sponsored-ads-adgroup-realistic.csv', Object.keys(rows[0]), rows);
}

function generateDv360Audience() {
  const audiences = [
    ['aud_1001', 'In-market - Apparel & Accessories'],
    ['aud_1002', 'Affinity - Fashionistas'],
    ['aud_1003', 'Custom Intent - Holiday Deals'],
    ['aud_1004', 'Remarketing - Site Visitors 30d'],
    ['aud_1005', 'Similar Audience - Purchasers'],
    ['aud_1006', 'Demographic - Parents'],
  ];
  const rows = makeBaseRows(66, 'dv360', ['Display', 'Video', 'Connected TV'], AUDIENCE_ROWS).map((row) => {
    const audience = audiences[row.index % audiences.length];
    return {
      'Insertion Order ID': `780${String(Math.floor(row.index / 20) + 1).padStart(5, '0')}`,
      'Insertion Order': row.name,
      'Line Item ID': `880${String(Math.floor(row.index / 2) + 1).padStart(5, '0')}`,
      'Line Item': `${row.channel} Audience Activation`,
      'Audience Segment ID': audience[0],
      'Audience Segment': audience[1],
      'Inventory Type': row.channel,
      Advertiser: 'Northstar Retail',
      Impressions: row.impressions,
      Clicks: row.clicks,
      'Media Cost (Advertiser Currency)': money(row.spend),
      CTR: pct(row.ctrDecimal),
      CPM: money(row.cpm),
      CPC: money(row.cpc),
      'Total Conversions': row.conversions,
      Date: row.date,
      platform: 'dv360',
    };
  });

  writeCsv('dv360-audience-report-realistic.csv', Object.keys(rows[0]), rows);
}

generateMeta();
generateGoogle();
generateDv360();
generateCm360();
generateTradeDesk();
generateAmazon();
generateDv360Audience();

console.log(`Generated realistic fixtures in ${OUT_DIR}`);
