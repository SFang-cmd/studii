import NavBar from "@/components/shared/navbar";
import { QuizInterface } from "@/components/quiz/quiz-interface";
import { notFound } from "next/navigation";
import { getSubjectById, getDomainById, getSkillById, SAT_STRUCTURE } from "@/types/sat-structure";

// Generate questions based on the practice level
const generateQuestions = (level: 'all' | 'subject' | 'domain' | 'skill', context: any) => {
  const questionCount = 10;
  let questionContext = '';
  let category = '';

  switch (level) {
    case 'all':
      questionContext = 'comprehensive SAT practice covering all subjects and domains';
      category = 'Mixed Practice';
      break;
    case 'subject':
      questionContext = `${context.subjectData.name} practice covering all domains`;
      category = context.subjectData.name;
      break;
    case 'domain':
      questionContext = `${context.domainData.name} practice within ${context.subjectData.name}`;
      category = context.domainData.name;
      break;
    case 'skill':
      questionContext = `${context.skillData.name} focused practice`;
      category = context.skillData.name;
      break;
  }

  return Array.from({ length: questionCount }, (_, i) => ({
    id: i + 1,
    question: `Question ${i + 1}: ${questionContext}. This question focuses on key concepts within this area.`,
    type: "multiple-choice" as const,
    imageUrl: context.ismath ? "/images/graph-example.png" : undefined,
    options: [
      { id: "A", text: "Option A - First possible answer" },
      { id: "B", text: "Option B - Second possible answer" },
      { id: "C", text: "Option C - Third possible answer" },
      { id: "D", text: "Option D - Fourth possible answer" }
    ],
    correctAnswer: ["A", "B", "C", "D"][i % 4],
    explanation: `This question tests your understanding of ${category}. The correct approach involves...`,
    category: category
  }));
};

interface PracticePageProps {
  params: Promise<{
    params?: string[];
  }>;
}

export default async function PracticePage({ params }: PracticePageProps) {
  const { params: routeParams } = await params;
  
  // Parse the route parameters
  let level: 'all' | 'subject' | 'domain' | 'skill' = 'all';
  let subjectId = '';
  let domainId = '';
  let skillId = '';
  let title = 'SAT Practice';

  if (!routeParams || routeParams.length === 0) {
    // /practice - All subjects
    level = 'all';
    title = 'SAT Practice - All Topics';
  } else if (routeParams.length === 1) {
    // /practice/math or /practice/english
    level = 'subject';
    subjectId = routeParams[0];
  } else if (routeParams.length === 2) {
    // /practice/math/algebra
    level = 'domain';
    subjectId = routeParams[0];
    domainId = routeParams[1];
  } else if (routeParams.length === 3) {
    // /practice/math/algebra/linear-equations-one-var
    level = 'skill';
    subjectId = routeParams[0];
    domainId = routeParams[1];
    skillId = routeParams[2];
  } else {
    notFound();
  }

  // Validate and get data based on level
  let context: any = { ismath: subjectId === 'math' };
  
  if (level === 'subject' || level === 'domain' || level === 'skill') {
    const subjectData = getSubjectById(subjectId);
    if (!subjectData) notFound();
    context.subjectData = subjectData;
    title = `${subjectData.name} Practice`;

    if (level === 'domain' || level === 'skill') {
      const domainData = getDomainById(subjectId, domainId);
      if (!domainData) notFound();
      context.domainData = domainData;
      title = `${subjectData.name} - ${domainData.name}`;

      if (level === 'skill') {
        const skillData = getSkillById(subjectId, domainId, skillId);
        if (!skillData) notFound();
        context.skillData = skillData;
        title = `${subjectData.name} - ${skillData.name}`;
      }
    }
  }

  const questions = generateQuestions(level, context);

  return (
    <div className="min-h-screen flex flex-col bg-columbia-blue">
      <NavBar />

      <main className="flex-1 px-6 md:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <QuizInterface 
            questions={questions}
            subject={subjectId || 'mixed'}
            subjectTitle={title}
          />
        </div>
      </main>
    </div>
  );
}