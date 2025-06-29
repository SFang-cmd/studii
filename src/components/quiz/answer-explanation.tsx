'use client';

import { useState, useRef, useEffect } from 'react';
import { QuizQuestion } from './quiz-interface';

interface AnswerExplanationProps {
  question: QuizQuestion;
  selectedAnswer: string;
  onNext: () => void;
}

export function AnswerExplanation({ 
  question, 
  selectedAnswer, 
  onNext
}: AnswerExplanationProps) {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{type: 'user' | 'ai', message: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when chat history changes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

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

  // Get basic question info
  const isCorrect = selectedAnswer === question.correctAnswer;
  const subjectName = question.subjectName || 'Subject';
  const domainName = question.domainName || 'Domain';
  const skillName = question.skillName || 'Skill';
  
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Side - Results */}
      <div className="space-y-6 lg:col-span-2">
        {/* Question Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-paynes-gray mb-1">{subjectName}</h3>
            <p className="text-sm text-glaucous mb-2">Subject</p>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${
                isCorrect ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-paynes-gray mb-1">{domainName}</h3>
            <p className="text-sm text-glaucous mb-2">Domain</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Difficulty: {question.difficultyLetter || 'M'}
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-paynes-gray mb-1">{skillName}</h3>
            <p className="text-sm text-glaucous mb-2">Skill</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Question Type: {question.type}
              </span>
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
                    <div 
                      className="text-paynes-gray whitespace-pre-line"
                      dangerouslySetInnerHTML={{ __html: option.text }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div className="border-t border-gray-200 pt-4">
            <p 
              className="text-glaucous"
              dangerouslySetInnerHTML={{ __html: question.explanation }}
            />
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
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col sticky top-4" style={{ height: '600px' }}>
        <h3 className="text-xl font-bold text-paynes-gray mb-4">Ask AI Questions:</h3>
        
        {/* Chat History - Fixed height scrollable container */}
        <div 
          ref={chatContainerRef}
          className="overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg flex-1" 
          style={{ height: 'calc(100% - 120px)', maxHeight: 'calc(100% - 120px)' }}>
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
                    dangerouslySetInnerHTML={{ __html: chat.message }}
                  />
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

        {/* Chat Input - Fixed at bottom */}
        <div className="flex gap-2 mt-auto">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
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