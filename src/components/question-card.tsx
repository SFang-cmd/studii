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
}

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
        <h2 className="text-xl font-medium text-paynes-gray mb-6">
          {question.question}
        </h2>
        
        {/* Graph/Image Placeholder */}
        {question.imageUrl && (
          <div className="bg-gray-50 rounded-xl p-8 mb-6 flex items-center justify-center">
            <div className="text-center">
              {/* For now, show a placeholder for the math graph */}
              <div className="w-96 h-64 bg-white rounded border-2 border-gray-200 flex items-center justify-center">
                <div className="text-gray-400">
                  <svg width="200" height="150" viewBox="0 0 200 150" className="mx-auto mb-2">
                    {/* Grid */}
                    <defs>
                      <pattern id="grid" width="20" height="15" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 15" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="200" height="150" fill="url(#grid)" />
                    
                    {/* Axes */}
                    <line x1="100" y1="0" x2="100" y2="150" stroke="#374151" strokeWidth="2"/>
                    <line x1="0" y1="75" x2="200" y2="75" stroke="#374151" strokeWidth="2"/>
                    
                    {/* Sample lines */}
                    <line x1="20" y1="20" x2="180" y2="130" stroke="#059669" strokeWidth="3"/>
                    <line x1="20" y1="110" x2="160" y2="40" stroke="#dc2626" strokeWidth="3"/>
                  </svg>
                  <p className="text-sm">Interactive graph will be displayed here</p>
                </div>
              </div>
            </div>
          </div>
        )}
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
                <div className="text-paynes-gray whitespace-pre-line">
                  {option.text}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}