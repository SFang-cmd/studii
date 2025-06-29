import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getQuestionsForPractice } from '@/utils/database';

export async function POST(request: NextRequest) {
  console.log('🔍 API /questions/fetch - Starting');
  
  try {
    // Get user authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    const body = await request.json();
    const { level, targetId, limit = 10 } = body;
    // const { excludeQuestionIds = [] } = body; // Disabled for now - implement later

    console.log('📥 Request parameters:');
    console.log('  - Level:', level);
    console.log('  - Target ID:', targetId);
    console.log('  - Limit:', limit);
    // console.log('  - Exclude question IDs count:', excludeQuestionIds.length); // Disabled

    // Use the existing getQuestionsForPractice function directly with the SQL function
    const questions = await getQuestionsForPractice({
      level: level as 'all' | 'subject' | 'domain' | 'skill',
      targetId: targetId,
      difficultyRange: [1, 7],
      limit: limit,
      excludeAnsweredQuestions: false, // Disabled for now - implement later
      userId: user.id
      // excludeQuestionIds: excludeQuestionIds // Disabled for now - implement later
    });

    console.log('📊 Database query results:');
    console.log('  - Questions fetched:', questions.length);
    
    if (questions.length > 0) {
      console.log('  - First question ID:', questions[0].id);
      console.log('  - Question types:', [...new Set(questions.map(q => q.question_type))]);
      console.log('  - Skill IDs:', [...new Set(questions.map(q => q.skill_id))]);
    }

    // Transform database questions to match the QuizQuestion interface
    const transformedQuestions = questions.map(q => ({
      id: q.id, // Preserve UUID
      question: q.question_text,
      stimulus: q.stimulus || undefined,
      type: "multiple-choice" as const,
      options: q.answer_options?.map(option => ({
        id: option.id,
        text: option.content
      })) || [],
      correctAnswer: q.correct_answers?.[0] || '',
      explanation: q.explanation || 'No explanation available.',
      category: level,
      difficultyBand: q.difficulty_band !== null ? q.difficulty_band : undefined,
      difficultyLetter: q.difficulty_letter !== null ? q.difficulty_letter : undefined,
      skillId: q.skill_id
    }));

    console.log('🔄 Transformed questions count:', transformedQuestions.length);
    console.log('✅ API /questions/fetch - Completed successfully');

    return NextResponse.json({
      success: true,
      questions: transformedQuestions,
      count: transformedQuestions.length
    });

  } catch (error) {
    console.error('💥 Error in /questions/fetch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}