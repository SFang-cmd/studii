-- Function to record a single user answer in a quiz session
-- This function inserts a new record into user_session_answers table
-- with security checks to ensure user can only record answers for their own sessions

CREATE OR REPLACE FUNCTION record_answer(
  p_session_id UUID,
  p_question_id UUID,
  p_skill_id TEXT,
  p_difficulty_level INTEGER,
  p_user_answer TEXT,
  p_correct_answer TEXT,
  p_is_correct BOOLEAN,
  p_time_spent_seconds INTEGER DEFAULT NULL,
  p_attempt_number INTEGER DEFAULT 1
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_answer_id UUID;
BEGIN
  -- Get the current user ID from auth
  SELECT auth.uid() INTO v_user_id;
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;
  
  -- Verify the session belongs to the current user
  IF NOT EXISTS (
    SELECT 1 FROM quiz_sessions 
    WHERE id = p_session_id 
    AND user_id = v_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Session not found or access denied'
    );
  END IF;
  
  -- Insert the answer record
  INSERT INTO user_session_answers (
    session_id,
    question_id,
    skill_id,
    difficulty_level,
    user_answer,
    correct_answer,
    is_correct,
    time_spent_seconds,
    attempt_number,
    answered_at
  ) VALUES (
    p_session_id,
    p_question_id,
    p_skill_id,
    p_difficulty_level,
    p_user_answer,
    p_correct_answer,
    p_is_correct,
    p_time_spent_seconds,
    p_attempt_number,
    NOW()
  ) RETURNING id INTO v_answer_id;
  
  -- Return success with the answer ID
  RETURN json_build_object(
    'success', true,
    'answer_id', v_answer_id,
    'message', 'Answer recorded successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error if anything goes wrong
  RETURN json_build_object(
    'success', false,
    'error', 'Failed to record answer: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION record_answer TO authenticated;