import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { completeQuizSession, updateStudyStreak } from '@/utils/database';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const {
      sessionId,
      totalQuestions,
      correctAnswers,
      timeSpentMinutes
    } = body;
    
    // Validate required fields
    if (!sessionId || totalQuestions === undefined || correctAnswers === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Complete the quiz session
    const result = await completeQuizSession(sessionId, {
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      time_spent_minutes: timeSpentMinutes || 0
    });
    
    if (!result) {
      return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 });
    }
    
    // Update user's study streak if they completed any questions
    if (totalQuestions > 0) {
      await updateStudyStreak(user.id);
    }
    
    return NextResponse.json({ 
      success: true, 
      sessionId: result.id,
      finalStats: {
        totalQuestions,
        correctAnswers,
        accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
        timeSpentMinutes
      }
    });
    
  } catch (error) {
    console.error('Error in complete-session API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}