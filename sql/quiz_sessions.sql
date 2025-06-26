-- Quiz Sessions Table
-- Tracks individual practice sessions when users take quizzes

CREATE TABLE quiz_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Session context
  session_type TEXT NOT NULL CHECK (session_type IN ('subject', 'domain', 'skill')),
  target_id TEXT NOT NULL, -- subject_id, domain_id, or skill_id depending on session_type
  
  -- Session timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Session results
  total_questions INTEGER DEFAULT 0 NOT NULL,
  correct_answers INTEGER DEFAULT 0 NOT NULL,
  time_spent_minutes INTEGER DEFAULT 0 NOT NULL,
  
  -- Session status
  is_completed BOOLEAN DEFAULT false NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX idx_quiz_sessions_target ON quiz_sessions(session_type, target_id);
CREATE INDEX idx_quiz_sessions_completed ON quiz_sessions(user_id, completed_at DESC) WHERE is_completed = true;
CREATE INDEX idx_quiz_sessions_recent ON quiz_sessions(user_id, started_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_quiz_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quiz_sessions_updated_at
  BEFORE UPDATE ON quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_sessions_updated_at();

-- Row Level Security (RLS)
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own quiz sessions
CREATE POLICY "Users can view their own quiz sessions" ON quiz_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quiz sessions" ON quiz_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz sessions" ON quiz_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quiz sessions" ON quiz_sessions
  FOR DELETE USING (auth.uid() = user_id);