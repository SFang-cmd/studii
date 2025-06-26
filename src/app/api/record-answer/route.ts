import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { recordUserAnswer } from '@/utils/database';

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
      questionId,
      skillId,
      difficultyLevel,
      userAnswer,
      correctAnswer,
      isCorrect,
      timeSpentSeconds
    } = body;
    
    // Validate required fields
    if (!sessionId || !questionId || !skillId || userAnswer === undefined || !correctAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Record the answer
    const result = await recordUserAnswer({
      session_id: sessionId,
      question_id: questionId,
      skill_id: skillId,
      difficulty_level: difficultyLevel || 4,
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      is_correct: isCorrect,
      time_spent_seconds: timeSpentSeconds || 0
    });
    
    if (!result) {
      return NextResponse.json({ error: 'Failed to record answer' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, answerId: result.id });
    
  } catch (error) {
    console.error('Error in record-answer API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}