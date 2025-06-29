'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { updateQuizSessionProgress, completeQuizSessionAction } from '@/app/actions/quiz-session-actions';
import { QuestionCard } from './question-card';
import { QuizProgressBar } from './quiz-progress-bar';
import { AnswerExplanation } from './answer-explanation';
import { QuizSummary } from './quiz-summary';
import { calculatePointsForQuestion, RankPointChanges, updateUserSkillScoresInDatabase } from '@/utils/rank-points';
import { UserProgress } from '@/types/user-progress';
import { recordUserAnswer } from '@/utils/database';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: number | string;
  question: string;
  stimulus?: string;
  type: 'multiple-choice' | 'free-response';
  imageUrl?: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation: string;
  category?: string;
  // Primary difficulty value (numeric 1-7 scale)
  difficultyBand?: number;
  // Descriptive difficulty (E/M/H)
  difficultyLetter?: string;
  skillId?: string;
  // Additional properties for dynamic scorecards
  subjectName?: string;
  domainName?: string;
  skillName?: string;
}

interface QuizInterfaceProps {
  questions: QuizQuestion[];
  subject: string;
  subjectTitle: string;
  sessionId?: string;
  userId?: string;
  sessionType?: 'skill' | 'domain' | 'subject' | 'overall';
  // For dynamic question fetching
  level?: 'all' | 'subject' | 'domain' | 'skill';
  target?: string;
}

type QuizState = 'question' | 'explanation' | 'summary';

