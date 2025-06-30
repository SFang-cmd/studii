import { useState } from 'react';
import { QuizQuestion } from './quiz-interface-v2';

interface QuestionCardProps {
  question: QuizQuestion;
  selectedAnswer?: string;
  onAnswerSelect: (answerId: string) => void;
}

export function QuestionCard({ question, selectedAnswer, onAnswerSelect }: QuestionCardProps) {
  const [inputValue, setInputValue] = useState(selectedAnswer || '');
  
  // Debug logs
  console.log('QuestionCard rendering with question type:', question.type);
  console.log('Question data:', JSON.stringify(question, null, 2));
  console.log('Is multiple-choice?', question.type === 'multiple-choice');
  console.log('Options array length:', question.options?.length);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    console.log('Input value changed to:', value);
  };
  
  const handleInputBlur = () => {
    if (inputValue.trim()) {
      console.log('Input blur - submitting answer:', inputValue.trim());
      onAnswerSelect(inputValue.trim());
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      console.log('Enter key pressed - submitting answer:', inputValue.trim());
      onAnswerSelect(inputValue.trim());
    }
  };
  
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

      {/* Answer Options or Input Field */}
      {question.type === 'multiple-choice' ? (
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
      ) : (
        <div className="flex justify-center mt-4">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer here"
            className="w-3/4 p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-bittersweet text-center text-lg"
          />
        </div>
      )}
    </div>
  );
}