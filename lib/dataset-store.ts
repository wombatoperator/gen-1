import type { Campaign, Platform } from '@/connectors/schemas';
import type { CsvProfile } from './profiler';

export type LoadedDataset = {
  datasetId: string;
  platform: Platform;
  source: string;
  label: string;
  rows: Campaign[];
  errors: { row: number; error: string }[];
  confidence: number;
  unmappedFields: string[];
  notes?: string;
  mappingSource: 'cache' | 'registry' | 'llm';
  profile: CsvProfile;
  totalSourceRows: number;
  truncated: boolean;
  loadedAt: number;
};

const store = new Map<string, LoadedDataset>();

export function putDataset(dataset: LoadedDataset): void {
  store.set(dataset.datasetId, dataset);
}

export function getDatasetById(id: string): LoadedDataset | undefined {
  return store.get(id);
}

export function listLoadedDatasets(): { datasetId: string; label: string; rows: number }[] {
  return Array.from(store.values()).map((dataset) => ({
    datasetId: dataset.datasetId,
    label: dataset.label,
    rows: dataset.rows.length,
  }));
}
