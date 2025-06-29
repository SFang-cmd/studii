-- Function to complete a quiz session with final stats
CREATE OR REPLACE FUNCTION complete_quiz_session(
  p_session_id UUID,
  p_total_questions INT4,
  p_correct_answers INT4,
  p_time_spent_minutes INT4
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
  UPDATE quiz_sessions 
  SET 
    completed_at = NOW(),
    total_questions = p_total_questions,
    correct_answers = p_correct_answers,
    time_spent_minutes = p_time_spent_minutes,
    is_completed = true,
    updated_at = NOW()
  WHERE quiz_sessions.id = p_session_id
    AND quiz_sessions.user_id = auth.uid() -- Ensure user can only complete their own sessions
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
GRANT EXECUTE ON FUNCTION complete_quiz_session(UUID, INT4, INT4, INT4) TO authenticated;