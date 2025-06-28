'use client';

// Import React and other dependencies
import { useEffect } from 'react';
import { Question } from '../../types/questions';
import { QuizQuestion } from './quiz-interface';
import { RankPointChanges, updateUserProgressWithPoints } from '@/utils/rank-points';
import { UserProgress } from '@/types/user-progress';

interface PerformanceMetric {
  id: string;
  name: string;
  correct: number;
  total: number;
  percentChange?: number; // Optional percentage change from previous performance
  pointChange?: number; // Skill rank points gained or lost
  pointsBefore?: number; // Previous skill rank points
  pointsAfter?: number; // New skill rank points
}

interface QuizSummaryProps {
  questions: Question[];
  currentSet: number;
  totalSets: number;
  selectedAnswers: Record<string, string>;
  onNextSet: () => void;
  onTryAgain: () => void;
  isFinalSet: boolean;
  // Optional quiz type to determine which metrics to show
  quizType?: 'skill' | 'domain' | 'subject' | 'overall';
  // User progress data from database
  userProgress?: UserProgress;
  // Point changes from the quiz
  pointChanges?: RankPointChanges;
  // Update user progress in parent component
  onUpdateProgress?: (updatedProgress: UserProgress, pointChanges: RankPointChanges) => void;
}

export function QuizSummary({
  questions,
  currentSet,
  selectedAnswers,
  onNextSet,
  onTryAgain,
  isFinalSet,
  quizType = 'overall', // Default to overall if not specified
  userProgress,
  pointChanges,
  onUpdateProgress
}: QuizSummaryProps) {
  // Use useEffect to calculate point changes instead of doing it during render
  // This prevents the "Cannot update a component while rendering a different component" error
  useEffect(() => {
    // Only calculate if we don't have point changes yet and have the necessary data
    if (!pointChanges && userProgress && questions.length > 0) {
      // Convert Question[] to QuizQuestion[] to satisfy type requirements
      const quizQuestions = questions.map(q => ({
        ...q,
        type: q.type || 'multiple-choice' // Ensure type is not undefined
      })) as QuizQuestion[];
      
      const { updatedProgress, pointChanges: calculatedChanges } = updateUserProgressWithPoints(
        quizQuestions,
        selectedAnswers,
        userProgress
      );
      
      // Update parent component with new progress and point changes
      if (onUpdateProgress) {
        onUpdateProgress(updatedProgress, calculatedChanges);
      }
    }
  }, [questions, selectedAnswers, userProgress, pointChanges, onUpdateProgress]);
  // Calculate overall score
  const correctAnswers = questions.filter(q => selectedAnswers[q.id] === q.correctAnswer).length;
  const totalQuestions = questions.length;
  const overallScore = Math.round((correctAnswers / totalQuestions) * 100);
  
  // Group questions by different categories and calculate performance
  const skillMetrics = calculateMetricsByProperty(questions, selectedAnswers, 'skillId', 'skillName', pointChanges);
  const domainMetrics = calculateMetricsByProperty(questions, selectedAnswers, 'domainId', 'domainName', pointChanges);
  const subjectMetrics = calculateMetricsByProperty(questions, selectedAnswers, 'subjectId', 'subjectName', pointChanges);
  
  // Determine which metrics to show based on quiz type
  // For skill practice: show skill metrics only
  // For domain practice: show domain metrics and related skill metrics
  // For subject practice: show subject metrics and related domain metrics
  // For overall practice: show overall metrics only
  const showSkills = quizType === 'skill' || quizType === 'domain';
  const showDomains = quizType === 'domain' || quizType === 'subject';
  const showSubjects = quizType === 'subject';
  
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
      <div>
        <h2 className="text-3xl font-bold text-paynes-gray mb-4 text-center">
          Set {currentSet + 1} Complete!
        </h2>
        
        {/* Overall Score Card */}
        <div className="mb-8">
          <div className="max-w-2xl mx-auto bg-gray-50 rounded-lg p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-paynes-gray">Overall Performance</h3>
              <div className="flex items-center">
                <div className="text-3xl font-bold" style={{ color: overallScore >= 70 ? '#059669' : overallScore >= 50 ? '#d97706' : '#dc2626' }}>
                  {overallScore}%
                </div>
                {pointChanges?.overall && pointChanges.overall.change !== 0 && (
                  <span className={`ml-2 text-sm ${pointChanges.overall.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {pointChanges.overall.change > 0 ? '+' : ''}{pointChanges.overall.change} pts
                  </span>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="h-3 rounded-full" 
                style={{ 
                  width: `${overallScore}%`,
                  backgroundColor: overallScore >= 70 ? '#059669' : overallScore >= 50 ? '#d97706' : '#dc2626'
                }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              You got <span className="font-semibold">{correctAnswers}</span> out of <span className="font-semibold">{totalQuestions}</span> questions correct.
            </p>
          </div>
        </div>
        
        {/* Skills Section - Only show if relevant */}
        {showSkills && skillMetrics.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-paynes-gray mb-4">Skills Performance</h3>
            <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
              {skillMetrics.map(metric => {
                // Add skill point data from pointChanges if available
                if (pointChanges?.skills[metric.id]) {
                  const change = pointChanges.skills[metric.id];
                  metric.pointChange = change.change;
                  metric.pointsBefore = change.before;
                  metric.pointsAfter = change.after;
                }
                return <PerformanceCard key={metric.id} metric={metric} />;
              })}
            </div>
          </div>
        )}
        
        {/* Domains Section - Only show if relevant */}
        {showDomains && domainMetrics.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-paynes-gray mb-4">Domain Performance</h3>
            <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
              {domainMetrics.map(metric => {
                // Add domain point data from pointChanges if available
                if (pointChanges?.domains[metric.id]) {
                  const change = pointChanges.domains[metric.id];
                  metric.pointChange = change.change;
                  metric.pointsBefore = change.before;
                  metric.pointsAfter = change.after;
                }
                return <PerformanceCard key={metric.id} metric={metric} />;
              })}
            </div>
          </div>
        )}
        
        {/* Subjects Section - Only show if relevant */}
        {showSubjects && subjectMetrics.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-paynes-gray mb-4">Subject Performance</h3>
            <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
              {subjectMetrics.map(metric => {
                // Add subject point data from pointChanges if available
                if (pointChanges?.subjects[metric.id]) {
                  const change = pointChanges.subjects[metric.id];
                  metric.pointChange = change.change;
                  metric.pointsBefore = change.before;
                  metric.pointsAfter = change.after;
                }
                return <PerformanceCard key={metric.id} metric={metric} />;
              })}
            </div>
          </div>
        )}

        {/* Navigation Button - Single button aligned to the right */}
        <div className="flex justify-end mt-6">
          <button
            onClick={!isFinalSet ? onNextSet : onTryAgain}
            className="px-6 py-3 bg-bittersweet text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            {!isFinalSet ? `Next Set` : 'Try Again'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper component for displaying performance metrics
function PerformanceCard({ metric }: { metric: PerformanceMetric }) {
  const score = metric.total > 0 ? Math.round((metric.correct / metric.total) * 100) : 0;
  const isImproved = metric.percentChange && metric.percentChange > 0;
  const isDeclined = metric.percentChange && metric.percentChange < 0;
  
  // Handle point changes
  const hasPointChange = typeof metric.pointChange === 'number';
  const pointsGained = hasPointChange && (metric.pointChange ?? 0) > 0;
  const pointsLost = hasPointChange && (metric.pointChange ?? 0) < 0;
  
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-paynes-gray">{metric.name}</h4>
        <div className="flex items-center">
          <span className={`font-bold ${
            score >= 70 ? 'text-emerald-700' : 
            score >= 50 ? 'text-amber-700' : 
            'text-red-700'
          }`}>
            {score}%
          </span>
          {metric.percentChange && (
            <span className={`ml-2 text-sm ${
              isImproved ? 'text-emerald-600' : 
              isDeclined ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {isImproved && '↑'}
              {isDeclined && '↓'}
              {Math.abs(metric.percentChange)}%
            </span>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
        <div 
          className="h-2.5 rounded-full" 
          style={{ 
            width: `${score}%`,
            backgroundColor: score >= 70 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626'
          }}
        ></div>
      </div>
      
      {/* Basic stats */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {metric.correct} of {metric.total} correct
        </p>
        
        {/* Point changes */}
        {hasPointChange && (
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-1">Points:</span>
            <span className={`text-sm font-medium ${
              pointsGained ? 'text-emerald-600' : 
              pointsLost ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {pointsGained && '+'}
              {metric.pointChange}
            </span>
          </div>
        )}
      </div>
      
      {/* Show before/after points if available */}
      {hasPointChange && metric.pointsBefore !== undefined && metric.pointsAfter !== undefined && (
        <div className="mt-1 text-xs text-gray-500 flex justify-end">
          {metric.pointsBefore} → {metric.pointsAfter}
        </div>
      )}
    </div>
  );
}

// Helper function to calculate metrics by a specific property
function calculateMetricsByProperty(
  questions: Question[], 
  selectedAnswers: Record<string, string>,
  idProperty: keyof Question,
  nameProperty: keyof Question,
  pointChanges?: RankPointChanges
): PerformanceMetric[] {
  // Skip calculation if no questions
  if (questions.length === 0) {
    return [];
  }
  const metrics: Record<string, PerformanceMetric> = {};
  
  questions.forEach(question => {
    const id = question[idProperty] as string;
    const name = question[nameProperty] as string;
    
    if (!id || !name) return;
    
    if (!metrics[id]) {
      metrics[id] = {
        id,
        name,
        correct: 0,
        total: 0
      };
      
      // Add point changes if available
      if (pointChanges) {
        // Determine which level of point changes to use based on idProperty
        if (idProperty === 'skillId' && pointChanges.skills[id]) {
          const change = pointChanges.skills[id];
          metrics[id].pointChange = change.change;
          metrics[id].pointsBefore = change.before;
          metrics[id].pointsAfter = change.after;
        } else if (idProperty === 'domainId' && pointChanges.domains[id]) {
          const change = pointChanges.domains[id];
          metrics[id].pointChange = change.change;
          metrics[id].pointsBefore = change.before;
          metrics[id].pointsAfter = change.after;
        } else if (idProperty === 'subjectId' && pointChanges.subjects[id]) {
          const change = pointChanges.subjects[id];
          metrics[id].pointChange = change.change;
          metrics[id].pointsBefore = change.before;
          metrics[id].pointsAfter = change.after;
        }
      }
    }
    
    metrics[id].total += 1;
    if (selectedAnswers[question.id] === question.correctAnswer) {
      metrics[id].correct += 1;
    }
  });
  
  return Object.values(metrics);
}
