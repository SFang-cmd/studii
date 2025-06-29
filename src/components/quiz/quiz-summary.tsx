'use client';

import { QuizQuestion } from './quiz-interface';

interface PerformanceMetric {
  id: string;
  name: string;
  correct: number;
  total: number;
}

interface QuizSummaryProps {
  questions: QuizQuestion[];
  currentSet: number;
  selectedAnswers: Record<string, string>;
  onNextSet: () => void;
  quizType?: 'skill' | 'domain' | 'subject' | 'overall';
  isLoadingNextSet?: boolean;
}

export function QuizSummary({
  questions,
  currentSet,
  selectedAnswers,
  onNextSet,
  quizType = 'overall',
  isLoadingNextSet = false
}: QuizSummaryProps) {
  // Calculate overall score
  const correctAnswers = questions.filter(q => selectedAnswers[q.id] === q.correctAnswer).length;
  const totalQuestions = questions.length;
  const overallScore = Math.round((correctAnswers / totalQuestions) * 100);
  
  // Group questions by different categories and calculate performance
  const skillMetrics = calculateMetricsByProperty(questions, selectedAnswers, 'skillId', 'skillName');
  const domainMetrics = calculateMetricsByProperty(questions, selectedAnswers, 'domainId', 'domainName');
  const subjectMetrics = calculateMetricsByProperty(questions, selectedAnswers, 'subjectId', 'subjectName');
  
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
              <div className="text-3xl font-bold" style={{ color: overallScore >= 70 ? '#059669' : overallScore >= 50 ? '#d97706' : '#dc2626' }}>
                {overallScore}%
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
              {skillMetrics.map(metric => (
                <PerformanceCard key={metric.id} metric={metric} />
              ))}
            </div>
          </div>
        )}
        
        {/* Domains Section - Only show if relevant */}
        {showDomains && domainMetrics.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-paynes-gray mb-4">Domain Performance</h3>
            <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
              {domainMetrics.map(metric => (
                <PerformanceCard key={metric.id} metric={metric} />
              ))}
            </div>
          </div>
        )}
        
        {/* Subjects Section - Only show if relevant */}
        {showSubjects && subjectMetrics.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-paynes-gray mb-4">Subject Performance</h3>
            <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
              {subjectMetrics.map(metric => (
                <PerformanceCard key={metric.id} metric={metric} />
              ))}
            </div>
          </div>
        )}

        {/* Navigation Button - Single button aligned to the right */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={onNextSet}
            disabled={isLoadingNextSet}
            className={`px-8 py-3 ${isLoadingNextSet ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white font-semibold rounded-lg transition-colors`}
          >
            {isLoadingNextSet ? (
              <>
                <span className="inline-block animate-pulse mr-2">⏳</span>
                Loading Next Set...
              </>
            ) : (
              'Continue to Next Set'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper component for displaying performance metrics
function PerformanceCard({ metric }: { metric: PerformanceMetric }) {
  const score = metric.total > 0 ? Math.round((metric.correct / metric.total) * 100) : 0;
  
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-paynes-gray">{metric.name}</h4>
        <span className={`font-bold ${
          score >= 70 ? 'text-emerald-700' : 
          score >= 50 ? 'text-amber-700' : 
          'text-red-700'
        }`}>
          {score}%
        </span>
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
      
      <p className="text-sm text-gray-600">
        {metric.correct} of {metric.total} correct
      </p>
    </div>
  );
}

// Helper function to calculate metrics by a specific property
function calculateMetricsByProperty(
  questions: QuizQuestion[], 
  selectedAnswers: Record<string, string>,
  idProperty: keyof QuizQuestion,
  nameProperty: keyof QuizQuestion
): PerformanceMetric[] {
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
    }
    
    metrics[id].total += 1;
    if (selectedAnswers[question.id] === question.correctAnswer) {
      metrics[id].correct += 1;
    }
  });
  
  return Object.values(metrics);
}
