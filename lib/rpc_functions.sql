-- Remembra RPC Functions
-- Run this in Supabase SQL Editor after schema.sql

-- 1. Increment total reviews for a user (atomic operation)
CREATE OR REPLACE FUNCTION increment_reviews(p_user_id UUID, p_count INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
    UPDATE profiles 
    SET total_reviews = total_reviews + p_count,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update streak count based on consecutive review days
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    streak_count INTEGER := 0;
    current_date DATE := CURRENT_DATE;
    check_date DATE;
    has_reviews BOOLEAN;
BEGIN
    -- Check consecutive days backwards from today
    LOOP
        check_date := current_date - streak_count;
        
        SELECT EXISTS(
            SELECT 1 FROM daily_streaks 
            WHERE user_id = p_user_id 
            AND date = check_date 
            AND reviews_completed > 0
            AND NOT streak_broken
        ) INTO has_reviews;
        
        EXIT WHEN NOT has_reviews;
        streak_count := streak_count + 1;
    END LOOP;
    
    -- Update profile streak count
    UPDATE profiles 
    SET streak_count = streak_count,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN streak_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Process a review and calculate next review date using 1-4-7-30-90 algorithm
CREATE OR REPLACE FUNCTION process_review(
    p_item_id UUID,
    p_user_id UUID,
    p_performance TEXT, -- 'again', 'hard', 'medium', 'easy'
    p_time_spent INTEGER DEFAULT 0
)
RETURNS TABLE(next_review_date TIMESTAMPTZ, new_stage INTEGER, new_status TEXT) AS $$
DECLARE
    current_stage INTEGER;
    intervals INTEGER[] := ARRAY[1, 4, 7, 30, 90];
    new_stage INTEGER;
    next_date TIMESTAMPTZ;
    item_status TEXT;
    review_record JSONB;
BEGIN
    -- Get current stage
    SELECT review_stage, status INTO current_stage, item_status
    FROM memory_items 
    WHERE id = p_item_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Memory item not found or access denied';
    END IF;
    
    -- Calculate new stage based on performance
    CASE p_performance
        WHEN 'again' THEN
            new_stage := 0;
            next_date := NOW();
        WHEN 'hard' THEN
            new_stage := current_stage;
            next_date := NOW() + (intervals[current_stage + 1] || ' days')::INTERVAL;
        WHEN 'medium' THEN
            new_stage := LEAST(current_stage + 1, 4);
            next_date := NOW() + (intervals[new_stage + 1] || ' days')::INTERVAL;
        WHEN 'easy' THEN
            new_stage := LEAST(current_stage + 2, 4);
            next_date := NOW() + (intervals[new_stage + 1] || ' days')::INTERVAL;
        ELSE
            RAISE EXCEPTION 'Invalid performance value';
    END CASE;
    
    -- Determine new status
    IF new_stage >= 4 THEN
        item_status := 'mastered';
    ELSIF new_stage >= 2 THEN
        item_status := 'reviewing';
    ELSE
        item_status := 'learning';
    END IF;
    
    -- Create review record
    review_record := jsonb_build_object(
        'date', NOW(),
        'performance', p_performance,
        'timeSpentSeconds', p_time_spent
    );
    
    -- Update memory item
    UPDATE memory_items SET
        review_stage = new_stage,
        next_review_date = next_date,
        status = item_status,
        review_history = review_history || review_record,
        updated_at = NOW()
    WHERE id = p_item_id;
    
    -- Record daily streak
    INSERT INTO daily_streaks (user_id, date, reviews_completed)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date) 
    DO UPDATE SET reviews_completed = daily_streaks.reviews_completed + 1;
    
    -- Increment total reviews
    PERFORM increment_reviews(p_user_id, 1);
    
    -- Update streak
    PERFORM update_streak(p_user_id);
    
    RETURN QUERY SELECT next_date, new_stage, item_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get items due for review with optional category filter
CREATE OR REPLACE FUNCTION get_due_items(
    p_user_id UUID,
    p_category_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS SETOF memory_items AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM memory_items
    WHERE user_id = p_user_id
    AND next_review_date <= NOW()
    AND status != 'archived'
    AND (p_category_id IS NULL OR category_id = p_category_id)
    ORDER BY next_review_date ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Search memory items with full-text search
CREATE OR REPLACE FUNCTION search_items(
    p_user_id UUID,
    p_query TEXT,
    p_category_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS SETOF memory_items AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM memory_items
    WHERE user_id = p_user_id
    AND (
        title ILIKE '%' || p_query || '%'
        OR content ILIKE '%' || p_query || '%'
        OR p_query = ANY(tags)
    )
    AND (p_category_id IS NULL OR category_id = p_category_id)
    AND (p_status IS NULL OR status = p_status)
    ORDER BY updated_at DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_reviews TO authenticated;
GRANT EXECUTE ON FUNCTION update_streak TO authenticated;
GRANT EXECUTE ON FUNCTION process_review TO authenticated;
GRANT EXECUTE ON FUNCTION get_due_items TO authenticated;
GRANT EXECUTE ON FUNCTION search_items TO authenticated;
