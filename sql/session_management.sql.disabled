
-- ==================== QUIZ SESSION MANAGEMENT FUNCTIONS ====================

-- Function to start a new quiz session
-- This creates a new session with the current timestamp
-- Returns the created session
CREATE OR REPLACE FUNCTION start_quiz_session(
  p_user_id UUID,
  p_session_type TEXT,
  p_target_id TEXT
) RETURNS SETOF quiz_sessions AS $$
BEGIN
  RETURN QUERY
  INSERT INTO quiz_sessions (
    user_id,
    session_type,
    target_id,
    started_at,
    total_questions,
    correct_answers,
    time_spent_minutes,
    is_completed
  ) VALUES (
    p_user_id,
    p_session_type,
    p_target_id,
    NOW(),
    0,
    0,
    0,
    false
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update quiz session progress during a session
-- Updates total questions, correct answers, and recalculates time spent
-- Returns the updated session
CREATE OR REPLACE FUNCTION update_quiz_session_progress(
  p_session_id UUID,
  p_total_questions INTEGER,
  p_correct_answers INTEGER
) RETURNS SETOF quiz_sessions AS $$
BEGIN
  RETURN QUERY
  UPDATE quiz_sessions
  SET 
    total_questions = p_total_questions,
    correct_answers = p_correct_answers,
    time_spent_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
  WHERE id = p_session_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a quiz session
-- Sets completed_at timestamp, marks session as completed, and calculates final time spent
-- Returns the completed session
CREATE OR REPLACE FUNCTION complete_quiz_session(
  p_session_id UUID,
  p_total_questions INTEGER,
  p_correct_answers INTEGER
) RETURNS SETOF quiz_sessions AS $$
BEGIN
  RETURN QUERY
  UPDATE quiz_sessions
  SET 
    completed_at = NOW(),
    is_completed = true,
    total_questions = p_total_questions,
    correct_answers = p_correct_answers,
    time_spent_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
  WHERE id = p_session_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active (incomplete) quiz session for a user
-- Returns the most recent active session or null if none exists
CREATE OR REPLACE FUNCTION get_active_quiz_session(
  p_user_id UUID
) RETURNS SETOF quiz_sessions AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM quiz_sessions
  WHERE user_id = p_user_id
    AND is_completed = false
  ORDER BY started_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a specific quiz session by ID (with user validation)
-- Returns the session if it belongs to the user and exists
CREATE OR REPLACE FUNCTION get_quiz_session(
  p_session_id UUID,
  p_user_id UUID
) RETURNS SETOF quiz_sessions AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM quiz_sessions
  WHERE id = p_session_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's quiz session statistics
-- Returns aggregated statistics about user's quiz sessions
CREATE OR REPLACE FUNCTION get_user_session_stats(
  p_user_id UUID
) RETURNS TABLE (
  total_sessions BIGINT,
  completed_sessions BIGINT,
  total_questions_answered BIGINT,
  total_correct_answers BIGINT,
  average_accuracy NUMERIC,
  total_time_spent_minutes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_sessions,
    COUNT(*) FILTER (WHERE is_completed = true)::BIGINT AS completed_sessions,
    SUM(total_questions)::BIGINT AS total_questions_answered,
    SUM(correct_answers)::BIGINT AS total_correct_answers,
    CASE 
      WHEN SUM(total_questions) > 0 THEN 
        (SUM(correct_answers)::NUMERIC / SUM(total_questions)::NUMERIC) * 100
      ELSE 0
    END AS average_accuracy,
    SUM(time_spent_minutes)::BIGINT AS total_time_spent_minutes
  FROM quiz_sessions
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;