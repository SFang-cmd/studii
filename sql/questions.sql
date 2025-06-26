-- Questions Table
-- Stores SAT question content from official site scraping and custom questions

CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Origin tracking
  origin_id TEXT NOT NULL DEFAULT 'custom', -- 'sat_official', 'custom', 'khan_academy', etc.
  external_id TEXT, -- SAT's external_id or other source ID
  source_question_id TEXT, -- SAT's questionId (short form)
  
  -- Content (HTML supported for rich formatting)
  question_text TEXT NOT NULL, -- SAT's 'stem' field
  stimulus TEXT, -- SAT's 'stimulus' - context/passage/figures
  question_type TEXT NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'grid_in', 'free_response')),
  
  -- SAT Classification
  skill_id TEXT NOT NULL, -- Maps to our SAT_STRUCTURE skill IDs
  sat_skill_code TEXT, -- Original SAT skill code (e.g., 'H.D.')
  sat_domain_code TEXT, -- SAT domain code (e.g., 'H' for Algebra)
  sat_program TEXT DEFAULT 'SAT', -- SAT, P10, P89
  
  -- Difficulty (use SAT's 1-7 scale directly)
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 7), -- SAT's 1-7 scale
  sat_difficulty_letter TEXT CHECK (sat_difficulty_letter IN ('E', 'M', 'H')), -- SAT's letter difficulty
  sat_score_band INTEGER CHECK (sat_score_band BETWEEN 1 AND 7), -- SAT's score_band_range_cd (1-7)
  
  -- Answer data (JSON for flexibility)
  answer_options JSONB, -- Array of {id, content, is_correct} for MCQ
  correct_answers TEXT[] NOT NULL, -- Array of correct answers ['C'] or ['2.5'] for grid-in
  explanation TEXT, -- SAT's 'rationale' field
  
  -- Metadata
  est_time_seconds INTEGER DEFAULT 90, -- Estimated time to solve
  tags TEXT[], -- Additional categorization ['word_problems', 'graphs']
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- SAT specific timestamps (when available)
  sat_create_date BIGINT, -- SAT's createDate timestamp
  sat_update_date BIGINT -- SAT's updateDate timestamp
);

-- Create indexes for performance
CREATE INDEX idx_questions_skill_id ON questions(skill_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX idx_questions_origin ON questions(origin_id);
CREATE INDEX idx_questions_active ON questions(is_active) WHERE is_active = true;
CREATE INDEX idx_questions_type_difficulty ON questions(question_type, difficulty_level);
CREATE INDEX idx_questions_skill_difficulty ON questions(skill_id, difficulty_level, is_active);
CREATE INDEX idx_questions_external_id ON questions(external_id) WHERE external_id IS NOT NULL;

-- GIN index for JSONB answer_options and tags array
CREATE INDEX idx_questions_answer_options ON questions USING GIN (answer_options);
CREATE INDEX idx_questions_tags ON questions USING GIN (tags);

-- Full text search on question content
CREATE INDEX idx_questions_search ON questions USING GIN (
  to_tsvector('english', question_text || ' ' || COALESCE(stimulus, ''))
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_questions_updated_at();

-- Row Level Security (RLS) - Questions are publicly readable but only admins can modify
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active questions
CREATE POLICY "All users can view active questions" ON questions
  FOR SELECT USING (is_active = true);

-- Only admin users can insert/update/delete questions (implement admin role later)
-- For now, allow all authenticated users to manage questions in development
CREATE POLICY "Authenticated users can manage questions" ON questions
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create a function to validate answer_options JSON structure
CREATE OR REPLACE FUNCTION validate_answer_options(options JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- For MCQ questions, validate the structure
  IF options IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if it's an array
  IF jsonb_typeof(options) != 'array' THEN
    RETURN FALSE;
  END IF;
  
  -- Validate each option has required fields
  RETURN (
    SELECT bool_and(
      option ? 'id' AND 
      option ? 'content' AND
      jsonb_typeof(option->'id') = 'string' AND
      jsonb_typeof(option->'content') = 'string'
    )
    FROM jsonb_array_elements(options) AS option
  );
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate answer_options JSON structure
ALTER TABLE questions 
ADD CONSTRAINT valid_answer_options 
CHECK (validate_answer_options(answer_options));