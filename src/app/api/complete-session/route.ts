import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('=== SESSION COMPLETION DEBUG START ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ User authentication error:', userError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ Authenticated user:', user.id);

    // Parse request body
    const body = await request.json();
    console.log('📝 Request body received:', body);
    
    const { sessionId, total_questions, correct_answers, time_spent_minutes } = body;
    
    // Validate required fields
    if (!sessionId) {
      console.log('❌ Missing sessionId in request');
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
        { status: 400 }
      );
    }

    console.log('🎯 Session completion parameters:');
    console.log('  Session ID:', sessionId);
    console.log('  Total Questions:', total_questions || 0);
    console.log('  Correct Answers:', correct_answers || 0);
    console.log('  Time Spent (minutes):', time_spent_minutes || 0);

    // Call the SQL function to complete the quiz session
    console.log('🔄 Calling complete_quiz_session SQL function...');
    
    const { data: sessions, error: sessionError } = await supabase
      .rpc('complete_quiz_session', {
        p_session_id: sessionId,
        p_total_questions: total_questions || 0,
        p_correct_answers: correct_answers || 0,
        p_time_spent_minutes: time_spent_minutes || 0
      });

    if (sessionError) {
      console.log('❌ SQL function error:', sessionError);
      console.log('  Error details:', {
        message: sessionError.message,
        details: sessionError.details,
        hint: sessionError.hint,
        code: sessionError.code
      });
      return NextResponse.json(
        { error: 'Failed to complete session', details: sessionError.message },
        { status: 500 }
      );
    }

    console.log('📊 SQL function response:', sessions);

    // The function returns an array, get the first (and only) result
    const completedSession = sessions?.[0];
    
    if (!completedSession) {
      console.log('⚠️ No session returned from SQL function');
      console.log('  This could mean:');
      console.log('  - Session ID does not exist');
      console.log('  - Session does not belong to current user');
      console.log('  - Session was already completed');
      return NextResponse.json(
        { error: 'Session not found or already completed' },
        { status: 404 }
      );
    }

    const processingTime = Date.now() - startTime;
    
    console.log('✅ Session completed successfully!');
    console.log('📈 Completion stats:');
    console.log('  Session ID:', completedSession.id);
    console.log('  User ID:', completedSession.user_id);
    console.log('  Session Type:', completedSession.session_type);
    console.log('  Target ID:', completedSession.target_id);
    console.log('  Started At:', completedSession.started_at);
    console.log('  Completed At:', completedSession.completed_at);
    console.log('  Total Questions:', completedSession.total_questions);
    console.log('  Correct Answers:', completedSession.correct_answers);
    console.log('  Time Spent (min):', completedSession.time_spent_minutes);
    console.log('  Processing Time (ms):', processingTime);
    console.log('=== SESSION COMPLETION DEBUG END ===');

    return NextResponse.json({ 
      session: completedSession,
      debug: {
        processingTime,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.log('💥 Critical error in complete-session API:');
    console.log('  Error:', error);
    console.log('  Stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.log('  Processing Time (ms):', processingTime);
    console.log('=== SESSION COMPLETION DEBUG END (ERROR) ===');
    
    return NextResponse.json(
      { error: 'Internal server error', debug: { processingTime } },
      { status: 500 }
    );
  }
}