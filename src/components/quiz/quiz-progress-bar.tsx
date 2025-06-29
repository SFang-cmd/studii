interface QuizProgressBarProps {
  currentQuestion: number;
  totalQuestions: number;
  answeredQuestions: Set<string>;
  incorrectAnswers: Set<string>;
  onQuestionClick?: (questionNumber: number) => void;
  allowNavigation?: boolean;
}

export function QuizProgressBar({ 
  currentQuestion, 
  totalQuestions, 
  answeredQuestions,
  incorrectAnswers,
  onQuestionClick,
  allowNavigation = false
}: QuizProgressBarProps) {
  return (
    <div className="bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200 inline-flex items-center gap-2">
      {Array.from({ length: totalQuestions }, (_, index) => {
        const isCorrect = answeredQuestions.has(index.toString());
        const isIncorrect = incorrectAnswers.has(index.toString());
        const isCurrent = index === currentQuestion;
        const canClick = allowNavigation && onQuestionClick;
        
        return (
          <div
            key={index}
            onClick={canClick ? () => onQuestionClick(index) : undefined}
            className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center ${
              canClick ? 'cursor-pointer transition-all hover:scale-110' : 'cursor-default'
            } ${
              isCurrent
                ? 'bg-bittersweet text-white'
                : isCorrect
                ? 'bg-emerald-500 text-white'
                : isIncorrect
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-600 border border-gray-300'
            }`}
          >
            {isCurrent ? (
              index + 1
            ) : isCorrect ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : isIncorrect ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              index + 1
            )}
          </div>
        );
      })}
    </div>
  );
}