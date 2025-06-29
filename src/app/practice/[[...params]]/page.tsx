import NavBar from "@/components/shared/navbar";
import QuizInterface from "@/components/quiz/quiz-interface-v2";
import { QuizQuestion } from "@/components/quiz/quiz-interface-v2";
import { notFound } from "next/navigation";
import { getSubjectById, getSkillHierarchy, getDomainHierarchy } from "@/types/sat-structure";
import { createClient } from '@/utils/supabase/server'
import { getQuestionsForPractice, createQuizSession, validateQuizSession } from '@/utils/database'
import { Question } from '@/types/database'

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
    const questions: Question[] = await getQuestionsForPractice({
      level,
      targetId: target,
      difficultyRange: [1, 7],
      limit: 10,
      excludeAnsweredQuestions: true,
      userId
    }) || [];
    
    // Transform database questions to match the QuizQuestion interface
    const mappedQuestions = questions.map(q => {
      return {
        id: q.id, // Preserve the original UUID from database
        question: q.question_text,
        stimulus: q.stimulus || undefined,  // Correctly map stimulus to stimulus
        type: "multiple-choice" as const,
        options: q.answer_options?.map(option => ({
          id: option.id,
          text: option.content
        })) || [],
        correctAnswer: q.correct_answers?.[0] || '',
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
  params: {
    params?: string[];
  };
  searchParams?: {
    sessionId?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Unified practice page component that handles all practice routes:
 * - /practice (all subjects)
 * - /practice/[subject] (subject-specific practice)
 * - /practice/[subject]/[domain] (domain-specific practice)
 * - /practice/[subject]/[domain]/[skill] (skill-specific practice)
 */
export default async function PracticePage(props: PracticePageProps) {
  // Fix Next.js warnings by using the recommended approach
  // This ensures we're not accessing dynamic params synchronously
  const resolvedProps = props;
  const routeParams = resolvedProps.params.params;
  
  // Check if we have an existing session ID in the URL
  const existingSessionId = resolvedProps.searchParams?.sessionId;
  
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

  // Create quiz session for tracking if one doesn't already exist
  let quizSession = null;
  try {
    // Determine session target based on level
    const sessionTarget = level === 'skill' ? skillId : 
                         level === 'domain' ? domainId : 
                         level === 'subject' ? subjectId : 'all';
    
    if (existingSessionId) {
      // Validate that the session belongs to the current user
      const isValidSession = await validateQuizSession(existingSessionId, user.id);
      
      if (isValidSession) {
        // Use the existing session from URL parameter
        console.log('Using existing quiz session from URL:', existingSessionId);
        quizSession = { id: existingSessionId };
      } else {
        // Session doesn't belong to this user or doesn't exist - create a new one
        console.warn('Invalid session ID provided, creating new session');
        quizSession = await createQuizSession({
          user_id: user.id,
          session_type: level as 'all' | 'subject' | 'domain' | 'skill',
          target_id: sessionTarget
        });
      }
    } else {
      // Create a new session
      quizSession = await createQuizSession({
        user_id: user.id,
        session_type: level as 'all' | 'subject' | 'domain' | 'skill',
        target_id: sessionTarget
      });
    }
  } catch (error) {
    console.error('Error handling quiz session:', error);
    // Continue without session tracking if it fails
  }

  // Fetch questions from database
  console.log('=== PRACTICE PAGE DEBUG ===');
  console.log('Level:', level);
  console.log('Target:', target);
  console.log('User ID:', user.id);
  console.log('========================');
  
  const { questions, contextName, title } = await fetchQuestionsForLevel(level, target, user.id);
  
  console.log('=== FETCHED QUESTIONS ===');
  console.log('Questions count:', questions.length);
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
            sessionId={quizSession?.id}
            userId={user.id}
            sessionType={level === 'all' ? 'overall' : level as 'skill' | 'domain' | 'subject'}
          />
        </div>
      </main>
    </div>
  );
}