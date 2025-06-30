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

// Quiz Sessions Types
export interface QuizSession {
  id: string;
  user_id: string;
  session_type: 'all' | 'subject' | 'domain' | 'skill';
  target_id: string;
  started_at: string;
  completed_at: string | null;
  total_questions: number;
  correct_answers: number;
  time_spent_minutes: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizSessionInsert {
  user_id: string;
  session_type: 'all' | 'subject' | 'domain' | 'skill';
  target_id: string;
  started_at?: string;
  total_questions?: number;
  correct_answers?: number;
  time_spent_minutes?: number;
  is_completed?: boolean;
}

export interface QuizSessionUpdate {
  completed_at?: string;
  total_questions?: number;
  correct_answers?: number;
  time_spent_minutes?: number;
  is_completed?: boolean;
}

// User Session Answers Types
export interface UserSessionAnswer {
  id: string;
  session_id: string;
  question_id: string;
  skill_id: string;
  difficulty_level: number;
  user_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  time_spent_seconds: number;
  attempt_number: number;
  answered_at: string;
  created_at: string;
}

export interface UserSessionAnswerInsert {
  session_id: string;
  question_id: string;
  skill_id: string;
  difficulty_level: number;
  user_answer?: string;
  correct_answer: string;
  is_correct: boolean;
  time_spent_seconds?: number;
  attempt_number?: number;
}

export interface UserSessionAnswerUpdate {
  user_answer?: string;
  is_correct?: boolean;
  time_spent_seconds?: number;
  attempt_number?: number;
}

// Questions Types
export interface AnswerOption {
  id: string;
  content: string;
  is_correct?: boolean; // Optional for flexibility
}

export interface Question {
  id: string;
  origin: string;
  sat_external_id: string | null; // SAT API external_id
  question_text: string;
  stimulus: string | null;
  question_type: string; // 'mcq' | 'spr'
  skill_id: string;
  domain_id: string;
  subject_id: string;
  sat_program: string | null;
  difficulty_band: number | null;
  difficulty_letter: string | null;
  answer_options: AnswerOption[] | null;
  correct_answers: string[];
  explanation: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionInsert {
  origin?: string;
  sat_external_id?: string; // SAT API external_id
  question_text: string;
  stimulus?: string;
  question_type?: 'mcq' | 'spr';
  skill_id: string;
  domain_id?: string;
  subject_id?: string;
  sat_program?: string;
  difficulty_band?: number;
  difficulty_letter?: string;
  answer_options?: AnswerOption[];
  correct_answers: string[];
  explanation?: string;
  is_active?: boolean;
}

export interface QuestionUpdate {
  origin?: string;
  sat_external_id?: string; // SAT API external_id
  question_text?: string;
  stimulus?: string;
  question_type?: 'mcq' | 'spr';
  skill_id?: string;
  domain_id?: string;
  subject_id?: string;
  sat_program?: string;
  difficulty_band?: number;
  difficulty_letter?: string;
  answer_options?: AnswerOption[];
  correct_answers?: string[];
  explanation?: string;
  is_active?: boolean;
}

// ==================== USER PROFILES ====================

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  study_goal_score: number | null;
  preferred_subjects: string[];
  study_time_goal_minutes: number;
  study_streak_days: number;
  longest_streak_days: number;
  total_study_days: number;
  notifications_enabled: boolean;
  email_reminders: boolean;
  progress_reports: boolean;
  onboarding_completed: boolean;
  last_login_at: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfileInsert {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  study_goal_score?: number;
  preferred_subjects?: string[];
  study_time_goal_minutes?: number;
  study_streak_days?: number;
  longest_streak_days?: number;
  total_study_days?: number;
  notifications_enabled?: boolean;
  email_reminders?: boolean;
  progress_reports?: boolean;
  onboarding_completed?: boolean;
  last_login_at?: string;
  timezone?: string;
}

export interface UserProfileUpdate {
  display_name?: string;
  avatar_url?: string;
  study_goal_score?: number;
  preferred_subjects?: string[];
  study_time_goal_minutes?: number;
  study_streak_days?: number;
  longest_streak_days?: number;
  total_study_days?: number;
  notifications_enabled?: boolean;
  email_reminders?: boolean;
  progress_reports?: boolean;
  onboarding_completed?: boolean;
  last_login_at?: string;
  timezone?: string;
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
      quiz_sessions: {
        Row: QuizSession;
        Insert: QuizSessionInsert;
        Update: QuizSessionUpdate;
      };
      user_session_answers: {
        Row: UserSessionAnswer;
        Insert: UserSessionAnswerInsert;
        Update: UserSessionAnswerUpdate;
      };
      questions: {
        Row: Question;
        Insert: QuestionInsert;
        Update: QuestionUpdate;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
      };
    };
  };
}