-- Add sat_external_id field to questions table
-- This field will store the SAT API's external_id for direct question identification

-- Add the new column
ALTER TABLE questions 
ADD COLUMN sat_external_id TEXT UNIQUE;

-- Create index for fast lookups by SAT external ID
CREATE INDEX idx_questions_sat_external_id ON questions(sat_external_id) 
WHERE sat_external_id IS NOT NULL;

-- Add comment to document the field
COMMENT ON COLUMN questions.sat_external_id IS 'SAT API external_id field for direct question identification from College Board API';

-- Create a function to check if a question exists by SAT external ID
CREATE OR REPLACE FUNCTION question_exists_by_sat_external_id(p_sat_external_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM questions 
    WHERE sat_external_id = p_sat_external_id 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Update the existing import function to handle sat_external_id
CREATE OR REPLACE FUNCTION import_sat_question_with_external_id(
  p_question_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_question_id UUID;
  v_skill_id TEXT;
  v_sat_skill_code TEXT;
  v_difficulty_level INTEGER;
  v_answer_options JSONB;
  v_correct_answers TEXT[];
BEGIN
  -- Extract SAT skill code and map to internal skill_id
  v_sat_skill_code := p_question_data->>'skill_cd';
  
  -- Use the existing skill mapping (this will need to be implemented as a SQL function)
  -- For now, we'll handle the mapping in the application layer
  v_skill_id := p_question_data->>'skill_id'; -- Should be pre-mapped in application
  
  -- Extract difficulty level (SAT's 1-7 scale)
  v_difficulty_level := COALESCE((p_question_data->>'score_band_range_cd')::INTEGER, 
                                 (p_question_data->>'difficulty_level')::INTEGER, 
                                 3);
  
  -- Process answer options
  v_answer_options := p_question_data->'answer_options';
  
  -- Extract correct answers
  v_correct_answers := ARRAY(
    SELECT jsonb_array_elements_text(
      COALESCE(p_question_data->'keys', p_question_data->'correct_answers', '[]'::jsonb)
    )
  );
  
  -- Insert the question
  INSERT INTO questions (
    origin_id,
    external_id,
    sat_external_id,  -- New field
    source_question_id,
    question_text,
    stimulus,
    question_type,
    skill_id,
    sat_skill_code,
    sat_domain_code,
    sat_program,
    difficulty_level,
    sat_difficulty_letter,
    sat_score_band,
    answer_options,
    correct_answers,
    explanation,
    est_time_seconds,
    sat_create_date,
    sat_update_date,
    is_active
  ) VALUES (
    COALESCE(p_question_data->>'origin_id', 'sat_official'),
    p_question_data->>'external_id',
    p_question_data->>'external_id',  -- Store SAT external_id in new field
    p_question_data->>'questionId',
    p_question_data->>'stem',
    p_question_data->>'stimulus',
    COALESCE(p_question_data->>'type', 'mcq'),
    v_skill_id,
    v_sat_skill_code,
    p_question_data->>'domain_cd',
    COALESCE(p_question_data->>'program', 'SAT'),
    v_difficulty_level,
    p_question_data->>'difficulty_letter',
    (p_question_data->>'score_band_range_cd')::INTEGER,
    v_answer_options,
    v_correct_answers,
    p_question_data->>'rationale',
    COALESCE((p_question_data->>'est_time_seconds')::INTEGER, 90),
    (p_question_data->>'createDate')::BIGINT,
    (p_question_data->>'updateDate')::BIGINT,
    COALESCE((p_question_data->>'is_active')::BOOLEAN, true)
  )
  ON CONFLICT (sat_external_id) DO UPDATE SET
    -- Update existing questions if they already exist
    question_text = EXCLUDED.question_text,
    stimulus = EXCLUDED.stimulus,
    answer_options = EXCLUDED.answer_options,
    explanation = EXCLUDED.explanation,
    sat_update_date = EXCLUDED.sat_update_date,
    updated_at = NOW()
  RETURNING id INTO v_question_id;
  
  RETURN v_question_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION question_exists_by_sat_external_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION import_sat_question_with_external_id(JSONB) TO authenticated;