import { openDB, IDBPDatabase } from 'idb';
import { PaperPattern, FilterState, AppSettings } from './types';

const DB_NAME = 'paper-cutting-db';
const DB_VERSION = 1;

interface DBSchema {
  patterns: {
    key: string;
    value: PaperPattern;
    indexes: { 'by-order': number };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  filters: {
    key: string;
    value: FilterState;
  };
  uiState: {
    key: string;
    value: Record<string, unknown>;
  };
}

let dbPromise: Promise<IDBPDatabase<DBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<DBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('patterns')) {
          const store = db.createObjectStore('patterns', { keyPath: 'id' });
          store.createIndex('by-order', 'order');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('filters')) {
          db.createObjectStore('filters', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('uiState')) {
          db.createObjectStore('uiState', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllPatterns(): Promise<PaperPattern[]> {
  const db = await getDB();
  const items = await db.getAll('patterns');
  return items.sort((a, b) => a.order - b.order);
}

export async function savePattern(pattern: PaperPattern): Promise<void> {
  const db = await getDB();
  pattern.updatedAt = Date.now();
  await db.put('patterns', pattern);
}

export async function savePatternsBulk(patterns: PaperPattern[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('patterns', 'readwrite');
  const now = Date.now();
  await Promise.all([
    ...patterns.map(p => {
      p.updatedAt = now;
      return tx.store.put(p);
    }),
    tx.done,
  ]);
}

export async function deletePattern(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('patterns', id);
}

export async function deletePatternsBulk(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('patterns', 'readwrite');
  await Promise.all([...ids.map(id => tx.store.delete(id)), tx.done]);
}

export async function saveFilters(filters: FilterState): Promise<void> {
  const db = await getDB();
  await db.put('filters', { id: 'default', ...filters });
}

export async function loadFilters(): Promise<FilterState | null> {
  const db = await getDB();
  const result = await db.get('filters', 'default');
  if (!result) return null;
  const { id, ...rest } = result as FilterState & { id: string };
  return rest as FilterState;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', { id: 'default', ...settings });
}

export async function loadSettings(): Promise<AppSettings> {
  const db = await getDB();
  const result = await db.get('settings', 'default');
  if (result) {
    const { id, ...rest } = result as AppSettings & { id: string };
    return rest as AppSettings;
  }
  return { totalDurationLimit: 180, maxItemsPerOwner: 5 };
}

export async function saveUIState(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  const existing = (await db.get('uiState', 'default')) || { id: 'default' };
  (existing as Record<string, unknown>)[key] = value;
  await db.put('uiState', existing as Record<string, unknown> & { id: string });
}

export async function loadUIState(): Promise<Record<string, unknown>> {
  const db = await getDB();
  const result = await db.get('uiState', 'default');
  if (!result) return {};
  const { id, ...rest } = result;
  return rest;
}