export function QuizInterface({ questions: initialQuestions, subjectTitle, sessionId, userId, sessionType = 'overall', level = 'all', target = 'all' }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizState, setQuizState] = useState<QuizState>('question');
  const [currentSet, setCurrentSet] = useState(0);
  const questionStartTime = useRef<number>(Date.now());
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  
  // State for dynamic question sets
  const [allQuestionSets, setAllQuestionSets] = useState<QuizQuestion[][]>([initialQuestions]);
  const [seenQuestionIds, setSeenQuestionIds] = useState<(string | number)[]>([]);
  const [isLoadingNextSet, setIsLoadingNextSet] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  
  // Rank points tracking
  const [skillPoints, setSkillPoints] = useState<Record<string, number>>({});
  const [pointChanges, setPointChanges] = useState<RankPointChanges | undefined>();
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  
  // Ref to track if we've already processed the quiz summary
  const hasProcessedSummary = useRef(false);

  // Function to complete the quiz session - wrapped in useCallback to avoid dependency issues
  const completeQuizSession = useCallback(async () => {
    if (sessionId) {
      try {
        // Only complete the session when the user is truly exiting the quiz
        // by explicitly forcing completion
        const result = await completeQuizSessionAction(
          sessionId,
          totalQuestionsAnswered || 0,  // Ensure we have at least 0
          correctAnswersCount || 0,     // Ensure we have at least 0
          true                         // Force completion since this is a true exit
        );
        console.log('Quiz session completed successfully:', result);
        return result;
      } catch (error) {
        console.error('Error completing quiz session:', error);
        return null;
      }
    }
    return null;
  }, [sessionId, totalQuestionsAnswered, correctAnswersCount]);

  // Handle session cleanup and skill points update when component unmounts or user leaves
  useEffect(() => {
    // For beforeunload, we need to use a synchronous approach
    // as async operations won't complete during page unload
    const handleBeforeUnload = () => {
      // 1. Complete the quiz session
      if (sessionId) {
        // Use a synchronous approach - send a beacon request
        const sessionData = JSON.stringify({
          sessionId,
          totalQuestions: totalQuestionsAnswered || 0,  // Ensure we have at least 0
          correctAnswers: correctAnswersCount || 0,     // Ensure we have at least 0
          isRealExit: true                             // Flag to indicate this is a true exit
        });
        
        // Use navigator.sendBeacon which is designed for this purpose
        navigator.sendBeacon('/api/complete-session-beacon', sessionData);
        
        // Log that we're completing the session via beacon
        console.log(`Sending beacon to complete session ${sessionId} on page unload`);
      }
      
      // 2. Update skill points in the database
      if (userId && userProgress && Object.keys(skillPoints).length > 0) {
        // Combine existing skill scores with accumulated points
        const updatedScores: Record<string, number> = { ...userProgress.skillScores };
        
        // Add accumulated points to each skill
        Object.entries(skillPoints).forEach(([skillId, points]) => {
          const currentScore = updatedScores[skillId] || 200; // Default starting score
          updatedScores[skillId] = Math.max(0, Math.min(800, currentScore + points));
        });
        
        // Send the updated skill scores via beacon
        const skillData = JSON.stringify({
          userId,
          skillScores: updatedScores
        });
        
        navigator.sendBeacon('/api/update-skill-scores-beacon', skillData);
        console.log('Sending skill points update via beacon:', skillData);
      }
    };

    // Add event listeners for page exit
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup on component unmount - use our async function here
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      completeQuizSession(); // Complete session on component unmount
      
      // Also update skill points when component unmounts (e.g., navigation within the app)
      if (userId && userProgress && Object.keys(skillPoints).length > 0) {
        // Use the regular API for in-app navigation (not page unload)
        const updatedScores: Record<string, number> = { ...userProgress.skillScores };
        
        Object.entries(skillPoints).forEach(([skillId, points]) => {
          const currentScore = updatedScores[skillId] || 200;
          updatedScores[skillId] = Math.max(0, Math.min(800, currentScore + points));
        });
        
        updateUserSkillScoresInDatabase(userId, updatedScores)
          .then(() => console.log('Successfully updated skill scores on unmount'))
          .catch(error => console.error('Error updating skill scores on unmount:', error));
      }
    };
  }, [sessionId, totalQuestionsAnswered, correctAnswersCount, completeQuizSession, userId, userProgress, skillPoints]);
  
  // Periodically update session progress to track time spent
  useEffect(() => {
    if (!sessionId || totalQuestionsAnswered === 0) return;
    
    const intervalId = setInterval(() => {
      updateQuizSessionProgress(
        sessionId,
        totalQuestionsAnswered,
        correctAnswersCount
      ).catch(error => console.error('Error updating quiz session progress:', error));
    }, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, [sessionId, totalQuestionsAnswered, correctAnswersCount]);
  
  // Fetch user progress when component mounts
  useEffect(() => {
    if (!userId) return;
    
    // Initialize with default progress immediately
    setUserProgress({
      userId: userId,
      skillScores: {},
      lastUpdated: new Date()
    });
    
    const fetchUserProgress = async () => {
      try {
        // Use a timeout to ensure the request doesn't hang indefinitely
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`/api/user-progress?userId=${userId}`, {
          signal: controller.signal
        }).catch(err => {
          // Handle network errors
          console.warn('Network error fetching user progress:', err);
          return null;
        });
        
        clearTimeout(timeoutId);
        
        // If response is null or not ok, use default progress
        if (!response || !response.ok) {
          console.warn('Using default progress due to API error');
          return; // Keep using the default progress we set above
        }
        
        const data = await response.json();
        setUserProgress({
          userId,
          skillScores: data.skillScores || {},
          lastUpdated: new Date(data.lastUpdated || Date.now())
        });
      } catch (error) {
        console.warn('Error processing user progress:', error);
        // We already initialized with default progress, so no need to do it again
      }
    };
    
    fetchUserProgress();
  }, [userId]);

  // Get the questions for the current set
  const currentQuestions = allQuestionSets[currentSet] || [];
  const currentQuestion = currentQuestions[currentQuestionIndex];
  
  // Check if we're at the end of the current set
  const isLastQuestionInSet = currentQuestionIndex === currentQuestions.length - 1;
  
  // Track answered questions in current set
  const answeredQuestionsSet = new Set(
    currentQuestions
      .map((_, index) => index)
      .filter(index => selectedAnswers[currentQuestions[index].id])
  );
  
  // Track incorrect answers
  const incorrectAnswers = new Set(
    currentQuestions
      .map((_, index) => index)
      .filter(index => {
        const question = currentQuestions[index];
        const selectedAnswer = selectedAnswers[question.id];
        return selectedAnswer && selectedAnswer !== question.correctAnswer;
      })
  );

  // Check if all questions in current set are completed
  const allQuestionsCompleted = currentQuestions.every(q => selectedAnswers[q.id]);

  const handleAnswerSelect = (questionId: number | string, answerId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswers[currentQuestion.id]) {
      const isCorrect = selectedAnswers[currentQuestion.id] === currentQuestion.correctAnswer;
      
      // Update tracking counters
      setTotalQuestionsAnswered(prev => prev + 1);
      if (isCorrect) {
        setCorrectAnswersCount(prev => prev + 1);
      }
      
      // Calculate rank points based on difficulty band and correctness
      if (currentQuestion.skillId) {
        const difficultyBand = currentQuestion.difficultyBand || 4; // Default to medium difficulty if not specified
        const pointChange = calculatePointsForQuestion(difficultyBand, isCorrect);
        
        // Update skill points tracking
        setSkillPoints(prev => ({
          ...prev,
          [currentQuestion.skillId!]: (prev[currentQuestion.skillId!] || 0) + pointChange
        }));
        
        console.log(`Skill ${currentQuestion.skillId}: ${pointChange > 0 ? '+' : ''}${pointChange} points (difficultyBand: ${difficultyBand})`);
      }
      
      // Record answer in database if we have session info
      if (sessionId && userId && currentQuestion.skillId) {
        const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);
        
        try {
          await fetch('/api/record-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              questionId: String(currentQuestion.id), // Ensure question ID is a string
              skillId: currentQuestion.skillId,
              difficultyLevel: currentQuestion.difficultyBand || 4,
              userAnswer: selectedAnswers[currentQuestion.id],
              correctAnswer: currentQuestion.correctAnswer,
              isCorrect,
              timeSpentSeconds: timeSpent,
              pointChange: calculatePointsForQuestion(currentQuestion.difficultyBand || 4, isCorrect)
            })
          });
        } catch (error) {
          console.error('Error recording answer:', error);
          // Continue with quiz even if recording fails
        }
      }
      
      setQuizState('explanation');
    }
  };

  const handleNextFromExplanation = () => {
    // Reset timer for next question
    questionStartTime.current = Date.now();
    
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuizState('question');
    } else {
      // End of current set
      if (currentSet < allQuestionSets.length - 1) {
        setQuizState('summary');
      } else {
        // End of all questions
        setQuizState('summary');
      }
    }
  };

  // Fetch more questions for the next set
  const fetchMoreQuestions = async () => {
    setIsLoadingNextSet(true);
    setLoadingError(null);
    
    try {
      // Collect all question IDs we've seen so far to exclude them
      const allSeenIds = [...seenQuestionIds];
      
      const response = await fetch('/api/fetch-more-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level,
          target,
          excludedQuestionIds: allSeenIds
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch more questions: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('Error fetching more questions:', error);
    setLoadingError(error instanceof Error ? error.message : 'Failed to load more questions');
    return false;
  } finally {
    setIsLoadingNextSet(false);

  const handleNextSet = async () => {
    // Update session progress before moving to next set
    if (sessionId) {
      try {
        await updateQuizSessionProgress(
          sessionId,
          totalQuestionsAnswered,
          correctAnswersCount
        );
        console.log('Session progress updated before moving to next set');
      } catch (error) {
        console.error('Error updating session before next set:', error);
      }
      
      // Try to fetch the next set of questions if we don't have them yet
      if (!allQuestionSets[currentSet + 1]) {
        const success = await fetchMoreQuestions();
        if (!success) {
          console.warn('Could not fetch more questions, but continuing with transition');
        }
      }
      
      // Handle transition client-side
      setCurrentSet(prev => prev + 1);
      setCurrentQuestionIndex(0);
      setQuizState('question');
      hasProcessedSummary.current = false; // Reset the summary processing flag
      
      // Update URL with session ID without causing a page reload
      const url = new URL(window.location.href);
      url.searchParams.set('sessionId', sessionId);
      window.history.pushState({}, '', url.toString());
    } else {
      // If no session ID, just update the state (fallback behavior)
      setCurrentSet(prev => prev + 1);
      setCurrentQuestionIndex(0);
      setQuizState('question');
      hasProcessedSummary.current = false; // Reset the summary processing flag
    }
    
    // Note: We don't reset totalQuestionsAnswered or correctAnswersCount
    // This allows us to maintain cumulative tracking across sets
  };

  const handleQuestionClick = (questionIndex: number) => {
    setCurrentQuestionIndex(questionIndex);
    setQuizState('question');
  };

  // Calculate final point changes and update user's skill scores when a quiz set is completed
  useEffect(() => {
    if (quizState === 'summary' && userId && Object.keys(skillPoints).length > 0 && !hasProcessedSummary.current) {
      // Set the flag to prevent re-processing
      hasProcessedSummary.current = true;
      console.log('Processing quiz summary and updating skill scores...');
      
      // Create a default user progress if none exists
      const baseProgress: UserProgress = userProgress || {
        userId,
        skillScores: {},
        lastUpdated: new Date()
      };
      
      // Create a copy of user progress to calculate the changes
      const updatedProgress: UserProgress = {
        userId,
        skillScores: { ...baseProgress.skillScores },
        lastUpdated: new Date()
      };
      
      // Apply skill point changes
      Object.entries(skillPoints).forEach(([skillId, pointChange]) => {
        const currentScore = updatedProgress.skillScores[skillId] || 200; // Default to 200 if not found
        const newScore = Math.max(0, Math.min(800, currentScore + pointChange)); // Clamp between 0-800
        updatedProgress.skillScores[skillId] = newScore;
      });
      
      // Import the updateUserProgressWithPoints function from rank-points.ts
      import('@/utils/rank-points').then(({ updateUserProgressWithPoints }) => {
        // Calculate point changes using the current set questions
        const result = updateUserProgressWithPoints(
          currentSetQuestions,
          selectedAnswers,
          baseProgress
        );
        
        // Update state with the calculated point changes
        setPointChanges(result.pointChanges);
        
        // Update user skill scores in the database (only once)
        if (userId) {
          updateUserSkillScoresInDatabase(userId, result.updatedProgress.skillScores)
            .then(success => {
              if (success) {
                console.log('User skill scores updated successfully');
                // Only update the user progress state after successful database update
                // to prevent triggering this effect again
                setUserProgress(result.updatedProgress);
              } else {
                console.error('Failed to update user skill scores');
              }
            });
        } else {
          // If no userId, still update the local state
          setUserProgress(result.updatedProgress);
        }
      });
    }
    
    // Reset the processing flag when quiz state changes from summary to something else
    if (quizState !== 'summary') {
      hasProcessedSummary.current = false;
    }
  }, [quizState, userId, skillPoints, currentSetQuestions, selectedAnswers, userProgress]);
  
  // Update (not complete) the quiz session when reaching the summary state for a set
  useEffect(() => {
    if (quizState === 'summary' && sessionId) {
      // Update session progress instead of completing it
      updateQuizSessionProgress(
        sessionId,
        totalQuestionsAnswered,
        correctAnswersCount
      ).catch(error => console.error('Error updating quiz session progress:', error));
    }
  }, [quizState, sessionId, totalQuestionsAnswered, correctAnswersCount]);

  if (quizState === 'summary') {
    // Use our new modular QuizSummary component
    return (
      <QuizSummary 
        questions={currentSetQuestions}
        currentSet={currentSet}
        selectedAnswers={selectedAnswers}
        onNextSet={handleNextSet}
        quizType={sessionType as 'skill' | 'domain' | 'subject' | 'overall'}
        userProgress={userProgress || undefined}
        pointChanges={pointChanges}
        onUpdateProgress={(updatedProgress, newPointChanges) => {
          setUserProgress(updatedProgress);
          setPointChanges(newPointChanges);
          // Update the database with the new skill scores
          if (userId) {
            // Pass only the skillScores object which is a Record<string, number>
            updateUserSkillScoresInDatabase(userId, updatedProgress.skillScores)
              .then(() => console.log('Successfully updated user skill scores in database'))
              .catch(error => console.error('Error updating user skill scores:', error));
          }
        }}
      />
    );
  }

  if (quizState === 'explanation') {
    return (
      <div>
        {/* Header with Title and Progress Bar */}
        <div className="flex items-center mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-paynes-gray mb-1">
              {subjectTitle} Practice
            </h1>
            <p className="text-glaucous">
              Question {currentQuestionIndex + 1} of {currentSetQuestions.length}
            </p>
          </div>
          <div className="flex-1 flex justify-center">
            <QuizProgressBar
              currentQuestion={currentQuestionIndex}
              totalQuestions={currentSetQuestions.length}
              answeredQuestions={answeredQuestions}
              incorrectAnswers={incorrectAnswers}
              onQuestionClick={handleQuestionClick}
              allowNavigation={allQuestionsCompleted}
            />
          </div>
          <div className="flex-1"></div>
        </div>
        
        <AnswerExplanation
          question={currentQuestion}
          selectedAnswer={selectedAnswers[currentQuestion.id]}
          onNext={handleNextFromExplanation}
          userProgress={userProgress || undefined}
          accumulatedPoints={skillPoints}
          onPointChange={(skillId, points) => {
            setSkillPoints(prev => ({
              ...prev,
              [skillId]: points
            }));
          }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header with Title and Progress Bar */}
      <h1 className="text-3xl font-bold text-paynes-gray mb-1">
        {subjectTitle}
      </h1>
      <div className="flex items-center mb-6">
        <div className="flex-1">
          <p className="text-glaucous">
            Question {currentQuestionIndex + 1} of {currentSetQuestions.length}
          </p>
        </div>
        <div className="flex-1 flex justify-center">
          <QuizProgressBar
            currentQuestion={currentQuestionIndex}
            totalQuestions={currentSetQuestions.length}
            answeredQuestions={answeredQuestions}
            incorrectAnswers={incorrectAnswers}
            onQuestionClick={handleQuestionClick}
            allowNavigation={allQuestionsCompleted}
          />
        </div>
        <div className="flex-1"></div>
      </div>

      <div className="max-w-4xl mx-auto">
        <QuestionCard
          question={currentQuestion}
          selectedAnswer={selectedAnswers[currentQuestion.id]}
          onAnswerSelect={(answerId) => handleAnswerSelect(currentQuestion.id, answerId)}
        />
        
        {/* Submit Button */}
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