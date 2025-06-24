import NavBar from "@/components/shared/navbar";
import { QuizInterface } from "@/components/quiz/quiz-interface";
import { notFound } from "next/navigation";
import { getSkillById, getDomainById, getSubjectById } from "@/types/sat-structure";

// Dummy question data - will be replaced with database data
const generateSkillQuestions = (subjectId: string, domainId: string, skillId: string) => {
  return Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    question: `${skillId} focused question ${i + 1}. This question specifically targets this skill area.`,
    type: "multiple-choice" as const,
    imageUrl: subjectId === 'math' ? "/images/graph-example.png" : undefined,
    options: [
      { id: "A", text: "Option A - Skill-specific answer choice" },
      { id: "B", text: "Option B - Alternative skill application" },
      { id: "C", text: "Option C - Different approach to skill" },
      { id: "D", text: "Option D - Fourth skill-based option" }
    ],
    correctAnswer: ["A", "B", "C", "D"][i % 4],
    explanation: `This question specifically tests ${skillId}. The key concept being assessed is...`,
    category: skillId
  }));
};

interface SkillPracticePageProps {
  params: Promise<{
    subject: string;
    domain: string;
    skill: string;
  }>;
}

export default async function SkillPracticePage({ params }: SkillPracticePageProps) {
  const { subject, domain, skill } = await params;
  
  // Validate subject, domain, and skill
  const subjectData = getSubjectById(subject);
  if (!subjectData) {
    notFound();
  }
  
  const domainData = getDomainById(subject, domain);
  if (!domainData) {
    notFound();
  }
  
  const skillData = getSkillById(subject, domain, skill);
  if (!skillData) {
    notFound();
  }

  const questions = generateSkillQuestions(subject, domain, skill);
  const title = `${subjectData.name} - ${skillData.name}`;

  return (
    <div className="min-h-screen flex flex-col bg-columbia-blue">
      <NavBar />

      <main className="flex-1 px-6 md:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <QuizInterface 
            questions={questions}
            subject={subject}
            subjectTitle={title}
          />
        </div>
      </main>
    </div>
  );
}