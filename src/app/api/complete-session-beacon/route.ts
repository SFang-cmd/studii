import { NextRequest } from 'next/server';
import { completeQuizSession } from '@/utils/database';

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
    
    // Complete the quiz session without waiting for user authentication
    // This is a special case for the beacon API which needs to be fast
    await completeQuizSession(sessionId, {
      total_questions: totalQuestions,
      correct_answers: correctAnswers
    });
    
    // We don't need to return anything meaningful as beacon requests
    // don't process the response, but we'll return a success status
    return new Response('Success', { status: 200 });
    
  } catch (error) {
    console.error('Error in complete-session-beacon API:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
