import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Session completion request received');
    
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('Session completion failed: Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { sessionId, total_questions, correct_answers, time_spent_minutes } = await request.json();
    
    console.log('Session completion data:', {
      sessionId,
      total_questions: total_questions || 0,
      correct_answers: correct_answers || 0,
      time_spent_minutes: time_spent_minutes || 0
    });
    
    // Validate required fields
    if (!sessionId) {
      console.log('Session completion failed: Missing sessionId');
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
        { status: 400 }
      );
    }

    // Call the SQL function to complete the quiz session
    const { data: sessions, error: sessionError } = await supabase
      .rpc('complete_quiz_session', {
        p_session_id: sessionId,
        p_total_questions: total_questions || 0,
        p_correct_answers: correct_answers || 0,
        p_time_spent_minutes: time_spent_minutes || 0
      });

    if (sessionError) {
      console.log('Session completion SQL error:', sessionError.message);
      return NextResponse.json(
        { error: 'Failed to complete session' },
        { status: 500 }
      );
    }

    // The function returns an array, get the first (and only) result
    const completedSession = sessions?.[0];
    
    if (!completedSession) {
      console.log('Session completion failed: Session not found');
      return NextResponse.json(
        { error: 'Session not found or already completed' },
        { status: 404 }
      );
    }

    console.log('Session completed successfully:', completedSession.id);
    return NextResponse.json({ session: completedSession });
    
  } catch (error) {
    console.log('Session completion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}