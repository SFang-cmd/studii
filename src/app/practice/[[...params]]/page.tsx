import NavBar from "@/components/shared/navbar";
import QuizInterface from "@/components/quiz/quiz-interface-v2";
import { QuizQuestion } from "@/components/quiz/quiz-interface-v2";
import { notFound } from "next/navigation";
import { getSubjectById, getSkillHierarchy, getDomainHierarchy } from "@/types/sat-structure";
import { createClient } from '@/utils/supabase/server'
import { getQuestionsForPractice } from '@/utils/database'
import { Question } from '@/types/database'
import { SupabaseClient } from '@supabase/supabase-js';

// Simple fallback questions when database fetch fails
const generateFallbackQuestions = (level: string, context?: string): QuizQuestion[] => {
  return Array.from({ length: 5 }, (_, i) => ({
    id: `fallback-${level}-${i + 1}`, // Use string IDs instead of numbers
    question: `<p>Sample question ${i + 1}. Database questions could not be loaded.</p>`,
    type: "multiple-choice" as const,
    options: [
      { id: "A", text: "<p>Option A</p>" },
      { id: "B", text: "<p>Option B</p>" },
      { id: "C", text: "<p>Option C</p>" },
      { id: "D", text: "<p>Option D</p>" }
    ],
    correctAnswer: "A",
    explanation: "This is a placeholder question. Please try refreshing the page.",
    category: context || "Practice",
    difficultyBand: 3,
    skillId: "fallback-skill"
  }));
};

/**
 * Server-side function to create a quiz session
 * @param level - The level of practice (all, subject, domain, or skill)
 * @param target - The target identifier (subject ID, domain ID, or skill ID)
 * @param userId - The user's ID for the session
 * @returns The created session object
 */
async function createQuizSession(
  level: 'all' | 'subject' | 'domain' | 'skill',
  target: string,
  userId: string,
  supabase: SupabaseClient
): Promise<{
  id: string;
  user_id: string;
  session_type: 'all' | 'subject' | 'domain' | 'skill';
  target_id: string;
  start_time: string;
  end_time: string | null;
  total_questions: number;
  questions_answered: number;
  questions_correct: number;
  created_at: string;
} | null> {
  try {
    // Use the level directly as session_type since schema supports 'all'
    const sessionType = level;
    const targetId = target;
    
    const { data: sessions, error } = await supabase
      .rpc('create_quiz_session', {
        p_user_id: userId,
        p_session_type: sessionType,
        p_target_id: targetId
      });

    if (error) {
      console.error('Error creating session:', error);
      return null;
    }

    return sessions?.[0] || null;
  } catch (error) {
    console.error('Error in createQuizSession:', error);
    return null;
  }
}

/**
 * Server-side function to fetch questions directly from database
 * @param level - The level of practice (all, subject, domain, or skill)
 * @param target - The target identifier (subject ID, domain ID, or skill ID)
 * @param userId - The user's ID for tracking answered questions
 * @returns Object containing questions array and contextName for the practice session
 */
async function fetchQuestionsForLevel(
  level: 'all' | 'subject' | 'domain' | 'skill',
  target: string,
  userId: string
): Promise<{ questions: QuizQuestion[], contextName: string, title: string }> {
  try {
    let contextName = '';
    let title = '';
    
    // Get the name of the context and generate title
    switch (level) {
      case 'skill':
        const skillData = getSkillHierarchy(target);
        if (!skillData) return { questions: [], contextName: 'Practice', title: 'Practice' };
        contextName = skillData.skill.name;
        title = `${skillData.subject.name} - ${contextName}`;
        break;

      case 'domain':
        const domainData = getDomainHierarchy(target);
        if (!domainData) return { questions: [], contextName: 'Practice', title: 'Practice' };
        contextName = domainData.domain.name;
        title = `${domainData.subject.name} - ${contextName}`;
        break;

      case 'subject':
        const subjectData = getSubjectById(target);
        if (!subjectData) return { questions: [], contextName: 'Practice', title: 'Practice' };
        contextName = subjectData.name;
        title = contextName;
        break;

      case 'all':
        contextName = 'Mixed Practice';
        title = 'All Topics';
        break;
    }
    
    // Use the consolidated function to fetch questions
    console.log('🔍 CALLING getQuestionsForPractice with:', {
      level,
      targetId: target,
      difficultyRange: [1, 7],
      limit: 10,
      excludeAnsweredQuestions: true,
      userId
    });
    
    const questions: Question[] = await getQuestionsForPractice({
      level,
      targetId: target,
      difficultyRange: [1, 7],
      limit: 10,
      excludeAnsweredQuestions: true,
      userId
    }) || [];
    
    console.log('📊 getQuestionsForPractice returned:', questions.length, 'questions');
    
    // Transform database questions to match the QuizQuestion interface
    const mappedQuestions = questions.map(q => {
      console.log('Mapping question:', q.id, 'Type:', q.question_type);
      
      // Determine question type
      const questionType = q.question_type === 'spr' ? 'free-response' as const : 'multiple-choice' as const;
      console.log('Mapped question type:', questionType);
      
      // For multiple-choice questions, randomize options
      let options: Array<{id: string, text: string, originalId?: string}> = [];
      let correctAnswer = '';
      
      if (questionType === 'multiple-choice') {
        // Randomize answer options and assign letter choices
        const shuffledOptions = q.answer_options ? [...q.answer_options].sort(() => Math.random() - 0.5) : [];
        const letterChoices = ['A', 'B', 'C', 'D'];
        
        // Map shuffled options to letter choices
        options = shuffledOptions.map((option, index) => ({
          id: letterChoices[index],
          text: option.content,
          originalId: option.id // Keep original ID for correctness checking
        }));
        
        // Find correct answer by matching original database ID to new letter choice
        const correctOriginalId = q.correct_answers?.[0] || '';
        const correctAnswerOption = options.find(opt => opt.originalId === correctOriginalId);
        correctAnswer = correctAnswerOption?.id || 'A'; // Default to A if not found
        
        // Remove originalId from final output
        options = options.map(opt => ({ id: opt.id, text: opt.text }));
      } else {
        // For SPR questions, use empty options array and join all correct answers with commas
        options = [];
        correctAnswer = q.correct_answers?.join(',') || '';
        console.log('SPR correct answers:', correctAnswer);
      }
      
      return {
        id: q.id, // Preserve the original UUID from database
        question: q.question_text,
        stimulus: q.stimulus || undefined,  // Correctly map stimulus to stimulus
        type: questionType,
        options: options,
        correctAnswer,
        explanation: q.explanation || 'No explanation available.',
        category: contextName,
        // Convert null to undefined to match the QuizQuestion interface
        difficultyBand: q.difficulty_band !== null ? q.difficulty_band : undefined,
        difficultyLetter: q.difficulty_letter !== null ? q.difficulty_letter : undefined,
        skillId: q.skill_id
      };
    });
    
    return {
      questions: mappedQuestions,
      contextName,
      title
    };

  } catch (error) {
    console.error('Error fetching questions:', error);
    return {
      questions: [],
      contextName: level === 'all' ? 'All Topics' : 'Practice',
      title: level === 'all' ? 'All Topics' : 'Practice'
    };
  }
}

