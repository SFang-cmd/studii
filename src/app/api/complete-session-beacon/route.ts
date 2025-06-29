import { NextRequest } from 'next/server';
import { completeQuizSessionAction } from '@/app/actions/quiz-session-actions';

/**
 * Special API endpoint designed to work with navigator.sendBeacon()
 * for reliable session completion during page unload events
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const {
      sessionId,
      totalQuestions,
      correctAnswers
    } = body;
    
    // Validate required fields
    if (!sessionId || totalQuestions === undefined || correctAnswers === undefined) {
      return new Response('Missing required fields', { status: 400 });
    }
    
    // Complete the session using server action
    await completeQuizSessionAction(
      sessionId,
      totalQuestions,
      correctAnswers
    );
    
    // Return success - beacon requests don't process responses
    return new Response('Success', { status: 200 });
    
  } catch (error) {
    console.error('Error in complete-session-beacon API:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
