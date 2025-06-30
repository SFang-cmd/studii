-- Add sat_ibn column to questions table for old SAT questions
-- This column stores the Item Bank Number (ibn) for older SAT questions that don't have external_id

-- Add the column
ALTER TABLE questions 
ADD COLUMN sat_ibn TEXT;

-- Add index for performance (since we'll be querying on this field)
CREATE INDEX idx_questions_sat_ibn ON questions(sat_ibn);

-- Add unique constraint to prevent duplicate ibn entries
ALTER TABLE questions 
ADD CONSTRAINT unique_sat_ibn UNIQUE (sat_ibn);

-- Add comment for documentation
COMMENT ON COLUMN questions.sat_ibn IS 'SAT Item Bank Number for older questions that use ibn instead of external_id';

-- Optional: Check the new column was added correctly
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'questions' AND column_name = 'sat_ibn';