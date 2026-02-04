-- RPC Functions for Remembra
-- These functions handle complex business logic for the 1-4-7 spaced repetition system

-- Function to get today's review queue
CREATE OR REPLACE FUNCTION get_review_queue(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category_id UUID,
  category_name TEXT,
  category_color TEXT,
  stage INT,
  next_review_date TIMESTAMPTZ,
  difficulty REAL,
  content_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id,
    mi.title,
    mi.category_id,
    c.name AS category_name,
    c.color AS category_color,
    mi.stage,
    mi.next_review_date,
    mi.difficulty,
    mi.content_type
  FROM memory_items mi
  LEFT JOIN categories c ON mi.category_id = c.id
  WHERE mi.user_id = user_uuid
    AND mi.is_archived = FALSE
    AND mi.next_review_date <= NOW()
  ORDER BY mi.next_review_date ASC, mi.difficulty DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate next review date based on 1-4-7 algorithm
CREATE OR REPLACE FUNCTION calculate_next_review_stage(
  current_stage INT,
  success BOOLEAN
)
RETURNS INT AS $$
BEGIN
  IF NOT success THEN
    -- Reset to day 1 if failed
    RETURN 1;
  END IF;
  
  -- Success path: 0 -> 1 -> 4 -> 7 -> 30 -> 90
  CASE current_stage
    WHEN 0 THEN RETURN 1;
    WHEN 1 THEN RETURN 4;
    WHEN 4 THEN RETURN 7;
    WHEN 7 THEN RETURN 30;
    WHEN 30 THEN RETURN 90;
    ELSE RETURN 90; -- Max interval
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to submit a review
CREATE OR REPLACE FUNCTION submit_review(
  p_item_id UUID,
  p_user_id UUID,
  p_success BOOLEAN,
  p_duration_seconds INT,
  p_difficulty_rating INT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_stage INT;
  v_next_stage INT;
  v_next_date TIMESTAMPTZ;
  v_new_difficulty REAL;
  v_current_difficulty REAL;
BEGIN
  -- Get current stage and difficulty
  SELECT stage, difficulty INTO v_current_stage, v_current_difficulty
  FROM memory_items
  WHERE id = p_item_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;
  
  -- Calculate next stage
  v_next_stage := calculate_next_review_stage(v_current_stage, p_success);
  
  -- Calculate next review date
  v_next_date := NOW() + (v_next_stage || ' days')::INTERVAL;
  
  -- Adjust difficulty based on performance (exponential moving average)
  IF p_difficulty_rating IS NOT NULL THEN
    v_new_difficulty := v_current_difficulty * 0.7 + (p_difficulty_rating / 5.0) * 0.3;
  ELSE
    v_new_difficulty := v_current_difficulty;
  END IF;
  
  -- Insert review record
  INSERT INTO reviews (item_id, user_id, success, duration_seconds, difficulty_rating, stage_at_review, notes)
  VALUES (p_item_id, p_user_id, p_success, p_duration_seconds, p_difficulty_rating, v_current_stage, p_notes);
  
  -- Update memory item
  UPDATE memory_items
  SET 
    stage = v_next_stage,
    next_review_date = v_next_date,
    last_reviewed_at = NOW(),
    review_count = review_count + 1,
    success_count = success_count + (CASE WHEN p_success THEN 1 ELSE 0 END),
    difficulty = v_new_difficulty,
    updated_at = NOW()
  WHERE id = p_item_id;
  
  -- Update user stats
  UPDATE profiles
  SET 
    total_reviews = total_reviews + 1,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'next_stage', v_next_stage,
    'next_review_date', v_next_date,
    'new_difficulty', v_new_difficulty
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_items', COUNT(*),
    'items_learning', COUNT(*) FILTER (WHERE stage IN (0, 1, 4, 7)),
    'items_mastered', COUNT(*) FILTER (WHERE stage >= 30),
    'due_today', COUNT(*) FILTER (WHERE next_review_date <= NOW() AND is_archived = FALSE),
    'reviewed_this_week', (
      SELECT COUNT(*)
      FROM reviews r
      WHERE r.user_id = user_uuid
        AND r.created_at >= NOW() - INTERVAL '7 days'
    ),
    'success_rate', (
      SELECT ROUND(
        COALESCE(
          (COUNT(*) FILTER (WHERE success = TRUE)::FLOAT / NULLIF(COUNT(*), 0) * 100),
          0
        ), 2
      )
      FROM reviews r
      WHERE r.user_id = user_uuid
        AND r.created_at >= NOW() - INTERVAL '30 days'
    )
  ) INTO v_result
  FROM memory_items
  WHERE user_id = user_uuid AND is_archived = FALSE;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get calendar heatmap data
CREATE OR REPLACE FUNCTION get_calendar_heatmap(
  user_uuid UUID,
  days_back INT DEFAULT 90
)
RETURNS TABLE (
  date DATE,
  review_count INT,
  success_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.created_at::DATE AS date,
    COUNT(*)::INT AS review_count,
    COUNT(*) FILTER (WHERE r.success = TRUE)::INT AS success_count
  FROM reviews r
  WHERE r.user_id = user_uuid
    AND r.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY r.created_at::DATE
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update category item count
CREATE OR REPLACE FUNCTION update_category_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE categories
    SET item_count = item_count + 1
    WHERE id = NEW.category_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE categories
    SET item_count = item_count - 1
    WHERE id = OLD.category_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.category_id != OLD.category_id THEN
    UPDATE categories
    SET item_count = item_count - 1
    WHERE id = OLD.category_id;
    
    UPDATE categories
    SET item_count = item_count + 1
    WHERE id = NEW.category_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_item_count
AFTER INSERT OR UPDATE OR DELETE ON memory_items
FOR EACH ROW
EXECUTE FUNCTION update_category_count();

-- Function to update streak count
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  last_review_date DATE;
  today DATE := CURRENT_DATE;
BEGIN
  FOR user_record IN SELECT id FROM profiles LOOP
    -- Get the last review date
    SELECT MAX(created_at::DATE) INTO last_review_date
    FROM reviews
    WHERE user_id = user_record.id;
    
    IF last_review_date IS NULL THEN
      -- No reviews yet, streak is 0
      UPDATE profiles SET streak_count = 0 WHERE id = user_record.id;
    ELSIF last_review_date = today THEN
      -- Reviewed today, streak continues (don't increment if already counted)
      CONTINUE;
    ELSIF last_review_date = today - INTERVAL '1 day' THEN
      -- Reviewed yesterday, streak is maintained
      CONTINUE;
    ELSE
      -- Streak broken, reset to 0
      UPDATE profiles SET streak_count = 0 WHERE id = user_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to increment streak on review
CREATE OR REPLACE FUNCTION increment_streak_on_review()
RETURNS TRIGGER AS $$
DECLARE
  last_review_date DATE;
  today DATE := NEW.created_at::DATE;
BEGIN
  -- Get the date of the previous review
  SELECT MAX(created_at::DATE) INTO last_review_date
  FROM reviews
  WHERE user_id = NEW.user_id
    AND created_at < NEW.created_at;
  
  IF last_review_date IS NULL OR last_review_date < today THEN
    -- First review of the day, increment streak
    UPDATE profiles
    SET streak_count = streak_count + 1
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_created_update_streak
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION increment_streak_on_review();

-- Function to get study insights
CREATE OR REPLACE FUNCTION get_study_insights(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'best_time_of_day', (
      SELECT EXTRACT(HOUR FROM created_at)::INT AS hour
      FROM reviews
      WHERE user_id = user_uuid
      GROUP BY hour
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ),
    'average_session_duration', (
      SELECT ROUND(AVG(duration_seconds) / 60.0, 2)
      FROM reviews
      WHERE user_id = user_uuid AND duration_seconds IS NOT NULL
    ),
    'most_difficult_category', (
      SELECT c.name
      FROM categories c
      JOIN memory_items mi ON mi.category_id = c.id
      WHERE mi.user_id = user_uuid
      GROUP BY c.id, c.name
      ORDER BY AVG(mi.difficulty) DESC
      LIMIT 1
    ),
    'total_study_time_hours', (
      SELECT ROUND(SUM(duration_seconds) / 3600.0, 2)
      FROM reviews
      WHERE user_id = user_uuid
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
