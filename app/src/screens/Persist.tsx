import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Layers,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  listSessions,
  getSession,
  deleteSession,
} from '@/services/persistService';
import type {
  PersistRecord,
  PersistRecordFull,
  PersistCategoryBucket,
  PersistItem,
} from '@/services/persistService';
import { toast } from 'sonner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Persist Screen ───────────────────────────────────────────────────────────

export function Persist() {
  const { setScreen } = useStore();

  const [records, setRecords] = useState<PersistRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedData, setExpandedData] = useState<PersistRecordFull | null>(null);
  const [isExpanding, setIsExpanding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await listSessions();
      setRecords(list);
    } catch (err) {
      console.error('[Persist] load error', err);
      toast.error('Failed to load archived sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExpand = async (record: PersistRecord) => {
    const id = record.id!;
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedData(null);
      return;
    }
    setExpandedId(id);
    setExpandedData(null);
    setIsExpanding(true);
    try {
      const full = await getSession(id);
      setExpandedData(full);
    } catch {
      toast.error('Failed to decompress session');
    } finally {
      setIsExpanding(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteSession(id);
      if (expandedId === id) { setExpandedId(null); setExpandedData(null); }
      setRecords(prev => prev.filter(r => r.id !== id));
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-black flex flex-col">

      {/* ── Fixed Header ── */}
      <header className="flex-shrink-0 px-4 sm:px-5 safe-top pb-4 bg-black/80 border-b border-white/[0.06] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen('dashboard')}
            className="w-10 h-10 rounded-xl border border-white/10 bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Archive size={18} className="text-remembra-accent-primary" />
              <h1 className="text-xl font-bold text-remembra-text-primary">Persist</h1>
            </div>
            <p className="text-xs text-remembra-text-muted mt-0.5">
              {isLoading ? 'Loading…' : `${records.length} archived ${records.length === 1 ? 'session' : 'sessions'}`}
            </p>
          </div>
          <button
            onClick={load}
            disabled={isLoading}
            className="w-10 h-10 rounded-xl border border-white/10 bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary shrink-0"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div
        data-nav-scroll="true"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 custom-scrollbar safe-bottom-nav"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' } as React.CSSProperties}
      >
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-2xl h-20 animate-pulse" />
            ))}
          </div>

        ) : records.length === 0 ? (
          <EmptyState />

        ) : (
          <div className="space-y-3">
            {records.map(record => (
              <SessionCard
                key={record.id}
                record={record}
                isOpen={expandedId === record.id}
                isExpanding={isExpanding && expandedId === record.id}
                expandedData={expandedId === record.id ? expandedData : null}
                isDeleting={deletingId === record.id}
                onToggle={() => handleExpand(record)}
                onDelete={() => handleDelete(record.id!)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-remembra-bg-secondary flex items-center justify-center mb-5 border border-white/5">
        <Archive size={36} className="text-remembra-text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-remembra-text-primary mb-2">No archives yet</h3>
      <p className="text-sm text-remembra-text-muted max-w-xs leading-relaxed">
        Complete a review session and choose&nbsp;"Save to Persist" to archive a compressed snapshot here.
      </p>
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  record: PersistRecord;
  isOpen: boolean;
  isExpanding: boolean;
  expandedData: PersistRecordFull | null;
  isDeleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function SessionCard({
  record, isOpen, isExpanding, expandedData, isDeleting, onToggle, onDelete
}: SessionCardProps) {
  const sizeBytes = record.compressedData?.length ?? 0;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">

      {/* Header row — always visible */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="w-10 h-10 rounded-xl bg-remembra-accent-primary/10 flex items-center justify-center shrink-0">
          <Layers size={18} className="text-remembra-accent-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-remembra-text-primary truncate">
            {record.label}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-remembra-text-muted flex-wrap">
            <span>{record.itemCount} {record.itemCount === 1 ? 'item' : 'items'}</span>
            <span>·</span>
            <span>{formatBytes(sizeBytes)}</span>
            <span>·</span>
            <span>{formatDate(record.savedAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={isDeleting}
            className="w-8 h-8 rounded-lg border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 flex items-center justify-center transition-colors"
          >
            {isDeleting
              ? <RefreshCw size={12} className="animate-spin" />
              : <Trash2 size={13} />
            }
          </button>
          {isOpen
            ? <ChevronDown size={16} className="text-remembra-text-muted" />
            : <ChevronRight size={16} className="text-remembra-text-muted" />
          }
        </div>
      </div>

      {/* Expanded body */}
      {isOpen && (
        <div className="border-t border-white/[0.06] bg-black/15 px-4 pb-4 pt-3">
          {isExpanding ? (
            <div className="flex items-center gap-2 py-4 text-xs text-remembra-text-muted">
              <RefreshCw size={13} className="animate-spin" />
              Decompressing…
            </div>
          ) : expandedData ? (
            <div className="space-y-3">
              {expandedData.buckets.map((bucket: PersistCategoryBucket) => (
                <CategoryBucketView key={bucket.categoryId} bucket={bucket} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Category bucket ──────────────────────────────────────────────────────────

function CategoryBucketView({ bucket }: { bucket: PersistCategoryBucket }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
        style={{ backgroundColor: `${bucket.categoryColor}18` }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: bucket.categoryColor }}
        />
        <span className="text-sm font-semibold text-remembra-text-primary flex-1">
          {bucket.categoryIcon}&nbsp;{bucket.categoryName}
        </span>
        <span className="text-xs text-remembra-text-muted mr-1">
          {bucket.items.length} {bucket.items.length === 1 ? 'item' : 'items'}
        </span>
        {open
          ? <ChevronDown size={14} className="text-remembra-text-muted" />
          : <ChevronRight size={14} className="text-remembra-text-muted" />
        }
      </button>

      {open && (
        <div className="divide-y divide-white/[0.05]">
          {bucket.items.map((item: PersistItem, idx: number) => (
            <div key={idx} className="px-3 py-2.5 bg-black/20">
              <p className="text-sm text-remembra-text-primary font-medium truncate">
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-remembra-text-muted capitalize">
                  {item.contentType}
                </span>
                <span className="text-[11px] text-remembra-text-muted">·</span>
                <span className="text-[11px] text-remembra-text-muted">
                  Stage {item.reviewStage}
                </span>
              </div>
              {item.notes && (
                <p className="text-xs text-remembra-text-muted mt-1 line-clamp-2 leading-relaxed">
                  {item.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
