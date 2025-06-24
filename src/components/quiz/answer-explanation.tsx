'use client';

import { useState } from 'react';

interface QuizQuestion {
  id: number;
  question: string;
  type: 'multiple-choice';
  imageUrl?: string;
  options: Array<{ id: string; text: string; }>;
  correctAnswer: string;
  explanation: string;
  category?: string;
}

interface AnswerExplanationProps {
  question: QuizQuestion;
  selectedAnswer: string;
  onNext: () => void;
}

export function AnswerExplanation({ question, selectedAnswer, onNext }: AnswerExplanationProps) {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{type: 'user' | 'ai', message: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isCorrect = selectedAnswer === question.correctAnswer;
  const selectedOption = question.options.find(opt => opt.id === selectedAnswer);
  const correctOption = question.options.find(opt => opt.id === question.correctAnswer);

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { type: 'user', message: userMessage }]);
    setIsLoading(true);

    // Simulate AI response - replace with actual AI API call
    setTimeout(() => {
      const aiResponse = `I can help explain this concept! The question involves ${question.category || 'algebraic concepts'}. ${question.explanation} Would you like me to break down any specific part of this problem?`;
      setChatHistory(prev => [...prev, { type: 'ai', message: aiResponse }]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Side - Results */}
      <div className="space-y-6">
        {/* Overall Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-paynes-gray mb-1">All Topics</h3>
            <p className="text-sm text-glaucous mb-2">Diamond</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">1127/1200</span>
              <span className="text-xs text-red-500">-18</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }} />
              <div className="bg-red-500 h-2 rounded-full ml-auto" style={{ width: '15%' }} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-paynes-gray mb-1">Algebra</h3>
            <p className="text-sm text-glaucous mb-2">SAThlete</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">1567/1600</span>
              <span className="text-xs text-red-500">-33</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '90%' }} />
              <div className="bg-red-500 h-2 rounded-full ml-auto" style={{ width: '10%' }} />
            </div>
          </div>
        </div>

        {/* Answer Result */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-paynes-gray mb-4">
            {question.correctAnswer} is the Correct Answer:
          </h3>
          
          {/* Answer Options with Results */}
          <div className="space-y-3 mb-6">
            {question.options.map((option) => (
              <div
                key={option.id}
                className={`p-4 rounded-xl border-2 ${
                  option.id === question.correctAnswer
                    ? 'border-emerald-500 bg-emerald-50'
                    : option.id === selectedAnswer
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold flex-shrink-0 ${
                    option.id === question.correctAnswer
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : option.id === selectedAnswer
                      ? 'border-red-500 bg-red-500 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}>
                    {option.id === question.correctAnswer ? '✓' : option.id === selectedAnswer ? '✗' : option.id}
                  </div>
                  <div className="flex-1">
                    <div className="text-paynes-gray whitespace-pre-line">
                      {option.text}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-glaucous">{question.explanation}</p>
          </div>
        </div>

        {/* Next Button */}
        <button
          onClick={onNext}
          className="w-full px-6 py-4 bg-bittersweet text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
        >
          Next
        </button>
      </div>

      {/* Right Side - AI Chat */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-paynes-gray mb-4">Ask AI Questions:</h3>
        
        {/* Chat History */}
        <div className="h-64 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
          {chatHistory.length === 0 ? (
            <p className="text-gray-500 text-center">Ask me anything about this question!</p>
          ) : (
            <div className="space-y-3">
              {chatHistory.map((chat, index) => (
                <div
                  key={index}
                  className={`flex ${chat.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      chat.type === 'user'
                        ? 'bg-bittersweet text-white'
                        : 'bg-white border border-gray-200 text-paynes-gray'
                    }`}
                  >
                    {chat.message}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 text-paynes-gray px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="I don't get why..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bittersweet"
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatMessage.trim() || isLoading}
            className="px-4 py-2 bg-bittersweet text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}