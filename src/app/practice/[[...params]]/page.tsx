import NavBar from "@/components/shared/navbar";
import { QuizInterface, QuizQuestion } from "@/components/quiz/quiz-interface";
import { notFound } from "next/navigation";
import { getSubjectById, getDomainById, getSkillById } from "@/types/sat-structure";
import { createClient } from '@/utils/supabase/server'
import { getQuestionsForPractice, createQuizSession } from '@/utils/database'
import { Question } from '@/types/database'

// Simple fallback questions when database fetch fails
const generateFallbackQuestions = (level: string, context?: string): QuizQuestion[] => {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    question: "<p>Sample question ${i + 1}. Database questions could not be loaded.</p>",
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
    difficulty: 3,
    skillId: "fallback-skill"
  }));
};

/**
 * Server-side function to fetch questions directly from database
 * @param level - The level of practice (all, subject, domain, or skill)
 * @param target - The target identifier (subject ID, domain ID, or skill ID)
 * @param userId - The user's ID for tracking answered questions
 * @returns Array of questions for the practice session
 */
async function fetchQuestionsForLevel(
  level: 'all' | 'subject' | 'domain' | 'skill',
  target: string | undefined,
  userId: string
) {
  try {
    let contextName = '';
    
    // Get the name of the context for display purposes
    if (target) {
      switch (level) {
        case 'skill':
          const skillData = getSkillById(target);
          if (!skillData) return [];
          contextName = skillData.name;
          break;
          
        case 'domain':
          const domainData = getDomainById(target);
          if (!domainData) return [];
          contextName = domainData.name;
          break;
          
        case 'subject':
          const subjectData = getSubjectById(target);
          if (!subjectData) return [];
          contextName = subjectData.name;
          break;
      }
    } else if (level === 'all') {
      contextName = 'Mixed Practice';
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
    return questions.map(q => {
      // Debug logging for stimulus
      console.log(`Question ${q.id} has stimulus:`, Boolean(q.stimulus));
      if (q.stimulus) {
        console.log(`Stimulus preview for question ${q.id}:`, q.stimulus.substring(0, 50));
      }
      
      // Debug logging for difficulty values
      console.log(`Question ${q.id} difficulty values:`, {
        difficulty: q.difficulty,
        difficultyBand: q.difficulty_band,
        difficultyLetter: q.sat_difficulty_letter
      });
      
      return {
        id: typeof q.id === 'number' ? q.id : parseInt(q.id) || Math.floor(Math.random() * 10000),
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
        // Include all difficulty properties from the database
        difficulty: q.difficulty,
        // Convert null to undefined to match the QuizQuestion interface
        difficultyBand: q.difficulty_band !== null ? q.difficulty_band : undefined,
        difficultyLetter: q.sat_difficulty_letter !== null ? q.sat_difficulty_letter : undefined,
        skillId: q.skill_id
      };
    });

  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
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
export default async function PracticePage({ params }: PracticePageProps) {
  const { params: routeParams } = await params;
  
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
  let title = 'All Topics';
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

  // Validate IDs and set title based on level
  let contextName = 'All Topics';
  
  if (level === 'subject') {
    const subjectData = getSubjectById(subjectId);
    if (!subjectData) notFound();
    title = `${subjectData.name} Practice`;
    contextName = subjectData.name;
  } else if (level === 'domain') {
    const subjectData = getSubjectById(subjectId);
    const domainData = getDomainById(domainId);
    if (!subjectData || !domainData) notFound();
    title = `${subjectData.name} - ${domainData.name}`;
    contextName = domainData.name;
  } else if (level === 'skill') {
    const subjectData = getSubjectById(subjectId);
    const skillData = getSkillById(skillId);
    if (!subjectData || !skillData) notFound();
    title = `${subjectData.name} - ${skillData.name}`;
    contextName = skillData.name;
  }

  // Create quiz session for tracking
  let quizSession = null;
  try {
    // Determine session type and target
    const sessionType = level === 'all' ? 'subject' : level;
    const sessionTarget = level === 'skill' ? skillId : 
                         level === 'domain' ? domainId : 
                         level === 'subject' ? subjectId : 'all';
    
    // Always create a fresh session for each practice attempt
    if (sessionTarget !== 'all') {
      quizSession = await createQuizSession({
        user_id: user.id,
        session_type: sessionType as 'subject' | 'domain' | 'skill',
        target_id: sessionTarget
      });
    }
  } catch (error) {
    console.error('Error creating quiz session:', error);
    // Continue without session tracking if it fails
  }

  // Fetch questions from database
  let questions: QuizQuestion[] = [];
  try {
    console.log('=== PRACTICE PAGE DEBUG ===');
    console.log('Level:', level);
    console.log('Target:', target);
    console.log('User ID:', user.id);
    console.log('========================');
    
    questions = await fetchQuestionsForLevel(level, target || undefined, user.id);
    
    console.log('=== FETCHED QUESTIONS ===');
    console.log('Questions count:', questions.length);
    console.log('========================');
    
  } catch (error) {
    console.error('Error fetching database questions:', error);
  }

  // Fallback to generated questions if no database questions available
  if (questions.length === 0) {
    console.log('=== USING FALLBACK QUESTIONS ===');
    questions = generateFallbackQuestions(level, contextName);
  }

  return (
    <div className="min-h-screen flex flex-col bg-columbia-blue">
      <NavBar />

      <main className="flex-1 px-6 md:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <QuizInterface
            questions={questions}
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