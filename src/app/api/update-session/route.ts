import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { updateQuizSession } from '@/utils/database';

export async function POST(request: Request) {
  try {
    // Validate user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const { sessionId, totalQuestions, correctAnswers } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }
    
    // Update the session
    const updatedSession = await updateQuizSession(sessionId, {
      total_questions: totalQuestions,
      correct_answers: correctAnswers
    });
    
    return NextResponse.json({ 
      success: true, 
      session: updatedSession 
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ 
      error: 'Failed to update session' 
    }, { status: 500 });
  }
}
