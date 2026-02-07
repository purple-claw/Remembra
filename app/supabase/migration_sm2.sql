-- =====================================================
-- SM-2 MIGRATION SCRIPT
-- =====================================================
-- Run this in Supabase Dashboard > SQL Editor
-- This migrates from the old 1-4-7 fixed system to SM-2 adaptive scheduling
-- Safe to run on existing data — all changes are additive or backwards-compatible
-- =====================================================

-- =====================================================
-- STEP 1: UPDATE ENUMS
-- =====================================================

-- Add 'good' to performance enum (replacing 'medium' semantically)
-- PostgreSQL doesn't allow removing enum values, so we add 'good' alongside 'medium'
ALTER TYPE performance ADD VALUE IF NOT EXISTS 'good';

-- Add 'active' and 'completed' to review_status enum
ALTER TYPE review_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE review_status ADD VALUE IF NOT EXISTS 'completed';

-- =====================================================
-- STEP 2: ADD NEW SM-2 COLUMNS TO memory_items
-- =====================================================

-- SM-2 core scheduling fields
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS easiness_factor FLOAT DEFAULT 2.5;
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS interval FLOAT DEFAULT 0;
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS repetition INTEGER DEFAULT 0;
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS lapse_count INTEGER DEFAULT 0;
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

-- Review template identifier
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS review_template TEXT DEFAULT 'sm2';

-- Legacy compat field (maps to repetition)
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS current_stage_index INTEGER DEFAULT 0;

-- Lifecycle fields
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS archive_at TIMESTAMPTZ;
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS delete_at TIMESTAMPTZ;

-- User interaction fields
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN DEFAULT FALSE;

-- AI fields (ai_summary and ai_flowchart already exist)
ALTER TABLE memory_items ADD COLUMN IF NOT EXISTS ai_bullet_points JSONB DEFAULT '[]'::jsonb;

-- =====================================================
-- STEP 3: MIGRATE EXISTING DATA TO NEW STATUS VALUES
-- =====================================================

-- Map old statuses to new ones:
--   learning  → active
--   reviewing → active  
--   mastered  → completed
--   archived  → archived (unchanged)

UPDATE memory_items SET status = 'active' WHERE status = 'learning';
UPDATE memory_items SET status = 'active' WHERE status = 'reviewing';
UPDATE memory_items SET status = 'completed' WHERE status = 'mastered';

-- =====================================================
-- STEP 4: INITIALIZE SM-2 FIELDS FOR EXISTING ITEMS
-- =====================================================

-- Set sensible SM-2 defaults based on existing review history
-- Items with reviews get EF based on difficulty, others get default 2.5
UPDATE memory_items 
SET 
  easiness_factor = CASE 
    WHEN difficulty = 'easy' THEN 2.8
    WHEN difficulty = 'hard' THEN 2.1
    ELSE 2.5 
  END,
  repetition = COALESCE(review_stage, 0),
  interval = CASE 
    WHEN next_review_date IS NOT NULL AND created_at IS NOT NULL 
    THEN GREATEST(0, EXTRACT(EPOCH FROM (next_review_date::timestamp - NOW())) / 86400)
    ELSE 0 
  END,
  current_stage_index = COALESCE(review_stage, 0),
  review_template = 'sm2'
WHERE easiness_factor IS NULL OR easiness_factor = 2.5;

-- =====================================================
-- STEP 5: UPDATE COLUMN DEFAULTS
-- =====================================================

-- Change default status for new items from 'learning' to 'active'
ALTER TABLE memory_items ALTER COLUMN status SET DEFAULT 'active';

-- =====================================================
-- STEP 6: ADD USEFUL INDEXES FOR SM-2 QUERIES
-- =====================================================

-- Index for fetching due items efficiently
CREATE INDEX IF NOT EXISTS idx_memory_items_next_review 
  ON memory_items (user_id, status, next_review_date);

-- Index for bookmark lookups
CREATE INDEX IF NOT EXISTS idx_memory_items_bookmarked 
  ON memory_items (user_id, is_bookmarked) WHERE is_bookmarked = TRUE;

-- Index for lifecycle cleanup queries
CREATE INDEX IF NOT EXISTS idx_memory_items_lifecycle 
  ON memory_items (status, delete_at) WHERE delete_at IS NOT NULL;

-- =====================================================
-- STEP 7: UPDATE RLS POLICIES (if needed)
-- =====================================================
-- The existing RLS policies should still work since they're based on user_id.
-- No changes needed unless you had column-specific policies.

-- =====================================================
-- VERIFICATION: Run this to confirm migration worked
-- =====================================================
-- SELECT id, title, status, easiness_factor, interval, repetition, lapse_count, review_template
-- FROM memory_items LIMIT 10;
