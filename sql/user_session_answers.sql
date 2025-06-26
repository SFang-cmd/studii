-- User Session Answers Table
-- Tracks individual question attempts within quiz sessions

CREATE TABLE user_session_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID NOT NULL, -- Will reference questions table when created
  
  -- Question context
  skill_id TEXT NOT NULL, -- Which skill this question tests
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  
  -- User response
  user_answer TEXT, -- User's selected answer (A, B, C, D, or text for free response)
  correct_answer TEXT NOT NULL, -- Correct answer
  is_correct BOOLEAN NOT NULL,
  
  -- Performance tracking
  time_spent_seconds INTEGER DEFAULT 0 NOT NULL,
  attempt_number INTEGER DEFAULT 1 NOT NULL, -- For retry functionality
  
  -- Metadata
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_session_answers_session_id ON user_session_answers(session_id);
CREATE INDEX idx_session_answers_skill ON user_session_answers(skill_id, is_correct);
CREATE INDEX idx_session_answers_question ON user_session_answers(question_id);
CREATE INDEX idx_session_answers_user_performance ON user_session_answers(session_id, answered_at);
CREATE INDEX idx_session_answers_difficulty ON user_session_answers(skill_id, difficulty_level, is_correct);

-- Row Level Security (RLS)
ALTER TABLE user_session_answers ENABLE ROW LEVEL SECURITY;

-- Users can only access answers from their own quiz sessions
CREATE POLICY "Users can view their own session answers" ON user_session_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_sessions 
      WHERE quiz_sessions.id = user_session_answers.session_id 
      AND quiz_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create answers for their own sessions" ON user_session_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_sessions 
      WHERE quiz_sessions.id = user_session_answers.session_id 
      AND quiz_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own session answers" ON user_session_answers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quiz_sessions 
      WHERE quiz_sessions.id = user_session_answers.session_id 
      AND quiz_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own session answers" ON user_session_answers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM quiz_sessions 
      WHERE quiz_sessions.id = user_session_answers.session_id 
      AND quiz_sessions.user_id = auth.uid()
    )
  );