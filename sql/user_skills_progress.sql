-- User skill progress tracking table (CORRECTED)
CREATE TABLE user_skill_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill_id TEXT NOT NULL,
  current_score INTEGER NOT NULL DEFAULT 0,
  questions_attempted INTEGER NOT NULL DEFAULT 0,
  questions_correct INTEGER NOT NULL DEFAULT 0,
  time_spent_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one record per user per skill
  UNIQUE(user_id, skill_id)
);

-- Add RLS (Row Level Security)
ALTER TABLE user_skill_progress ENABLE ROW LEVEL SECURITY;

-- Users can only see their own progress
CREATE POLICY "Users can view own progress" ON user_skill_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress" ON user_skill_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress" ON user_skill_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_skill_progress_user_id ON user_skill_progress(user_id);
CREATE INDEX idx_user_skill_progress_skill_id ON user_skill_progress(skill_id);
CREATE INDEX idx_user_skill_progress_updated_at ON user_skill_progress(updated_at);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_skill_progress_updated_at
  BEFORE UPDATE ON user_skill_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
