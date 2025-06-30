import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Recording answer:', body);
    
    // Destructure and validate required fields
    const {
      sessionId,
      questionId,
      skillId,
      difficultyLevel,
      userAnswer,
      correctAnswer,
      isCorrect,
      timeSpentSeconds,
      attemptNumber = 1
    } = body;
    
    // Validate required fields
    if (!sessionId || !questionId || !userAnswer || !correctAnswer) {
      console.log('❌ Missing required fields for answer recording');
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Call the SQL function to record the answer
    const { data, error } = await supabase.rpc('record_answer', {
      p_session_id: sessionId,
      p_question_id: questionId,
      p_skill_id: skillId,
      p_difficulty_level: difficultyLevel,
      p_user_answer: userAnswer,
      p_correct_answer: correctAnswer,
      p_is_correct: isCorrect,
      p_time_spent_seconds: timeSpentSeconds,
      p_attempt_number: attemptNumber
    });
    
    if (error) {
      console.error('❌ Error recording answer:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to record answer' },
        { status: 500 }
      );
    }
    
    console.log('✅ Answer recorded successfully:', data);
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Unexpected error in record-answer:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}