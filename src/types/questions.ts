export interface Question {
  id: string | number;
  question: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation: string;
  stimulus?: string;
  imageUrl?: string; // Added for compatibility with QuizQuestion
  type?: 'multiple-choice' | 'free-response'; // Added for compatibility with QuizQuestion
  skillId?: string;
  skillName?: string;
  domainId?: string;
  domainName?: string;
  subjectId?: string;
  subjectName?: string;
  // Difficulty fields from database schema
  difficultyBand?: number; // Numeric difficulty band (1-7) used for calculations
  difficultyLetter?: string; // Letter difficulty (E/M/H) used for display
  category?: string; // Added for compatibility with QuizQuestion
  tags?: string[];
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizSession {
  id: string;
  user_id: string;
  session_type: 'all' | 'subject' | 'domain' | 'skill';
  target_id: string;
  start_time: string;
  end_time?: string;
  is_completed: boolean;
  total_questions?: number;
  correct_answers?: number;
  time_spent_minutes?: number;
}

export interface QuizSessionInsert {
  user_id: string;
  session_type: 'all' | 'subject' | 'domain' | 'skill';
  target_id: string;
}

export interface QuizSessionUpdate {
  is_completed?: boolean;
  total_questions?: number;
  correct_answers?: number;
  time_spent_minutes?: number;
}
