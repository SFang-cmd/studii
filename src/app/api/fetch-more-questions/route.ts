import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getQuestionsForPractice } from '@/utils/database';
import { getSubjectById, getSkillHierarchy, getDomainHierarchy } from "@/types/sat-structure";

/**
 * API endpoint to fetch more questions for continuous practice
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const {
      level,
      target,
      excludedQuestionIds = [] // Question IDs to exclude (already seen)
    } = body;
    
    if (!level || !target) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Determine context name and title based on level and target
    let contextName = '';
    let title = '';
    
    // Get the name of the context and generate title
    switch (level) {
      case 'skill':
        const skillData = getSkillHierarchy(target);
        if (!skillData) return NextResponse.json({ error: 'Invalid skill ID' }, { status: 400 });
        contextName = skillData.skill.name;
        title = `${skillData.subject.name} - ${contextName}`;
        break;

      case 'domain':
        const domainData = getDomainHierarchy(target);
        if (!domainData) return NextResponse.json({ error: 'Invalid domain ID' }, { status: 400 });
        contextName = domainData.domain.name;
        title = `${domainData.subject.name} - ${contextName}`;
        break;

      case 'subject':
        const subjectData = getSubjectById(target);
        if (!subjectData) return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 });
        contextName = subjectData.name;
        title = contextName;
        break;

      case 'all':
        contextName = 'Mixed Practice';
        title = 'All Topics';
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
    }
    
    // Use the consolidated function to fetch questions
    const questions = await getQuestionsForPractice({
      level,
      targetId: target,
      difficultyRange: [1, 7],
      limit: 10,
      excludeAnsweredQuestions: true,
      userId: user.id,
      excludeQuestionIds: excludedQuestionIds // Exclude questions that have already been shown
    }) || [];
    
    // Transform database questions to match the QuizQuestion interface
    const mappedQuestions = questions.map(q => {
      return {
        id: q.id, // Preserve the original UUID from database
        question: q.question_text,
        stimulus: q.stimulus || undefined,
        type: "multiple-choice",
        options: q.answer_options?.map(option => ({
          id: option.id,
          text: option.content
        })) || [],
        correctAnswer: q.correct_answers?.[0] || '',
        explanation: q.explanation || 'No explanation available.',
        category: contextName,
        difficultyBand: q.difficulty_band !== null ? q.difficulty_band : undefined,
        difficultyLetter: q.difficulty_letter !== null ? q.difficulty_letter : undefined,
        skillId: q.skill_id
      };
    });
    
    // Generate fallback questions if no database questions available
    if (mappedQuestions.length === 0) {
      const fallbackQuestions = Array.from({ length: 5 }, (_, i) => ({
        id: `api-fallback-${level}-${target}-${i + 1}`, // Use string IDs instead of numbers
        question: `<p>Sample question ${i + 1}. No more database questions available.</p>`,
        type: "multiple-choice" as const,
        options: [
          { id: "A", text: "<p>Option A</p>" },
          { id: "B", text: "<p>Option B</p>" },
          { id: "C", text: "<p>Option C</p>" },
          { id: "D", text: "<p>Option D</p>" }
        ],
        correctAnswer: "A",
        explanation: "This is a placeholder question. You've completed all available questions for this topic.",
        category: contextName,
        difficultyBand: 3,
        skillId: "fallback-skill"
      }));
      
      return NextResponse.json({
        questions: fallbackQuestions,
        contextName,
        title,
        isFallback: true
      });
    }
    
    return NextResponse.json({
      questions: mappedQuestions,
      contextName,
      title,
      isFallback: false
    });
    
  } catch (error) {
    console.error('Error fetching more questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
