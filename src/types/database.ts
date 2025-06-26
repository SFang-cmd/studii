// Database schema types for Supabase

export interface UserSkillProgress {
  id: string;
  user_id: string;
  skill_id: string;
  current_score: number; // 0-800 scale to match SAT_STRUCTURE
  questions_attempted: number;
  questions_correct: number;
  time_spent_minutes: number;
  created_at: string;
  updated_at: string;
}

// Insert type (excludes auto-generated fields)
export interface UserSkillProgressInsert {
  user_id: string;
  skill_id: string;
  current_score: number;
  questions_attempted?: number;
  questions_correct?: number;
  time_spent_minutes?: number;
}

// Update type (all fields optional except id)
export interface UserSkillProgressUpdate {
  current_score?: number;
  questions_attempted?: number;
  questions_correct?: number;
  time_spent_minutes?: number;
}

// Database schema for Supabase client
export interface Database {
  public: {
    Tables: {
      user_skill_progress: {
        Row: UserSkillProgress;
        Insert: UserSkillProgressInsert;
        Update: UserSkillProgressUpdate;
      };
    };
  };
}