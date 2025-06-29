-- Migration to add 'all' as a valid session_type in quiz_sessions table

-- First, drop the existing constraint
ALTER TABLE quiz_sessions 
DROP CONSTRAINT IF EXISTS quiz_sessions_session_type_check;

-- Add the new constraint that includes 'all'
ALTER TABLE quiz_sessions 
ADD CONSTRAINT quiz_sessions_session_type_check 
CHECK (session_type IN ('subject', 'domain', 'skill', 'all'));

-- Update any existing functions that might have hardcoded the session types
-- (No need to update start_quiz_session as it accepts any TEXT value)
