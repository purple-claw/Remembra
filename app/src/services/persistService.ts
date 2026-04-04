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
import { logger } from '@/lib/logger';
import { success, failure, type Result, AppError } from '@/lib/errors';
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
const FALLBACK_STORAGE_KEY = 'remembra-persist-fallback-sessions';

let dbPromise: Promise<IDBPDatabase> | null = null;

function canUseIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

type PersistStoredRecord = PersistRecord & { id: number };

function readFallbackRecords(): PersistStoredRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((record): record is PersistStoredRecord => typeof record?.id === 'number');
  } catch {
    return [];
  }
}

function writeFallbackRecords(records: PersistStoredRecord[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(records));
}

function sortNewestFirst(records: PersistRecord[]): PersistRecord[] {
  return records.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

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
): Promise<Result<number>> {
  try {
    if (!Array.isArray(reviewedItems) || !Array.isArray(categories)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'reviewedItems and categories must be arrays',
        statusCode: 400,
      });
    }

    const buckets = buildBuckets(reviewedItems, categories);
    const compressedData = compress(buckets);

    const record: Omit<PersistRecord, 'id'> = {
      savedAt: new Date().toISOString(),
      label: customLabel ?? makeLabel(),
      itemCount: reviewedItems.length,
      compressedData,
    };

    if (canUseIndexedDb()) {
      try {
        const db = await getDb();
        // `add` returns the auto-incremented key
        const id = await db.add(STORE_NAME, record);

        // Prune old sessions in the background (fire-and-forget)
        pruneOldSessions(50).catch((err) => logger.warn('Session prune failed', { error: (err as any)?.message }));

        logger.info('Session saved successfully', { sessionId: id as number, itemCount: reviewedItems.length });
        return success(id as number);
      } catch (err) {
        logger.warn('IndexedDB save failed, using localStorage fallback', { error: (err as any)?.message });
      }
    }

    const existing = readFallbackRecords();
    const nextId = existing.reduce((max, current) => Math.max(max, current.id), 0) + 1;
    existing.push({ ...record, id: nextId });
    writeFallbackRecords(existing);
    await pruneOldSessions(50);
    logger.info('Session saved to localStorage fallback', { sessionId: nextId, itemCount: reviewedItems.length });
    return success(nextId);
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError({
      code: 'STORAGE_ERROR',
      message: error instanceof Error ? error.message : 'Failed to save session',
      statusCode: 500,
      context: { operation: 'saveSession' },
    });
    logger.error('Failed to save session', appError as any);
    return failure(appError);
  }
}

// ─── Auto-prune ──────────────────────────────────────────────────────────────

/**
 * Delete all sessions beyond the newest `maxToKeep` records.
 * Called automatically inside saveSession.
 */
export async function pruneOldSessions(maxToKeep = 50): Promise<Result<void>> {
  try {
    if (canUseIndexedDb()) {
      try {
        const db = await getDb();
        const all = (await db.getAll(STORE_NAME)) as PersistRecord[];
        if (all.length <= maxToKeep) return success(undefined);

        // Sort oldest-first, then delete the tail beyond the limit
        all.sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
        const toDelete = all.slice(0, all.length - maxToKeep);
        const tx = db.transaction(STORE_NAME, 'readwrite');
        await Promise.all(toDelete.map((r) => tx.store.delete(r.id!)));
        await tx.done;
        logger.info('Sessions pruned successfully', { deletedCount: toDelete.length, remainingCount: maxToKeep });
        return success(undefined);
      } catch (err) {
        logger.warn('IndexedDB prune failed, using localStorage fallback', { error: (err as any)?.message });
      }
    }

    const all = readFallbackRecords();
    if (all.length <= maxToKeep) return success(undefined);
    all.sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
    const deletedCount = all.length - maxToKeep;
    writeFallbackRecords(all.slice(all.length - maxToKeep));
    logger.info('Sessions pruned from localStorage', { deletedCount, remainingCount: maxToKeep });
    return success(undefined);
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError({
      code: 'STORAGE_ERROR',
      message: error instanceof Error ? error.message : 'Failed to prune sessions',
      statusCode: 500,
      context: { operation: 'pruneOldSessions', maxToKeep },
    });
    logger.error('Failed to prune sessions', appError as any);
    return failure(appError);
  }
}

