'use server';

import { createClient } from '@/utils/supabase/server';
import { updateQuizSession, completeQuizSession, updateStudyStreak } from '@/utils/database';
import { QuizSession } from '@/types/database';

/**
 * Server action to update an ongoing quiz session
 */
export async function updateQuizSessionProgress(
  sessionId: string,
  totalQuestions: number,
  correctAnswers: number
): Promise<QuizSession | null> {
  try {
    // Validate user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      return null;
    }
    
    // Update the session using our database utility
    const result = await updateQuizSession(sessionId, {
      total_questions: totalQuestions,
      correct_answers: correctAnswers
    });
    
    return result;
  } catch (error) {
    console.error('Error updating quiz session:', error);
    return null;
  }
}

/**
 * Server action to complete a quiz session
 */
export async function completeQuizSessionAction(
  sessionId: string,
  totalQuestions: number,
  correctAnswers: number
): Promise<QuizSession | null> {
  try {
    // Validate user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      return null;
    }
    
    // Complete the session using our database utility
    const result = await completeQuizSession(sessionId, {
      total_questions: totalQuestions,
      correct_answers: correctAnswers
    });
    
    // Update the user's study streak if they completed any questions
    if (totalQuestions > 0) {
      await updateStudyStreak(user.id);
    }
    
    return result;
  } catch (error) {
    console.error('Error completing quiz session:', error);
    return null;
  }
}
