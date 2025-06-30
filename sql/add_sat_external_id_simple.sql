-- Simple schema update: Add sat_external_id field to questions table
-- This replaces the complex SQL function approach with a simple field addition

-- Add the new column
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS sat_external_id TEXT;

-- Create unique index for fast lookups and prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_sat_external_id_unique 
ON questions(sat_external_id) 
WHERE sat_external_id IS NOT NULL;

-- Add comment to document the field
COMMENT ON COLUMN questions.sat_external_id IS 'SAT API external_id field for direct question identification from College Board API';

-- Optional: Clean up any existing test data if needed
-- UPDATE questions 
-- SET sat_external_id = NULL 
-- WHERE origin = 'sat_official' AND sat_external_id IS NOT NULL;