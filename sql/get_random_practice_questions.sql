-- Function: get_random_practice_questions
-- Description: Efficiently fetches random practice questions filtered by level and target ID
-- This function uses PostgreSQL's RANDOM() function for true randomization at the database level
-- It also supports filtering by difficulty range and excluding already answered questions

CREATE OR REPLACE FUNCTION get_random_practice_questions(
  level_param TEXT,
  target_id_param TEXT,
  min_difficulty INT DEFAULT 1,
  max_difficulty INT DEFAULT 7,
  exclude_ids TEXT[] DEFAULT '{}',
  limit_param INT DEFAULT 10
)
RETURNS SETOF questions AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM questions 
  WHERE is_active = true
    AND difficulty_band >= min_difficulty
    AND difficulty_band <= max_difficulty
    AND (
      -- Filter based on level and target
      (level_param = 'all') OR
      (level_param = 'subject' AND subject_id = target_id_param) OR
      (level_param = 'domain' AND domain_id = target_id_param) OR
      (level_param = 'skill' AND skill_id = target_id_param)
    )
    AND (
      ARRAY_LENGTH(exclude_ids, 1) IS NULL 
      OR id::text NOT IN (SELECT UNNEST(exclude_ids))
    )
  ORDER BY RANDOM() 
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Usage examples:
-- Get 10 random questions for a specific skill
-- SELECT * FROM get_random_practice_questions('skill', 'skill-123', 1, 7, ARRAY[]::TEXT[], 10);

-- Get 5 random questions for a specific domain, excluding questions with IDs 1, 2, and 3
-- SELECT * FROM get_random_practice_questions('domain', 'domain-456', 1, 7, ARRAY['1','2','3'], 5);

-- Get 15 random questions for a specific subject with difficulty between 3 and 5
-- SELECT * FROM get_random_practice_questions('subject', 'subject-789', 3, 5, ARRAY[]::TEXT[], 15);

-- Get 20 random questions across all subjects/domains/skills
-- SELECT * FROM get_random_practice_questions('all', NULL, 1, 7, ARRAY[]::TEXT[], 20);
