'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { QuestionCard } from './question-card';
import { QuizProgressBar } from './quiz-progress-bar';
import { AnswerExplanation } from './answer-explanation';
import { QuizSummary } from './quiz-summary';
import { getAllSkillIds, getSkillIdsBySubject, getSkillIdsByDomain } from '@/types/sat-structure';

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
  // Add the session parameters needed for fetching more questions
  sessionLevel: 'all' | 'subject' | 'domain' | 'skill';
  sessionTargetId: string;
}

export default function QuizInterface({
  questions: initialQuestions,
  subjectTitle,
  sessionId,
  sessionLevel,
  sessionTargetId
}: QuizInterfaceProps): React.ReactNode {
  // Core quiz state
  const [currentSet, setCurrentSet] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizState, setQuizState] = useState<'question' | 'explanation' | 'summary'>('question');
  // Change selectedAnswers to be scoped per set: setIndex -> questionId -> answer
  const [selectedAnswersBySet, setSelectedAnswersBySet] = useState<Record<number, Record<string, string>>>({});
  
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

  // Skill tracking for current set
  const [initialSkillScores, setInitialSkillScores] = useState<Record<string, number>>({});
  const [currentSkillChanges, setCurrentSkillChanges] = useState<Record<string, number>>({});
  const [skillsInCurrentSet, setSkillsInCurrentSet] = useState<Set<string>>(new Set());

  // Current question data
  const currentQuestions = useMemo(() => allQuestionSets[currentSet] || [], [allQuestionSets, currentSet]);
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const isLastQuestionInSet = currentQuestionIndex === currentQuestions.length - 1;
  
  // Helper to get current set's answers
  const currentSetAnswers = useMemo(() => selectedAnswersBySet[currentSet] || {}, [selectedAnswersBySet, currentSet]);

  // Fetch initial skill scores for current set
  const fetchInitialSkillScores = useCallback(async (questions: QuizQuestion[]) => {
    console.log('🎯 SKILL TRACKING: Fetching initial skill scores for set');
    console.log('🎯 SKILL TRACKING: Session level:', sessionLevel, 'Target ID:', sessionTargetId);
    
    let skillIds: string[] = [];

    // Determine which skills to track based on session level
    if (sessionLevel === 'all') {
      // Overall practice - fetch all skills from both math and english
      skillIds = getAllSkillIds();
      console.log('🎯 SKILL TRACKING: Overall practice - fetching all skills');
    } else if (sessionLevel === 'subject') {
      // Subject practice - fetch all skills from the subject
      skillIds = getSkillIdsBySubject(sessionTargetId);
      console.log('🎯 SKILL TRACKING: Subject practice - fetching skills for subject:', sessionTargetId);
    } else if (sessionLevel === 'domain') {
      // Domain practice - fetch all skills from the domain
      skillIds = getSkillIdsByDomain(sessionTargetId);
      console.log('🎯 SKILL TRACKING: Domain practice - fetching skills for domain:', sessionTargetId);
    } else {
      // Skill practice or fallback - extract from questions
      skillIds = Array.from(new Set(
        questions
          .map(q => q.skillId)
          .filter((skillId): skillId is string => skillId !== undefined && !skillId.includes('fallback'))
      ));
      console.log('🎯 SKILL TRACKING: Skill/fallback practice - extracting from questions');
    }

    if (skillIds.length === 0) {
      console.log('⚠️ SKILL TRACKING: No valid skill IDs found');
      return;
    }

    console.log('🎯 SKILL TRACKING: Fetching scores for skills:', skillIds);
    console.log('🎯 SKILL TRACKING: Total skills to track:', skillIds.length);
    setSkillsInCurrentSet(new Set(skillIds));

    try {
      const response = await fetch('/api/get-user-skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skillIds: skillIds
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch skill scores: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.result.success) {
        const skillScores = result.result.skill_scores;
        console.log('✅ SKILL TRACKING: Initial skill scores:', skillScores);
        setInitialSkillScores(skillScores);
        
        // Reset skill changes for new set
        const initialChanges = Object.keys(skillScores).reduce((acc, skillId) => {
          acc[skillId] = 0;
          return acc;
        }, {} as Record<string, number>);
        setCurrentSkillChanges(initialChanges);
      } else {
        console.error('❌ SKILL TRACKING: Failed to fetch skill scores:', result);
      }
    } catch (error) {
      console.error('💥 SKILL TRACKING: Error fetching skill scores:', error);
    }
  }, [sessionLevel, sessionTargetId]);

  // Calculate point change for a question
  const calculatePointChange = useCallback((difficultyBand: number, isCorrect: boolean): number => {
    if (isCorrect) {
      // For correct answers: Add difficulty_band points
      return difficultyBand;
    } else {
      // For incorrect answers: Subtract (8-difficulty_band) points
      return -(8 - difficultyBand);
    }
  }, []);

  // Update skill points after answering a question
  const updateSkillPoints = useCallback((question: QuizQuestion, isCorrect: boolean) => {
    if (!question.skillId || question.skillId.includes('fallback')) {
      console.log('⚠️ SKILL TRACKING: Skipping skill update for question without valid skill');
      return;
    }

    const pointChange = calculatePointChange(question.difficultyBand || 4, isCorrect);
    console.log('🎯 SKILL TRACKING: Question answered');
    console.log('  - Skill:', question.skillId);
    console.log('  - Difficulty Band:', question.difficultyBand);
    console.log('  - Correct:', isCorrect);
    console.log('  - Point Change:', pointChange);

    setCurrentSkillChanges(prev => ({
      ...prev,
      [question.skillId!]: (prev[question.skillId!] || 0) + pointChange
    }));
  }, [calculatePointChange]);

  // Update user skills in database
  const updateUserSkillsInDatabase = useCallback(async () => {
    if (Object.keys(currentSkillChanges).length === 0) {
      console.log('🎯 SKILL TRACKING: No skill changes to update');
      return true;
    }

    console.log('🎯 SKILL TRACKING: Updating user skills in database');
    console.log('  - Initial scores:', initialSkillScores);
    console.log('  - Skill changes:', currentSkillChanges);

    // Calculate new skill scores
    const newSkillScores: Record<string, number> = {};
    Object.keys(currentSkillChanges).forEach(skillId => {
      const initialScore = initialSkillScores[skillId] || 200;
      const change = currentSkillChanges[skillId] || 0;
      const newScore = Math.max(0, Math.min(800, initialScore + change));
      newSkillScores[skillId] = newScore;
      
      console.log(`  - ${skillId}: ${initialScore} + ${change} = ${newScore}`);
    });

    try {
      const response = await fetch('/api/update-user-skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skillScores: newSkillScores
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update user skills: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ SKILL TRACKING: User skills updated successfully:', result);
        return true;
      } else {
        console.error('❌ SKILL TRACKING: Failed to update user skills:', result);
        return false;
      }
    } catch (error) {
      console.error('💥 SKILL TRACKING: Error updating user skills:', error);
      return false;
    }
  }, [currentSkillChanges, initialSkillScores]);
  
  // Fetch initial skill scores when set changes
  useEffect(() => {
    if (currentQuestions.length > 0) {
      console.log('🔄 SKILL TRACKING: New question set detected, fetching initial skill scores');
      fetchInitialSkillScores(currentQuestions);
    }
  }, [currentSet, currentQuestions, fetchInitialSkillScores]);

  // Debug current question state
  useEffect(() => {
    if (currentQuestion) {
      console.log('🎯 CURRENT QUESTION DEBUG:');
      console.log('  - Set:', currentSet, 'Question:', currentQuestionIndex);
      console.log('  - Question ID:', currentQuestion.id);
      console.log('  - Has existing answer?', !!currentSetAnswers[currentQuestion.id]);
      console.log('  - Existing answer value:', currentSetAnswers[currentQuestion.id]);
      console.log('  - Question text preview:', currentQuestion.question.substring(0, 50) + '...');
      console.log('  - All answers for current set:', currentSetAnswers);
      console.log('  - All answers by set:', selectedAnswersBySet);
    }
  }, [currentQuestion, currentSet, currentQuestionIndex, currentSetAnswers, selectedAnswersBySet]);
  
  // Track progress for current set by index (for progress bar)
  const answeredIndices = new Set<string>();
  const correctIndices = new Set<string>();
  const incorrectIndices = new Set<string>();
  
  currentQuestions.forEach((question, index) => {
    if (currentSetAnswers[question.id]) {
      answeredIndices.add(index.toString());
      if (question.correctAnswer === currentSetAnswers[question.id]) {
        correctIndices.add(index.toString());
      } else {
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

    // Update user skills before completing session
    await updateUserSkillsInDatabase();

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
  }, [sessionId, totalAnswered, totalCorrect, updateUserSkillsInDatabase]);

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



  
  // Fetch next question set using the same database approach as initial questions
  const fetchMoreQuestions = useCallback(async () => {
    console.log('🔄 FETCH MORE QUESTIONS - Starting');
    console.log('🔍 Session level:', sessionLevel);
    console.log('🔍 Session target ID:', sessionTargetId);
    console.log('🔍 Current set:', currentSet);
    console.log('🔍 Seen question IDs count:', seenQuestionIds.size);
    console.log('🔍 Seen question IDs:', Array.from(seenQuestionIds));
    
    setIsLoadingNextSet(true);
    
    try {
      // Call a simple API that uses the existing getQuestionsForPractice function
      const response = await fetch('/api/questions/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: sessionLevel,
          targetId: sessionTargetId,
          // excludeQuestionIds: Array.from(seenQuestionIds), // Disabled for now - implement later
          limit: 10
        })
      });

      console.log('🌐 API Response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ API Response not OK:', response.statusText);
        throw new Error(`Failed to fetch questions: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📊 Questions received:', result.questions?.length || 0);
      
      if (result.questions && result.questions.length > 0) {
        console.log('✅ Using database questions for next set');
        setAllQuestionSets(prev => [...prev, result.questions]);
        return true;
      } else {
        console.log('⚠️ No database questions available, using fallback');
        // Generate fallback questions as last resort
        const fallbackQuestions = Array.from({ length: 10 }, (_, i) => ({
          id: `fallback-set-${currentSet + 1}-${i}`,
          question: `<p>Fallback question ${i + 1} for set ${currentSet + 1}. No database questions available.</p>`,
          type: "multiple-choice" as const,
          options: [
            { id: "A", text: "<p>Option A</p>" },
            { id: "B", text: "<p>Option B</p>" },
            { id: "C", text: "<p>Option C</p>" },
            { id: "D", text: "<p>Option D</p>" }
          ],
          correctAnswer: "A",
          explanation: "This is a fallback question because no database questions were available.",
          category: "Practice",
          difficultyBand: 3,
          skillId: "fallback-skill"
        }));
        
        setAllQuestionSets(prev => [...prev, fallbackQuestions]);
        return true;
      }
    } catch (error) {
      console.error('💥 Error fetching questions:', error);
      
      // Generate fallback questions on error
      console.log('🔄 Generating fallback questions due to error');
      const fallbackQuestions = Array.from({ length: 10 }, (_, i) => ({
        id: `error-fallback-set-${currentSet + 1}-${i}`,
        question: `<p>Error fallback question ${i + 1}. Could not fetch from database.</p>`,
        type: "multiple-choice" as const,
        options: [
          { id: "A", text: "<p>Option A</p>" },
          { id: "B", text: "<p>Option B</p>" },
          { id: "C", text: "<p>Option C</p>" },
          { id: "D", text: "<p>Option D</p>" }
        ],
        correctAnswer: "A",
        explanation: "This is a fallback question due to an error fetching from the database.",
        category: "Practice",
        difficultyBand: 3,
        skillId: "fallback-skill"
      }));
      
      setAllQuestionSets(prev => [...prev, fallbackQuestions]);
      return false;
    } finally {
      setIsLoadingNextSet(false);
      console.log('🏁 FETCH MORE QUESTIONS - Completed');
    }
  }, [seenQuestionIds, sessionLevel, sessionTargetId, currentSet]);

  // Prefetch next set when approaching end of current set
  useEffect(() => {
    const shouldPrefetch = isLastQuestionInSet && 
        quizState === 'question' && 
        !allQuestionSets[currentSet + 1] && 
        !isLoadingNextSet;
        
    console.log('🔮 PREFETCH CHECK:');
    console.log('  - Is last question in set?', isLastQuestionInSet);
    console.log('  - Quiz state is question?', quizState === 'question');
    console.log('  - Next set missing?', !allQuestionSets[currentSet + 1]);
    console.log('  - Not already loading?', !isLoadingNextSet);
    console.log('  - Should prefetch?', shouldPrefetch);
    
    if (shouldPrefetch) {
      console.log('🔮 Prefetching next question set');
      fetchMoreQuestions();
    }
  }, [currentQuestionIndex, quizState, currentSet, isLoadingNextSet, allQuestionSets, fetchMoreQuestions, isLastQuestionInSet]);



  const handleNextSet = async () => {
    console.log('🚀 HANDLE NEXT SET - Starting');
    console.log('🔍 Current set:', currentSet);
    console.log('🔍 Available sets:', allQuestionSets.length);
    console.log('🔍 Next set exists?', !!allQuestionSets[currentSet + 1]);
    
    // Debug current selectedAnswers state
    console.log('🔍 SELECTED ANSWERS STATE:');
    console.log('  - Sets with answers:', Object.keys(selectedAnswersBySet));
    console.log('  - Current set answers count:', Object.keys(currentSetAnswers).length);
    console.log('  - All answers by set:', selectedAnswersBySet);
    
    // Debug current set answers vs all answers
    const currentSetQuestionIds = currentQuestions.map(q => q.id);
    console.log('🔍 CURRENT SET ANALYSIS:');
    console.log('  - Current set question IDs:', currentSetQuestionIds);
    console.log('  - Answers for current set:', Object.keys(currentSetAnswers));
    console.log('  - Current set answers object:', currentSetAnswers);
    
    // Update user skills after completing the set
    await updateUserSkillsInDatabase();
    
    // Ensure next set is available
    if (!allQuestionSets[currentSet + 1]) {
      console.log('⏳ Fetching next set because it does not exist');
      await fetchMoreQuestions();
    } else {
      console.log('✅ Next set already available');
    }
    
    // Debug next set before moving
    if (allQuestionSets[currentSet + 1]) {
      const nextSetQuestions = allQuestionSets[currentSet + 1];
      console.log('🔍 NEXT SET ANALYSIS:');
      console.log('  - Next set question count:', nextSetQuestions.length);
      console.log('  - Next set question IDs:', nextSetQuestions.map(q => q.id));
      
      // Check for overlapping questions
      const overlappingQuestions = nextSetQuestions.filter(q => currentSetQuestionIds.includes(q.id));
      console.log('  - Overlapping questions with current set:', overlappingQuestions.length);
      if (overlappingQuestions.length > 0) {
        console.log('  - Overlapping question IDs:', overlappingQuestions.map(q => q.id));
        console.log('  - These will show previous answers!');
      }
      
      // Check if next set questions already have answers in the next set's scope
      const nextSetAnswers = selectedAnswersBySet[currentSet + 1] || {};
      const nextSetWithExistingAnswers = nextSetQuestions.filter(q => nextSetAnswers[q.id]);
      console.log('  - Questions in next set with existing answers:', nextSetWithExistingAnswers.length);
      if (nextSetWithExistingAnswers.length > 0) {
        console.log('  - Question IDs with existing answers:', nextSetWithExistingAnswers.map(q => q.id));
        console.log('  - Next set should be FRESH - no pre-existing answers expected!');
      }
    }
    
    // Move to next set
    console.log('➡️ Moving to next set:', currentSet + 1);
    setCurrentSet(prev => prev + 1);
    setCurrentQuestionIndex(0);
    setQuizState('question');
    console.log('🏁 HANDLE NEXT SET - Completed');
  };

  const handleQuestionClick = (questionIndex: number) => {
    if (allCurrentSetCompleted) {
      setCurrentQuestionIndex(questionIndex);
      setQuizState('question');
    }
  };

  const handleAnswerSelect = (questionId: string, selectedOption: string) => {
    if (quizState !== 'question') return;
    
    console.log('📝 ANSWER SELECT:');
    console.log('  - Set:', currentSet);
    console.log('  - Question ID:', questionId);
    console.log('  - Selected option:', selectedOption);
    
    setSelectedAnswersBySet(prev => ({
      ...prev,
      [currentSet]: {
        ...prev[currentSet],
        [questionId]: selectedOption
      }
    }));
  };

  // Record individual answer to database
  const recordAnswer = useCallback(async (
    questionId: string,
    userAnswer: string,
    correctAnswer: string,
    isCorrect: boolean,
    skillId?: string,
    difficultyLevel?: number,
    timeSpentSeconds?: number
  ) => {
    if (!sessionId) {
      console.log('📝 No sessionId available for answer recording');
      return;
    }

    // Skip recording for fallback questions
    if (questionId.includes('fallback')) {
      console.log('📝 Skipping answer recording for fallback question');
      return;
    }

    try {
      console.log('📝 Recording answer for question:', questionId);
      
      const response = await fetch('/api/record-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          questionId,
          skillId,
          difficultyLevel,
          userAnswer,
          correctAnswer,
          isCorrect,
          timeSpentSeconds,
          attemptNumber: 1
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Answer recorded successfully:', result.answer_id);
      } else {
        console.error('❌ Failed to record answer:', result.error);
      }
    } catch (error) {
      console.error('❌ Error recording answer:', error);
    }
  }, [sessionId]);

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !currentSetAnswers[currentQuestion.id]) return;
    
    const userAnswer = currentSetAnswers[currentQuestion.id];
    const isCorrect = userAnswer === currentQuestion.correctAnswer;
    const timeSpentSeconds = Math.round((Date.now() - questionStartTime.current) / 1000);
    
    // Update session tracking stats
    setTotalAnswered(prev => prev + 1);
    if (isCorrect) {
      setTotalCorrect(prev => prev + 1);
    }
    
    // Record the individual answer to database
    await recordAnswer(
      currentQuestion.id,
      userAnswer,
      currentQuestion.correctAnswer,
      isCorrect,
      currentQuestion.skillId,
      currentQuestion.difficultyBand,
      timeSpentSeconds
    );

    // Update skill points based on answer
    updateSkillPoints(currentQuestion, isCorrect);
    
    setQuizState('explanation');
    questionStartTime.current = Date.now();
  };

  // Update quiz session progress using SQL function when entering summary
  const updateQuizSession = useCallback(async () => {
    if (!sessionId) {
      console.log('🔄 No sessionId available for session update');
      return;
    }

    const timeSpentMinutes = Math.round((Date.now() - sessionStartTime.current) / 1000 / 60);
    
    const sessionUpdateData = {
      sessionId,
      total_questions: totalAnswered,
      correct_answers: totalCorrect,
      time_spent_minutes: timeSpentMinutes
    };

    console.log('🔄 UPDATING QUIZ SESSION on summary entry:');
    console.log('  - Session ID:', sessionId);
    console.log('  - Total Questions:', totalAnswered);
    console.log('  - Correct Answers:', totalCorrect);
    console.log('  - Time Spent (minutes):', timeSpentMinutes);

    try {
      const response = await fetch('/api/update-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionUpdateData),
      });

      if (!response.ok) {
        console.error('❌ Session update failed:', response.statusText);
        return;
      }

      const result = await response.json();
      console.log('✅ Session updated successfully:', result);
    } catch (error) {
      console.error('💥 Error updating session:', error);
    }
  }, [sessionId, totalAnswered, totalCorrect]);

  const handleNextFromExplanation = async () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuizState('question');
    } else {
      // End of current set - update session and show summary
      await updateQuizSession();
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
        skillChanges={currentSkillChanges}
        skillsInSet={skillsInCurrentSet}
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
              correctAnswers={correctIndices}
              incorrectAnswers={incorrectIndices}
              onQuestionClick={handleQuestionClick}
              allowNavigation={allCurrentSetCompleted}
            />
          </div>
          <div className="flex-1"></div>
        </div>
        
        <AnswerExplanation
          question={currentQuestion}
          selectedAnswer={currentSetAnswers[currentQuestion.id]}
          onNext={handleNextFromExplanation}
          skillPointChange={currentQuestion.skillId ? currentSkillChanges[currentQuestion.skillId] : undefined}
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
            correctAnswers={correctIndices}
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
          selectedAnswer={currentSetAnswers[currentQuestion.id]}
          onAnswerSelect={(answerId: string) => handleAnswerSelect(currentQuestion.id, answerId)}
        />
        
        <div className="flex justify-center mt-6">
          <button
            onClick={handleSubmitAnswer}
            disabled={!currentSetAnswers[currentQuestion.id]}
            className="px-8 py-4 bg-bittersweet text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        </div>
      </div>
    </div>
  );
}
