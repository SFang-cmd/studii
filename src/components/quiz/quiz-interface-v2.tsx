'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionCard } from './question-card';
import { QuizProgressBar } from './quiz-progress-bar';
import { AnswerExplanation } from './answer-explanation';
import { QuizSummary } from './quiz-summary';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string; // UUID from database
  question: string;
  stimulus?: string;
  type: 'multiple-choice' | 'free-response';
  imageUrl?: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation: string;
  category?: string;
  difficultyBand?: number;
  difficultyLetter?: string;
  skillId?: string;
  subjectName?: string;
  domainName?: string;
  skillName?: string;
}

export interface QuizInterfaceProps {
  questions: QuizQuestion[];
  subject: string;
  subjectTitle: string;
  userId?: string;
  sessionId?: string;
}

export default function QuizInterface({
  questions: initialQuestions,
  subjectTitle,
  userId,
  sessionId
}: QuizInterfaceProps): React.ReactNode {
  // Core quiz state
  const [currentSet, setCurrentSet] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizState, setQuizState] = useState<'question' | 'explanation' | 'summary'>('question');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  
  // Question management
  const [allQuestionSets, setAllQuestionSets] = useState<QuizQuestion[][]>([initialQuestions]);
  const [seenQuestionIds, setSeenQuestionIds] = useState<Set<string>>(new Set());
  const [isLoadingNextSet, setIsLoadingNextSet] = useState(false);
  
  // Session tracking for completion
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const questionStartTime = useRef<number>(Date.now());
  const sessionStartTime = useRef<number>(Date.now());
  const hasSessionCompleted = useRef<boolean>(false);

  // Current question data
  const currentQuestions = allQuestionSets[currentSet] || [];
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const isLastQuestionInSet = currentQuestionIndex === currentQuestions.length - 1;
  
  // Get answered questions for current set only
  const currentSetAnswers = Object.fromEntries(
    Object.entries(selectedAnswers).filter(([id]) => 
      currentQuestions.some(q => q.id === id)
    )
  );
  
  // Track progress for current set by index (for progress bar)
  const answeredIndices = new Set<string>();
  const incorrectIndices = new Set<string>();
  
  currentQuestions.forEach((question, index) => {
    if (currentSetAnswers[question.id]) {
      answeredIndices.add(index.toString());
      if (question.correctAnswer !== currentSetAnswers[question.id]) {
        incorrectIndices.add(index.toString());
      }
    }
  });
  
  const allCurrentSetCompleted = currentQuestions.length > 0 && 
    answeredIndices.size === currentQuestions.length;
  
  // Session completion removed - no persistence needed

  // No session cleanup needed



  // Track seen questions
  useEffect(() => {
    if (currentQuestion) {
      setSeenQuestionIds(prev => new Set([...prev, currentQuestion.id]));
    }
  }, [currentQuestion]);

  // Simple session completion function
  const completeSession = useCallback(async () => {
    if (!sessionId || hasSessionCompleted.current) {
      return;
    }

    console.log('Completing quiz session:', sessionId);
    hasSessionCompleted.current = true;
    const timeSpentMinutes = Math.round((Date.now() - sessionStartTime.current) / 1000 / 60);

    const sessionData = {
      sessionId,
      total_questions: totalAnswered,
      correct_answers: totalCorrect,
      time_spent_minutes: timeSpentMinutes
    };

    console.log('Session completion data:', sessionData);

    try {
      // Use sendBeacon for reliability during page unload
      if (navigator.sendBeacon) {
        const success = navigator.sendBeacon('/api/complete-session', JSON.stringify(sessionData));
        console.log('sendBeacon result:', success);
      } else {
        // Fallback to fetch if sendBeacon not available
        console.log('Using fetch for session completion');
        const response = await fetch('/api/complete-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData),
        });
        console.log('Fetch response status:', response.status);
      }
    } catch (error) {
      console.log('Session completion error:', error);
    }
  }, [sessionId, totalAnswered, totalCorrect]);

  // Session completion on page exit
  useEffect(() => {
    const handlePageExit = (event: Event) => {
      console.log('Page exit event triggered:', event.type);
      completeSession();
    };

    // Listen for browser page unload events (covers refreshes, tab close, browser close)
    window.addEventListener('beforeunload', handlePageExit);
    window.addEventListener('pagehide', handlePageExit);

    return () => {
      window.removeEventListener('beforeunload', handlePageExit);
      window.removeEventListener('pagehide', handlePageExit);
    };
  }, [completeSession]);

  // Handle navigation away from current page
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if clicked element is a navigation link
      const link = target.closest('a[href]');
      if (link && !hasSessionCompleted.current) {
        const href = link.getAttribute('href');
        console.log('Navigation link clicked to:', href);
        completeSession();
      }
    };

    // Listen for clicks on navigation links
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [completeSession]);



  
  // Fetch next question set - simplified without session
  const fetchMoreQuestions = useCallback(async () => {
    setIsLoadingNextSet(true);
    
    try {
      // For now, just generate fallback questions
      // TODO: Implement proper question fetching without sessions
      const fallbackQuestions = Array.from({ length: 10 }, (_, i) => ({
        id: `set-${Date.now()}-${i}`,
        question: `<p>Additional question ${i + 1}. More questions coming soon!</p>`,
        type: "multiple-choice" as const,
        options: [
          { id: "A", text: "<p>Option A</p>" },
          { id: "B", text: "<p>Option B</p>" },
          { id: "C", text: "<p>Option C</p>" },
          { id: "D", text: "<p>Option D</p>" }
        ],
        correctAnswer: "A",
        explanation: "This is a placeholder question.",
        category: "Practice",
        difficultyBand: 3,
        skillId: "fallback-skill"
      }));
      
      setAllQuestionSets(prev => [...prev, fallbackQuestions]);
      return true;
    } catch (error) {
      console.error('Error fetching questions:', error);
      return false;
    } finally {
      setIsLoadingNextSet(false);
    }
  }, [seenQuestionIds]);

  // Prefetch next set when approaching end of current set
  useEffect(() => {
    if (isLastQuestionInSet && 
        quizState === 'question' && 
        !allQuestionSets[currentSet + 1] && 
        !isLoadingNextSet) {
      fetchMoreQuestions();
    }
  }, [currentQuestionIndex, quizState, currentSet, isLoadingNextSet, allQuestionSets, fetchMoreQuestions, isLastQuestionInSet]);



  const handleNextSet = async () => {
    // Ensure next set is available
    if (!allQuestionSets[currentSet + 1]) {
      await fetchMoreQuestions();
    }
    
    // Move to next set
    setCurrentSet(prev => prev + 1);
    setCurrentQuestionIndex(0);
    setQuizState('question');
  };

  const handleQuestionClick = (questionIndex: number) => {
    if (allCurrentSetCompleted) {
      setCurrentQuestionIndex(questionIndex);
      setQuizState('question');
    }
  };

  const handleAnswerSelect = (questionId: string, selectedOption: string) => {
    if (quizState !== 'question') return;
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: selectedOption
    }));
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !selectedAnswers[currentQuestion.id]) return;
    
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);
    const isCorrect = selectedAnswers[currentQuestion.id] === currentQuestion.correctAnswer;
    
    // Update session tracking stats
    setTotalAnswered(prev => prev + 1);
    if (isCorrect) {
      setTotalCorrect(prev => prev + 1);
    }
    
    // Answer recording removed - will be reimplemented later
    
    setQuizState('explanation');
    questionStartTime.current = Date.now();
  };

  const handleNextFromExplanation = () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuizState('question');
    } else {
      // End of current set - show summary
      setQuizState('summary');
    }
    questionStartTime.current = Date.now();
  };


  // Render based on quiz state
  if (quizState === 'summary') {
    return (
      <QuizSummary
        questions={currentQuestions}
        currentSet={currentSet}
        selectedAnswers={currentSetAnswers}
        onNextSet={handleNextSet}
        quizType="overall"
        isLoadingNextSet={isLoadingNextSet}
      />
    );
  }

  if (quizState === 'explanation') {
    return (
      <div>
        {/* Header */}
        <div className="flex items-center mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-paynes-gray mb-1">
              {subjectTitle} Practice
            </h1>
            <p className="text-glaucous">
              Question {currentQuestionIndex + 1} of {currentQuestions.length}
            </p>
          </div>
          <div className="flex-1 flex justify-center">
            <QuizProgressBar
              currentQuestion={currentQuestionIndex}
              totalQuestions={currentQuestions.length}
              answeredQuestions={answeredIndices}
              incorrectAnswers={incorrectIndices}
              onQuestionClick={handleQuestionClick}
              allowNavigation={allCurrentSetCompleted}
            />
          </div>
          <div className="flex-1"></div>
        </div>
        
        <AnswerExplanation
          question={currentQuestion}
          selectedAnswer={selectedAnswers[currentQuestion.id]}
          onNext={handleNextFromExplanation}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <h1 className="text-3xl font-bold text-paynes-gray mb-1">
        {subjectTitle} Practice
      </h1>
      <div className="flex items-center mb-6">
        <div className="flex-1">
          <p className="text-glaucous">
            Question {currentQuestionIndex + 1} of {currentQuestions.length}
          </p>
        </div>
        <div className="flex-1 flex justify-center">
          <QuizProgressBar
            currentQuestion={currentQuestionIndex}
            totalQuestions={currentQuestions.length}
            answeredQuestions={answeredIndices}
            incorrectAnswers={incorrectIndices}
            onQuestionClick={handleQuestionClick}
            allowNavigation={allCurrentSetCompleted}
          />
        </div>
        <div className="flex-1"></div>
      </div>

      <div className="max-w-4xl mx-auto">
        <QuestionCard
          question={currentQuestion}
          selectedAnswer={selectedAnswers[currentQuestion.id]}
          onAnswerSelect={(answerId: string) => handleAnswerSelect(currentQuestion.id, answerId)}
        />
        
        <div className="flex justify-center mt-6">
          <button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswers[currentQuestion.id]}
            className="px-8 py-4 bg-bittersweet text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        </div>
      </div>
    </div>
  );
}
