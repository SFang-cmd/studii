-- Function to create a new quiz session
CREATE OR REPLACE FUNCTION create_quiz_session(
  p_user_id UUID,
  p_session_type TEXT,
  p_target_id TEXT
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  session_type TEXT,
  target_id TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_questions INT4,
  correct_answers INT4,
  time_spent_minutes INT4,
  is_completed BOOL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  RETURNING 
    quiz_sessions.id,
    quiz_sessions.user_id,
    quiz_sessions.session_type,
    quiz_sessions.target_id,
    quiz_sessions.started_at,
    quiz_sessions.completed_at,
    quiz_sessions.total_questions,
    quiz_sessions.correct_answers,
    quiz_sessions.time_spent_minutes,
    quiz_sessions.is_completed,
    quiz_sessions.created_at,
    quiz_sessions.updated_at;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_quiz_session(UUID, TEXT, TEXT) TO authenticated;