/**
 * Return all persisted sessions, most recent first (metadata only, not decompressed).
 */
export async function listSessions(): Promise<Result<PersistRecord[]>> {
  try {
    if (canUseIndexedDb()) {
      try {
        const db = await getDb();
        const all = (await db.getAll(STORE_NAME)) as PersistRecord[];
        const sorted = sortNewestFirst(all);
        logger.info('Sessions listed from IndexedDB', { count: sorted.length });
        return success(sorted);
      } catch (err) {
        logger.warn('IndexedDB list failed, using localStorage fallback', { error: (err as any)?.message });
      }
    }

    const fallback = sortNewestFirst(readFallbackRecords());
    logger.info('Sessions listed from localStorage', { count: fallback.length });
    return success(fallback);
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError({
      code: 'STORAGE_ERROR',
      message: error instanceof Error ? error.message : 'Failed to list sessions',
      statusCode: 500,
      context: { operation: 'listSessions' },
    });
    logger.error('Failed to list sessions', appError as any);
    return failure(appError);
  }
}

/**
 * Return one session, fully decompressed.
 */
export async function getSession(id: number): Promise<Result<PersistRecordFull | null>> {
  try {
    if (typeof id !== 'number' || id < 1) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Session ID must be a positive number',
        statusCode: 400,
      });
    }

    if (canUseIndexedDb()) {
      try {
        const db = await getDb();
        const record = (await db.get(STORE_NAME, id)) as PersistRecord | undefined;
        if (!record) {
          logger.info('Session not found in IndexedDB', { sessionId: id });
          return success(null);
        }
        const { compressedData, ...meta } = record;
        logger.info('Session retrieved from IndexedDB', { sessionId: id });
        return success({ ...meta, buckets: decompress(compressedData) });
      } catch (err) {
        logger.warn('IndexedDB get failed, using localStorage fallback', { sessionId: id, error: (err as any)?.message });
      }
    }

    const fallback = readFallbackRecords().find((record) => record.id === id);
    if (!fallback) {
      logger.info('Session not found in localStorage', { sessionId: id });
      return success(null);
    }
    const { compressedData, ...meta } = fallback;
    logger.info('Session retrieved from localStorage', { sessionId: id });
    return success({ ...meta, buckets: decompress(compressedData) });
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError({
      code: 'STORAGE_ERROR',
      message: error instanceof Error ? error.message : 'Failed to get session',
      statusCode: 500,
      context: { operation: 'getSession', sessionId: id },
    });
    logger.error('Failed to get session', appError as any);
    return failure(appError);
  }
}

/**
 * Delete a persisted session.
 */
export async function deleteSession(id: number): Promise<Result<void>> {
  try {
    if (typeof id !== 'number' || id < 1) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Session ID must be a positive number',
        statusCode: 400,
      });
    }

    if (canUseIndexedDb()) {
      try {
        const db = await getDb();
        await db.delete(STORE_NAME, id);
        logger.info('Session deleted from IndexedDB', { sessionId: id });
        return success(undefined);
      } catch (err) {
        logger.warn('IndexedDB delete failed, using localStorage fallback', { sessionId: id, error: (err as any)?.message });
      }
    }

    const next = readFallbackRecords().filter((record) => record.id !== id);
    writeFallbackRecords(next);
    logger.info('Session deleted from localStorage', { sessionId: id });
    return success(undefined);
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError({
      code: 'STORAGE_ERROR',
      message: error instanceof Error ? error.message : 'Failed to delete session',
      statusCode: 500,
      context: { operation: 'deleteSession', sessionId: id },
    });
    logger.error('Failed to delete session', appError as any);
    return failure(appError);
  }
}
