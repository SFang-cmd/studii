import NavBar from "@/components/shared/navbar";
import { QuizInterface } from "@/components/quiz/quiz-interface";
import { notFound } from "next/navigation";
import { getDomainById, getSubjectById } from "@/types/sat-structure";

// Dummy question data - will be replaced with database data
const generateDomainQuestions = (subjectId: string, domainId: string) => {
  return Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    question: `${domainId} practice question ${i + 1}. This question focuses on key concepts within this domain.`,
    type: "multiple-choice" as const,
    imageUrl: subjectId === 'math' ? "/images/graph-example.png" : undefined,
    options: [
      { id: "A", text: "Option A - First possible answer" },
      { id: "B", text: "Option B - Second possible answer" },
      { id: "C", text: "Option C - Third possible answer" },
      { id: "D", text: "Option D - Fourth possible answer" }
    ],
    correctAnswer: ["A", "B", "C", "D"][i % 4],
    explanation: `This question tests your understanding of ${domainId}. The correct approach involves...`,
    category: domainId
  }));
};

interface DomainPracticePageProps {
  params: Promise<{
    subject: string;
    domain: string;
  }>;
}

export default async function DomainPracticePage({ params }: DomainPracticePageProps) {
  const { subject, domain } = await params;
  
  // Validate subject and domain
  const subjectData = getSubjectById(subject);
  if (!subjectData) {
    notFound();
  }
  
  const domainData = getDomainById(subject, domain);
  if (!domainData) {
    notFound();
  }

  const questions = generateDomainQuestions(subject, domain);
  const title = `${subjectData.name} - ${domainData.name}`;

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