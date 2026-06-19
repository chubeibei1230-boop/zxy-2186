import { openDB, IDBPDatabase } from 'idb';
import { PaperPattern, FilterState, AppSettings, PracticePlan, ReviewRecord } from './types';

const DB_NAME = 'paper-cutting-db';
const DB_VERSION = 3;

interface DBSchema {
  patterns: {
    key: string;
    value: PaperPattern;
    indexes: { 'by-order': number };
  };
  plans: {
    key: string;
    value: PracticePlan;
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
  reviews: {
    key: string;
    value: ReviewRecord;
    indexes: { 'by-createdAt': number; 'by-planId': string };
  };
}

let dbPromise: Promise<IDBPDatabase<DBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<DBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
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
        if (!db.objectStoreNames.contains('plans')) {
          const store = db.createObjectStore('plans', { keyPath: 'id' });
          store.createIndex('by-order', 'order');
        }
        if (!db.objectStoreNames.contains('reviews')) {
          const store = db.createObjectStore('reviews', { keyPath: 'id' });
          store.createIndex('by-createdAt', 'createdAt');
          store.createIndex('by-planId', 'planId');
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllPatterns(): Promise<PaperPattern[]> {
  const db = await getDB();
  const items = await db.getAll('patterns');
  return items.map(normalizePattern).sort((a, b) => a.order - b.order);
}

function normalizePattern(pattern: PaperPattern): PaperPattern {
  return {
    ...pattern,
    steps: Array.isArray(pattern.steps) ? pattern.steps : [],
    materials: Array.isArray(pattern.materials) ? pattern.materials : [],
  };
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

export async function getAllPlans(): Promise<PracticePlan[]> {
  const db = await getDB();
  const items = await db.getAll('plans');
  return items.map(normalizePlan).sort((a, b) => a.order - b.order);
}

function normalizePlan(plan: PracticePlan): PracticePlan {
  return {
    ...plan,
    items: Array.isArray(plan.items) ? plan.items : [],
  };
}

export async function savePlan(plan: PracticePlan): Promise<void> {
  const db = await getDB();
  plan.updatedAt = Date.now();
  await db.put('plans', plan);
}

export async function savePlansBulk(plans: PracticePlan[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('plans', 'readwrite');
  const now = Date.now();
  await Promise.all([
    ...plans.map(p => {
      p.updatedAt = now;
      return tx.store.put(p);
    }),
    tx.done,
  ]);
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('plans', id);
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

export async function getAllReviews(): Promise<ReviewRecord[]> {
  const db = await getDB();
  const items = await db.getAllFromIndex('reviews', 'by-createdAt');
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getReviewsByPlanId(planId: string): Promise<ReviewRecord[]> {
  const db = await getDB();
  const items = await db.getAllFromIndex('reviews', 'by-planId', planId);
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getReview(id: string): Promise<ReviewRecord | undefined> {
  const db = await getDB();
  return await db.get('reviews', id);
}

export async function saveReview(review: ReviewRecord): Promise<void> {
  const db = await getDB();
  review.updatedAt = Date.now();
  await db.put('reviews', review);
}

export async function deleteReview(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('reviews', id);
}
