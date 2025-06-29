import { NextRequest } from 'next/server';
import { completeQuizSessionAction } from '@/app/actions/quiz-session-actions';

/**
 * Special API endpoint designed to work with navigator.sendBeacon()
 * for reliable session completion during page unload events
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[BEACON DEBUG] Received beacon request:', {
      url: request.url,
      headers: Object.fromEntries(request.headers),
      referrer: request.headers.get('referer') || 'none'
    });
    
    // Parse the request body
    const body = await request.json();
    const {
      sessionId,
      totalQuestions,
      correctAnswers,
      isRealExit = true // Default to true for backward compatibility with existing beacon calls
    } = body;
    
    console.log('[BEACON DEBUG] Request body:', {
      ...body,
      isRealExit // Log whether this is a real exit
    });
    
    // Validate required fields
    if (!sessionId || totalQuestions === undefined || correctAnswers === undefined) {
      console.error('[BEACON ERROR] Missing required fields in request');
      return new Response('Missing required fields', { status: 400 });
    }
    
    // Only complete the session if this is a real exit (page unload)
    // This prevents accidental completion during navigation
    if (isRealExit) {
      await completeQuizSessionAction(
        sessionId,
        totalQuestions,
        correctAnswers,
        true // Force completion since this is a true exit
      );
      
      console.log(`Beacon API: Forced completion of session ${sessionId} with ${totalQuestions} questions answered`);
    } else {
      console.log(`Beacon API: Skipping completion for session ${sessionId} - not a real exit`);
    }
    
    // We don't need to return anything meaningful as beacon requests
    // don't process the response, but we'll return a success status
    return new Response('Success', { status: 200 });
    
  } catch (error) {
    console.error('Error in complete-session-beacon API:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
