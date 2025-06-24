import NavBar from "@/components/shared/navbar";
import { QuizInterface } from "@/components/quiz/quiz-interface";
import { notFound } from "next/navigation";

// Dummy question data - will be replaced with database data
const dummyQuestions = {
  math: Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    question: `What system of linear equations is represented by the lines shown? (Question ${i + 1})`,
    type: "multiple-choice" as const,
    imageUrl: "/images/graph-example.png",
    options: [
      {
        id: "A",
        text: "8x + 4y = 32\n-10x - 4y = -64"
      },
      {
        id: "B", 
        text: "8x - 4y = 32\n-10x + 4y = -64"
      },
      {
        id: "C",
        text: "4x - 10y = 32\n-8x + 4y = -64"
      },
      {
        id: "D",
        text: "8x + 4y = 32\n10x - 4y = 64"
      }
    ],
    correctAnswer: ["A", "B", "C", "D"][i % 4], // Vary correct answers
    explanation: `Looking at the graph, we can identify the slopes and intercepts of both lines to determine the correct system of equations. This demonstrates ${['linear systems', 'algebraic thinking', 'graphical analysis', 'coordinate geometry'][i % 4]}.`,
    category: ['Linear Systems', 'Algebra', 'Graphing', 'Coordinate Geometry'][i % 4]
  })),
  english: [
    {
      id: 1,
      question: "Which sentence best demonstrates proper parallel structure?",
      type: "multiple-choice" as const,
      options: [
        {
          id: "A",
          text: "She likes reading, writing, and to paint."
        },
        {
          id: "B",
          text: "She likes reading, writing, and painting."
        },
        {
          id: "C", 
          text: "She likes to read, writing, and painting."
        },
        {
          id: "D",
          text: "She likes reading, to write, and painting."
        }
      ],
      correctAnswer: "B",
      explanation: "Parallel structure requires consistent grammatical forms. Option B uses three gerunds: reading, writing, and painting."
    }
  ]
};

interface PracticePageProps {
  params: Promise<{
    subject: string;
  }>;
}

export default async function PracticePage({ params }: PracticePageProps) {
  const { subject } = await params;
  
  // Validate subject
  if (!['math', 'english'].includes(subject)) {
    notFound();
  }

  const questions = dummyQuestions[subject as keyof typeof dummyQuestions];
  const subjectTitle = subject.charAt(0).toUpperCase() + subject.slice(1);

  return (
    <div className="min-h-screen flex flex-col bg-columbia-blue">
      <NavBar />

      <main className="flex-1 px-6 md:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <QuizInterface 
            questions={questions}
            subject={subject}
            subjectTitle={subjectTitle}
          />
        </div>
      </main>
    </div>
  );
}