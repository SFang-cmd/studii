-- Function to update multiple user skill scores at once
-- This function takes a JSON object with skill_id -> score mappings
-- and updates the user_skill_progress table with security checks

CREATE OR REPLACE FUNCTION update_user_skills(
  p_skill_scores JSONB
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_skill_id TEXT;
  v_score INTEGER;
  v_updated_count INTEGER := 0;
  v_skill_record RECORD;
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
  
  -- Loop through each skill score in the JSON object
  FOR v_skill_record IN 
    SELECT key as skill_id, value::INTEGER as score 
    FROM jsonb_each_text(p_skill_scores)
  LOOP
    v_skill_id := v_skill_record.skill_id;
    v_score := v_skill_record.score;
    
    -- Clamp score to valid range (0-800)
    v_score := GREATEST(0, LEAST(800, v_score));
    
    -- Upsert the skill progress record
    INSERT INTO user_skill_progress (
      user_id,
      skill_id, 
      current_score,
      updated_at
    ) VALUES (
      v_user_id,
      v_skill_id,
      v_score,
      NOW()
    )
    ON CONFLICT (user_id, skill_id) 
    DO UPDATE SET
      current_score = v_score,
      updated_at = NOW();
    
    v_updated_count := v_updated_count + 1;
  END LOOP;
  
  -- Return success with count of updated skills
  RETURN json_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'message', format('Updated %s skill scores successfully', v_updated_count)
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error if anything goes wrong
  RETURN json_build_object(
    'success', false,
    'error', 'Failed to update skill scores: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a single user skill score
CREATE OR REPLACE FUNCTION update_user_skill(
  p_skill_id TEXT,
  p_score INTEGER
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_clamped_score INTEGER;
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
  
  -- Clamp score to valid range (0-800)
  v_clamped_score := GREATEST(0, LEAST(800, p_score));
  
  -- Upsert the skill progress record
  INSERT INTO user_skill_progress (
    user_id,
    skill_id, 
    current_score,
    updated_at
  ) VALUES (
    v_user_id,
    p_skill_id,
    v_clamped_score,
    NOW()
  )
  ON CONFLICT (user_id, skill_id) 
  DO UPDATE SET
    current_score = v_clamped_score,
    updated_at = NOW();
  
  -- Return success with the updated score
  RETURN json_build_object(
    'success', true,
    'skill_id', p_skill_id,
    'score', v_clamped_score,
    'message', 'Skill score updated successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error if anything goes wrong
  RETURN json_build_object(
    'success', false,
    'error', 'Failed to update skill score: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user skill scores for a list of skill IDs
CREATE OR REPLACE FUNCTION get_user_skills(
  p_skill_ids TEXT[]
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_skill_scores JSONB;
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
  
  -- Build the skill scores JSON using a proper join
  SELECT jsonb_object_agg(requested_skills.skill_id, COALESCE(usp.current_score, 200))
  INTO v_skill_scores
  FROM unnest(p_skill_ids) AS requested_skills(skill_id)
  LEFT JOIN user_skill_progress usp 
    ON usp.user_id = v_user_id 
    AND usp.skill_id = requested_skills.skill_id;
  
  -- Return success with skill scores
  RETURN json_build_object(
    'success', true,
    'skill_scores', v_skill_scores
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error if anything goes wrong
  RETURN json_build_object(
    'success', false,
    'error', 'Failed to get skill scores: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_skills(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_skill(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_skills(TEXT[]) TO authenticated;