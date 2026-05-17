import Papa from 'papaparse';
import { adaptCampaignData } from './index';
import { detectPlatformFromColumns } from './field-registry';
import { profileRows } from '@/lib/profiler';
import { putDataset, type LoadedDataset } from '@/lib/dataset-store';
import type { Platform } from './schemas';

const MAX_ROWS = 500;

type NormalizedUrl = {
  fetchUrl: string;
  source: string;
};

function normalizeUrl(url: string): NormalizedUrl {
  if (url.includes('kaggle.com')) {
    throw new Error(
      'Kaggle datasets require API authentication. ' +
      'Download the CSV from Kaggle, upload it to Google Sheets (File → Share → Publish to web → CSV), ' +
      'then paste that URL here instead.',
    );
  }

  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch) {
    const gidMatch = url.match(/[?&#]gid=(\d+)/);
    const gid = gidMatch ? `&gid=${gidMatch[1]}` : '';
    return {
      fetchUrl: `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/export?format=csv${gid}`,
      source: 'Google Sheets',
    };
  }

  const githubBlob = url.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)/);
  if (githubBlob) {
    return {
      fetchUrl: `https://raw.githubusercontent.com/${githubBlob[1]}/${githubBlob[2]}/${githubBlob[3]}`,
      source: 'GitHub',
    };
  }

  const hfMatch = url.match(/huggingface\.co\/datasets\/([^/?#]+\/[^/?#]+)/);
  if (hfMatch) {
    throw new Error(
      `Hugging Face datasets need a direct CSV URL. ` +
      `Try: https://huggingface.co/datasets/${hfMatch[1]}/resolve/main/data/train.csv ` +
      `(adjust the filename to match the actual file in the dataset repo).`,
    );
  }

  return { fetchUrl: url, source: url };
}

export async function loadDatasetFromUrl(rawUrl: string): Promise<LoadedDataset> {
  const { fetchUrl, source } = normalizeUrl(rawUrl);
  const response = await fetch(fetchUrl, { headers: { Accept: 'text/csv,text/plain,*/*' } });
  if (!response.ok) {
    const hint = source === 'Google Sheets' ? ' Make sure the sheet is shared as "Anyone with the link can view".' : '';
    throw new Error(`Could not fetch dataset (${response.status} ${response.statusText}).${hint}`);
  }
  const text = await response.text();
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  if (parsed.data.length === 0) {
    throw new Error('The CSV appears to be empty or could not be parsed.');
  }

  const originalColumns = parsed.meta.fields ?? [];
  const truncated = parsed.data.length > MAX_ROWS;
  const rows = truncated ? parsed.data.slice(0, MAX_ROWS) : parsed.data;
  const detectedPlatform = detectPlatformFromColumns(originalColumns);
  const platform: Platform = (detectedPlatform?.platform ?? 'unknown') as Platform;

  const adapted = await adaptCampaignData(rows, `url:${rawUrl}`, { platform });
  const profile = profileRows(rows);
  const datasetId = `url:${Buffer.from(rawUrl).toString('base64url').slice(0, 24)}`;
  const dataset: LoadedDataset = {
    datasetId,
    platform,
    source,
    label: source,
    rows: adapted.data,
    errors: adapted.errors,
    confidence: adapted.confidence,
    unmappedFields: adapted.unmappedFields,
    notes: adapted.notes,
    mappingSource: adapted.mappingSource,
    profile,
    totalSourceRows: parsed.data.length,
    truncated,
    loadedAt: Date.now(),
  };
  putDataset(dataset);
  return dataset;
}
