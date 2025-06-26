-- User Profiles Table
-- Extended user data beyond Supabase auth

CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Profile customization
  display_name TEXT, -- User's preferred display name (defaults to email prefix)
  avatar_url TEXT, -- Profile picture URL
  
  -- Study preferences and goals
  study_goal_score INTEGER CHECK (study_goal_score BETWEEN 400 AND 1600), -- Target SAT score
  preferred_subjects TEXT[] DEFAULT '{}', -- ['math', 'english'] - focus areas
  study_time_goal_minutes INTEGER DEFAULT 30, -- Daily study goal in minutes
  
  -- Progress tracking
  study_streak_days INTEGER DEFAULT 0, -- Current consecutive days studied
  longest_streak_days INTEGER DEFAULT 0, -- Best streak ever achieved
  total_study_days INTEGER DEFAULT 0, -- Total days user has studied
  
  -- Notifications and settings
  notifications_enabled BOOLEAN DEFAULT true,
  email_reminders BOOLEAN DEFAULT true, -- Daily study reminders
  progress_reports BOOLEAN DEFAULT true, -- Weekly progress emails
  
  -- Account metadata
  onboarding_completed BOOLEAN DEFAULT false, -- Has completed initial setup
  last_login_at TIMESTAMP WITH TIME ZONE,
  timezone TEXT DEFAULT 'UTC', -- User's timezone for scheduling
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_goal_score ON user_profiles(study_goal_score);
CREATE INDEX idx_user_profiles_streak ON user_profiles(study_streak_days DESC);
CREATE INDEX idx_user_profiles_last_login ON user_profiles(last_login_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Row Level Security (RLS) - Users can only see/modify their own profile
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view and modify only their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE USING (user_id = auth.uid());

-- Function to automatically create profile for new users
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create profile when user signs up
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Function to update streak when user completes study session
CREATE OR REPLACE FUNCTION update_study_streak(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  profile_record user_profiles%ROWTYPE;
  last_study_date DATE;
  today DATE := CURRENT_DATE;
BEGIN
  -- Get current profile
  SELECT * INTO profile_record FROM user_profiles WHERE user_id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get last study date from quiz_sessions
  SELECT MAX(DATE(started_at)) INTO last_study_date
  FROM quiz_sessions 
  WHERE user_id = user_uuid AND is_completed = true;
  
  -- Update streak logic
  IF last_study_date = today THEN
    -- Already studied today, no streak change
    RETURN;
  ELSIF last_study_date = today - INTERVAL '1 day' THEN
    -- Studied yesterday, increment streak
    UPDATE user_profiles SET 
      study_streak_days = study_streak_days + 1,
      longest_streak_days = GREATEST(longest_streak_days, study_streak_days + 1),
      total_study_days = total_study_days + 1,
      updated_at = NOW()
    WHERE user_id = user_uuid;
  ELSIF last_study_date < today - INTERVAL '1 day' OR last_study_date IS NULL THEN
    -- Streak broken or first study, reset to 1
    UPDATE user_profiles SET 
      study_streak_days = 1,
      longest_streak_days = GREATEST(longest_streak_days, 1),
      total_study_days = total_study_days + 1,
      updated_at = NOW()
    WHERE user_id = user_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql;