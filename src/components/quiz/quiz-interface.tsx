'use client';

import { useState } from 'react';
import { QuestionCard } from '../shared/question-card';
import { QuizProgressBar } from '../shared/quiz-progress-bar';
import { AnswerExplanation } from '../shared/answer-explanation';

interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  type: 'multiple-choice';
  imageUrl?: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation: string;
  category?: string;
}

interface QuizInterfaceProps {
  questions: QuizQuestion[];
  subject: string;
  subjectTitle: string;
}

type QuizState = 'question' | 'explanation' | 'summary';

export function QuizInterface({ questions, subject, subjectTitle }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizState, setQuizState] = useState<QuizState>('question');
  const [currentSet, setCurrentSet] = useState(0);

  const questionsPerSet = 10;
  const totalSets = Math.ceil(questions.length / questionsPerSet);
  const currentSetQuestions = questions.slice(
    currentSet * questionsPerSet,
    (currentSet + 1) * questionsPerSet
  );
  const currentQuestion = currentSetQuestions[currentQuestionIndex];
  const answeredQuestions = new Set(
    currentSetQuestions
      .map((_, index) => index)
      .filter(index => selectedAnswers[currentSetQuestions[index].id])
  );
  
  // Track incorrect answers
  const incorrectAnswers = new Set(
    currentSetQuestions
      .map((_, index) => index)
      .filter(index => {
        const question = currentSetQuestions[index];
        const selectedAnswer = selectedAnswers[question.id];
        return selectedAnswer && selectedAnswer !== question.correctAnswer;
      })
  );

  // Check if all questions in current set are completed
  const allQuestionsCompleted = currentSetQuestions.every(q => selectedAnswers[q.id]);

  const handleAnswerSelect = (questionId: number, answerId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswers[currentQuestion.id]) {
      setQuizState('explanation');
    }
  };

  const handleNextFromExplanation = () => {
    if (currentQuestionIndex < currentSetQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuizState('question');
    } else {
      // End of current set
      if (currentSet < totalSets - 1) {
        setQuizState('summary');
      } else {
        // End of all questions
        setQuizState('summary');
      }
    }
  };

  const handleNextSet = () => {
    if (currentSet < totalSets - 1) {
      setCurrentSet(prev => prev + 1);
      setCurrentQuestionIndex(0);
      setQuizState('question');
    }
  };

  const handleQuestionClick = (questionIndex: number) => {
    setCurrentQuestionIndex(questionIndex);
    setQuizState('question');
  };

  if (quizState === 'summary') {
    const setScore = Math.round(
      (currentSetQuestions.filter(q => selectedAnswers[q.id] === q.correctAnswer).length / currentSetQuestions.length) * 100
    );
    
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-paynes-gray mb-4">
            Set {currentSet + 1} Complete!
          </h2>
          <div className="text-6xl font-bold mb-4" style={{ color: '#059669' }}>
            {setScore}%
          </div>
          <p className="text-glaucous mb-6">
            You got {currentSetQuestions.filter(q => selectedAnswers[q.id] === q.correctAnswer).length} out of {currentSetQuestions.length} questions correct.
          </p>
          
          {/* Category Insights */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-paynes-gray mb-4">Category Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h4 className="font-bold text-emerald-700">Improved</h4>
                <p className="text-sm text-emerald-600">Linear Equations: +15 points</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-bold text-red-700">Needs Work</h4>
                <p className="text-sm text-red-600">Systems of Equations: -5 points</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            {currentSet < totalSets - 1 ? (
              <button
                onClick={handleNextSet}
                className="px-6 py-3 bg-bittersweet text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Start Set {currentSet + 2}
              </button>
            ) : (
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-bittersweet text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 border-2 border-glaucous text-glaucous rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
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
        />
      </div>
    );
  }

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