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
  correctAnswers: number,
  forceComplete: boolean = false // Parameter to force completion regardless of other conditions
): Promise<QuizSession | null> {
  try {
    // Validate user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      return null;
    }
    
    // Get the current stack trace to analyze the call source
    const stack = new Error().stack || '';
    
    // Check for server rendering patterns in the stack trace
    const isServerRendering = (
      stack.includes('renderToHTMLOrFlightImpl') || 
      stack.includes('app-page-turbo.runtime') ||
      stack.includes('renderToHTML') ||
      stack.includes('renderToResponse')
    );
    
    // Only complete the session if explicitly forced AND not during server rendering
    if (forceComplete && !isServerRendering) {
      console.log(`Completing session ${sessionId} with ${totalQuestions} questions (force=${forceComplete}, serverRendering=${isServerRendering})`);
      
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
    } else {
      // Log why we're skipping completion
      const reason = !forceComplete ? 'not forced' : 'server rendering detected';
      console.log(`Skipping completion for session ${sessionId} - ${reason}`);
      return null;
    }
  } catch (error) {
    console.error('Error completing quiz session:', error);
    return null;
  }
}
