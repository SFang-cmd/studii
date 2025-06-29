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

  // Session completion function with comprehensive debug logging
  const completeSession = useCallback(async (isPageUnload = false) => {
    if (!sessionId || hasSessionCompleted.current) {
      console.log('🚫 Session completion skipped:', {
        sessionId: !!sessionId,
        alreadyCompleted: hasSessionCompleted.current,
        trigger: isPageUnload ? 'page_unload' : 'manual'
      });
      return;
    }

    hasSessionCompleted.current = true;
    const currentTime = Date.now();
    const timeSpentMinutes = Math.round((currentTime - sessionStartTime.current) / 1000 / 60);

    console.log('🏁 STARTING SESSION COMPLETION');
    console.log('📊 Session completion stats:');
    console.log('  Session ID:', sessionId);
    console.log('  User ID:', userId);
    console.log('  Total Answered:', totalAnswered);
    console.log('  Total Correct:', totalCorrect);
    console.log('  Time Spent (minutes):', timeSpentMinutes);
    console.log('  Current Set:', currentSet);
    console.log('  Question Index:', currentQuestionIndex);
    console.log('  Trigger:', isPageUnload ? 'page_unload' : 'manual');
    console.log('  Timestamp:', new Date().toISOString());

    const sessionData = {
      sessionId,
      total_questions: totalAnswered,
      correct_answers: totalCorrect,
      time_spent_minutes: timeSpentMinutes
    };

    try {
      if (isPageUnload && navigator.sendBeacon) {
        // Use sendBeacon for page unload (more reliable)
        console.log('📡 Using sendBeacon for session completion');
        const success = navigator.sendBeacon(
          '/api/complete-session',
          JSON.stringify(sessionData)
        );
        console.log('📡 sendBeacon result:', success ? 'SUCCESS' : 'FAILED');
      } else {
        // Use regular fetch for manual completion
        console.log('🔄 Using fetch for session completion');
        const response = await fetch('/api/complete-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sessionData),
        });

        const result = await response.json();
        
        if (response.ok) {
          console.log('✅ Session completed successfully via fetch');
          console.log('📈 API Response:', result);
        } else {
          console.log('❌ Session completion failed via fetch');
          console.log('📉 Error Response:', result);
        }
      }
    } catch (error) {
      console.log('💥 Error completing session:');
      console.log('  Error:', error);
      console.log('  Stack:', error instanceof Error ? error.stack : 'No stack trace');
    }
  }, [sessionId, userId, totalAnswered, totalCorrect, currentSet, currentQuestionIndex]);

  // Setup session completion handlers - only for actual navigation/closure
  useEffect(() => {
    console.log('🔧 Setting up session completion handlers for sessionId:', sessionId);
    
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('⚠️ BEFOREUNLOAD EVENT TRIGGERED');
      console.log('  Event type:', event.type);
      console.log('  Session ID:', sessionId);
      console.log('  Current stats:', {
        totalAnswered,
        totalCorrect,
        currentSet,
        currentQuestionIndex
      });
      
      // This fires on:
      // - Tab/window close
      // - Page refresh (F5, Ctrl+R)
      // - Navigation to different URL
      // - Browser close
      console.log('🚪 Page is actually unloading - completing session');
      completeSession(true);
    };

    const handlePageHide = () => {
      console.log('🫥 PAGEHIDE EVENT TRIGGERED');
      console.log('  Session ID:', sessionId);
      console.log('  Current stats:', {
        totalAnswered,
        totalCorrect,
        currentSet,
        currentQuestionIndex
      });
      
      // This is more reliable than beforeunload for detecting actual page unload
      // It fires when the page is truly being removed from memory
      console.log('🚪 Page is being hidden/unloaded - completing session');
      completeSession(true);
    };

    // Add event listeners - using both for maximum reliability
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up session completion handlers for sessionId:', sessionId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [sessionId, completeSession, totalAnswered, totalCorrect, currentSet, currentQuestionIndex]);

  // Monitor page visibility for debugging only (no session completion)
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('👁️ VISIBILITY CHANGE EVENT (debug only)');
      console.log('  Document hidden:', document.hidden);
      console.log('  Visibility state:', document.visibilityState);
      console.log('  Session continues - not ending session on tab switch');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle client-side navigation away from practice page
  useEffect(() => {
    const handleRouteChange = () => {
      console.log('🧭 CLIENT-SIDE NAVIGATION DETECTED');
      console.log('  Current URL:', window.location.href);
      console.log('  Session ID:', sessionId);
      
      // Complete session when navigating away from practice page
      if (sessionId && !hasSessionCompleted.current) {
        console.log('🚪 Navigating away from practice page - completing session');
        completeSession(false); // Use regular fetch since we're not in beforeunload
      }
    };

    // Listen for clicks on navigation elements
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if clicked element or its parent is a navigation link
      const navLink = target.closest('a[href], button[type="button"]');
      if (navLink) {
        const href = navLink.getAttribute('href');
        const isExternalNavigation = href && !href.startsWith('/practice');
        
        if (isExternalNavigation) {
          console.log('🔗 Navigation link clicked:', href);
          console.log('  Session ID:', sessionId);
          
          if (sessionId && !hasSessionCompleted.current) {
            console.log('🚪 Navigation away detected - completing session');
            completeSession(false);
          }
        }
      }
    };

    // Add click listener to document to catch all navigation clicks
    document.addEventListener('click', handleClick, true); // Use capture phase

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [sessionId, completeSession]);

  // Monitor for URL changes (as backup for missed navigation)
  useEffect(() => {
    const currentUrl = window.location.href;
    console.log('📍 URL monitoring setup for:', currentUrl);

    // Check if we're still on a practice page
    const checkUrlChange = () => {
      const newUrl = window.location.href;
      if (newUrl !== currentUrl && !newUrl.includes('/practice')) {
        console.log('🌐 URL changed away from practice:', currentUrl, '→', newUrl);
        if (sessionId && !hasSessionCompleted.current) {
          console.log('🚪 URL change detected - completing session');
          completeSession(false);
        }
      }
    };

    // Check URL periodically as a fallback
    const urlCheckInterval = setInterval(checkUrlChange, 1000);

    return () => {
      clearInterval(urlCheckInterval);
    };
  }, [sessionId, completeSession]);
  
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
    
    console.log('📝 ANSWER SUBMITTED');
    console.log('  Question ID:', currentQuestion.id);
    console.log('  Selected Answer:', selectedAnswers[currentQuestion.id]);
    console.log('  Correct Answer:', currentQuestion.correctAnswer);
    console.log('  Is Correct:', isCorrect);
    console.log('  Time Spent (seconds):', timeSpent);
    console.log('  Session ID:', sessionId);
    
    // Update session tracking stats
    setTotalAnswered(prev => {
      const newTotal = prev + 1;
      console.log('📊 Total Answered updated:', prev, '→', newTotal);
      return newTotal;
    });
    
    if (isCorrect) {
      setTotalCorrect(prev => {
        const newTotal = prev + 1;
        console.log('✅ Total Correct updated:', prev, '→', newTotal);
        return newTotal;
      });
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
