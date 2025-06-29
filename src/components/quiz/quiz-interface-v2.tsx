'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  sessionId?: string;
  userId?: string;
  sessionType?: 'skill' | 'domain' | 'subject' | 'overall';
}

export default function QuizInterface({
  questions: initialQuestions,
  subjectTitle,
  sessionId,
  userId,
  sessionType = 'overall'
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
  
  // Session tracking
  const [sessionStats, setSessionStats] = useState({
    totalAnswered: 0,
    totalCorrect: 0,
    totalTimeSeconds: 0
  });
  const questionStartTime = useRef<number>(Date.now());

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
  
  // Complete session on page exit only
  const completeSession = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch('/api/complete-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          totalQuestions: sessionStats.totalAnswered,
          correctAnswers: sessionStats.totalCorrect,
          timeSpentMinutes: Math.round(sessionStats.totalTimeSeconds / 60)
        })
      });
      if (response.ok) {
        console.log('Session completed successfully');
      }
    } catch (error) {
      console.error('Error completing session:', error);
    }
  }, [sessionId, sessionStats]);

  // Handle page exit session cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (navigator.sendBeacon && sessionId) {
        const data = JSON.stringify({
          sessionId,
          totalQuestions: sessionStats.totalAnswered,
          correctAnswers: sessionStats.totalCorrect,
          timeSpentMinutes: Math.round(sessionStats.totalTimeSeconds / 60)
        });
        navigator.sendBeacon('/api/complete-session-beacon', data);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      completeSession();
    };
  }, [sessionId, sessionStats, completeSession]);



  // Track seen questions
  useEffect(() => {
    if (currentQuestion) {
      setSeenQuestionIds(prev => new Set([...prev, currentQuestion.id]));
    }
  }, [currentQuestion]);
  
  // Fetch next question set
  const fetchMoreQuestions = useCallback(async () => {
    setIsLoadingNextSet(true);
    
    try {
      const response = await fetch('/api/fetch-more-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId, // Use session ID to determine question context
          excludedQuestionIds: Array.from(seenQuestionIds)
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.questions?.length > 0) {
          setAllQuestionSets(prev => [...prev, data.questions]);
          data.questions.forEach((q: QuizQuestion) => 
            setSeenQuestionIds(prev => new Set([...prev, q.id]))
          );
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error fetching questions:', error);
      return false;
    } finally {
      setIsLoadingNextSet(false);
    }
  }, [sessionId, seenQuestionIds]);

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
    
    // Update session stats
    setSessionStats(prev => ({
      totalAnswered: prev.totalAnswered + 1,
      totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
      totalTimeSeconds: prev.totalTimeSeconds + timeSpent
    }));
    
    // Record answer if session exists and it's not a fallback question
    if (sessionId && userId && currentQuestion.skillId && 
        !currentQuestion.id.includes('fallback')) {
      try {
        await fetch('/api/record-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionId: currentQuestion.id, // Already a string (UUID)
            skillId: currentQuestion.skillId,
            difficultyLevel: currentQuestion.difficultyBand || 4,
            userAnswer: selectedAnswers[currentQuestion.id],
            correctAnswer: currentQuestion.correctAnswer,
            isCorrect,
            timeSpentSeconds: timeSpent
          })
        });
      } catch (error) {
        console.error('Error recording answer:', error);
      }
    }
    
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
        quizType={sessionType as 'skill' | 'domain' | 'subject' | 'overall'}
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