/**
 * Props for the PracticePage component
 */
interface PracticePageProps {
  params: Promise<{
    params?: string[];
  }>;
}

/**
 * Unified practice page component that handles all practice routes:
 * - /practice (all subjects)
 * - /practice/[subject] (subject-specific practice)
 * - /practice/[subject]/[domain] (domain-specific practice)
 * - /practice/[subject]/[domain]/[skill] (skill-specific practice)
 */
export default async function PracticePage(props: PracticePageProps) {
  // Await params as required by Next.js 15
  const resolvedParams = await props.params;
  const routeParams = resolvedParams.params;
  
  // Get user from session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    notFound();
  }
  
  // Parse the route parameters
  let level: 'all' | 'subject' | 'domain' | 'skill' = 'all';
  let subjectId = '';
  let domainId = '';
  let skillId = '';
  let target = '';

  if (!routeParams || routeParams.length === 0) {
    // /practice - All subjects
    level = 'all';
    target = 'all';
  } else if (routeParams.length === 1) {
    // /practice/math or /practice/english
    level = 'subject';
    subjectId = routeParams[0];
    target = subjectId;
  } else if (routeParams.length === 2) {
    // /practice/math/algebra
    level = 'domain';
    subjectId = routeParams[0];
    domainId = routeParams[1];
    target = domainId;
  } else if (routeParams.length === 3) {
    // /practice/math/algebra/linear-equations-one-var
    level = 'skill';
    subjectId = routeParams[0];
    domainId = routeParams[1];
    skillId = routeParams[2];
    target = skillId;
  } else {
    notFound();
  }

  // Create quiz session
  console.log('=== PRACTICE PAGE DEBUG ===');
  console.log('Level:', level);
  console.log('Target:', target);
  console.log('User ID:', user.id);
  console.log('========================');
  
  const session = await createQuizSession(level, target, user.id, supabase);
  
  if (!session) {
    console.error('Failed to create quiz session');
    notFound();
  }
  
  console.log('=== CREATED SESSION ===');
  console.log('Session ID:', session.id);
  console.log('Session Type:', session.session_type);
  console.log('Target ID:', session.target_id);
  console.log('======================');

  // Fetch questions from database
  const { questions, contextName, title } = await fetchQuestionsForLevel(level, target, user.id);
  
  console.log('=== FETCHED QUESTIONS ===');
  console.log('Questions count:', questions.length);
  if (questions.length > 0) {
    console.log('First question ID:', questions[0].id);
    console.log('First question type:', questions[0].type);
    console.log('First question has options:', questions[0].options.length);
    console.log('Question source types:', [...new Set(questions.map(q => q.id.includes('fallback') ? 'fallback' : 'database'))]);
  }
  console.log('========================');

  // Fallback to generated questions if no database questions available
  let processedQuestions = questions;
  if (questions.length === 0) {
    console.log('=== USING FALLBACK QUESTIONS ===');
    processedQuestions = generateFallbackQuestions(level, contextName);
  }

  return (
    <div className="min-h-screen flex flex-col bg-columbia-blue">
      <NavBar />

      <main className="flex-1 px-6 md:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <QuizInterface
            questions={processedQuestions}
            subject={level === 'subject' && target ? target : 'all'}
            subjectTitle={title}
            userId={user.id}
            sessionId={session.id}
            sessionLevel={level}
            sessionTargetId={target}
          />
        </div>
      </main>
    </div>
  );
}