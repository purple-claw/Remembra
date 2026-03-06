/**
 * PersistDB – a separate IndexedDB store ("remembra-persist") that stores
 * super-compressed snapshots of reviewed topics.
 *
 * Compression pipeline:
 *   1. Pick only the essential fields from each MemoryItem (title, content, category).
 *   2. JSON-stringify the result.
 *   3. Compress with lz-string (Base64-URI-safe output, ~50-70 % smaller).
 *   4. Store as a single string in IndexedDB.
 */

import { openDB, type IDBPDatabase } from 'idb';
import LZString from 'lz-string';
import type { MemoryItem, Category } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Lightweight snapshot of a single memory item. */
export interface PersistItem {
  title: string;
  content: string;
  contentType: string;
  reviewStage: number;
  notes?: string;
}

/** One category bucket inside a persisted session. */
export interface PersistCategoryBucket {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  items: PersistItem[];
}

/** A full persisted session record as stored in IndexedDB. */
export interface PersistRecord {
  id?: number; // auto-incremented key
  savedAt: string; // ISO timestamp
  label: string; // user-facing title (e.g. "Session · 5 Mar 2026")
  itemCount: number;
  /** lz-string compressed JSON of PersistCategoryBucket[] */
  compressedData: string;
}

/** The rich, decompressed view of a persisted record (for reading). */
export interface PersistRecordFull extends Omit<PersistRecord, 'compressedData'> {
  buckets: PersistCategoryBucket[];
}

// ─── DB setup ─────────────────────────────────────────────────────────────────

const DB_NAME = 'remembra-persist';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBuckets(items: MemoryItem[], categories: Category[]): PersistCategoryBucket[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Group items by category
  const grouped = new Map<string, PersistItem[]>();
  for (const item of items) {
    const bucket = grouped.get(item.category_id) ?? [];
    bucket.push({
      title: item.title,
      content: item.content,
      contentType: item.content_type,
      reviewStage: item.review_stage,
      notes: item.notes ?? undefined,
    });
    grouped.set(item.category_id, bucket);
  }

  const buckets: PersistCategoryBucket[] = [];
  for (const [categoryId, persistItems] of grouped) {
    const cat = categoryMap.get(categoryId);
    buckets.push({
      categoryId,
      categoryName: cat?.name ?? 'Uncategorized',
      categoryColor: cat?.color ?? '#888888',
      categoryIcon: cat?.icon ?? '📁',
      items: persistItems,
    });
  }

  // Sort buckets by category name for consistency
  buckets.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  return buckets;
}

function compress(data: PersistCategoryBucket[]): string {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
}

function decompress(compressed: string): PersistCategoryBucket[] {
  const json = LZString.decompressFromEncodedURIComponent(compressed);
  if (!json) return [];
  return JSON.parse(json) as PersistCategoryBucket[];
}

function makeLabel(): string {
  const now = new Date();
  return `Session · ${now.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compress the reviewed items (with their categories) and save them to PersistDB.
 */
export async function saveSession(
  reviewedItems: MemoryItem[],
  categories: Category[],
  customLabel?: string,
): Promise<number> {
  const db = await getDb();
  const buckets = buildBuckets(reviewedItems, categories);
  const compressedData = compress(buckets);

  const record: Omit<PersistRecord, 'id'> = {
    savedAt: new Date().toISOString(),
    label: customLabel ?? makeLabel(),
    itemCount: reviewedItems.length,
    compressedData,
  };

  // `add` returns the auto-incremented key
  const id = await db.add(STORE_NAME, record);
  return id as number;
}

/**
 * Return all persisted sessions, most recent first (metadata only, not decompressed).
 */
export async function listSessions(): Promise<PersistRecord[]> {
  const db = await getDb();
  const all = (await db.getAll(STORE_NAME)) as PersistRecord[];
  return all.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

/**
 * Return one session, fully decompressed.
 */
export async function getSession(id: number): Promise<PersistRecordFull | null> {
  const db = await getDb();
  const record = (await db.get(STORE_NAME, id)) as PersistRecord | undefined;
  if (!record) return null;
  const { compressedData, ...meta } = record;
  return { ...meta, buckets: decompress(compressedData) };
}

/**
 * Delete a persisted session.
 */
export async function deleteSession(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}
