import { QuizQuestion } from './quiz-interface';

interface QuestionCardProps {
  question: QuizQuestion;
  selectedAnswer?: string;
  onAnswerSelect: (answerId: string) => void;
}

export function QuestionCard({ question, selectedAnswer, onAnswerSelect }: QuestionCardProps) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
      {/* Question Text */}
      <div className="mb-8">
        {/* Stimulus - if present */}
        {question.stimulus && (
          <div className="stimulus-wrapper mb-6">
            <div 
              className="stimulus-content text-paynes-gray whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: question.stimulus }}
            />
          </div>
        )}
        {/* Question Stem */}
        <h2 
          className="text-xl font-medium text-paynes-gray mb-6"
          dangerouslySetInnerHTML={{ __html: question.question }}
        />
      </div>

      {/* Answer Options */}
      <div className="space-y-4">
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => onAnswerSelect(option.id)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
              selectedAnswer === option.id
                ? 'border-bittersweet bg-red-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start gap-4">
              <div 
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold flex-shrink-0 ${
                  selectedAnswer === option.id
                    ? 'border-bittersweet bg-bittersweet text-white'
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                {option.id}
              </div>
              <div className="flex-1">
                <div 
                  className="text-paynes-gray whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: option.text }}
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}