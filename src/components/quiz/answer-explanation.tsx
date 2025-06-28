'use client';

import { useState, useRef, useEffect } from 'react';

import { QuizQuestion } from './quiz-interface';
import { getSkillHierarchy, getSubjectById } from '@/types/sat-structure';
import { UserProgress } from '@/types/user-progress';
import { calculatePointsForQuestion } from '@/utils/rank-points';

interface AnswerExplanationProps {
  question: QuizQuestion;
  selectedAnswer: string;
  onNext: () => void;
  userProgress?: UserProgress;
  accumulatedPoints?: Record<string, number>; // Points accumulated in the current session
  onPointChange?: (skillId: string, points: number) => void; // Callback to update accumulated points
}

export function AnswerExplanation({ 
  question, 
  selectedAnswer, 
  onNext, 
  userProgress,
  accumulatedPoints = {},
  onPointChange
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

  // Always show all four cards regardless of practice type
  const showOverallCard = true;
  const showSubjectCard = true;
  const showDomainCard = true;
  const showSkillCard = true;
  
  // Get subject, domain, and skill info from the question's skillId
  let subjectName = 'Math';
  let domainName = 'Algebra';
  let skillName = 'Linear Equations';
  
  // Try to get hierarchy information if skillId is available
  if (question.skillId) {
    const hierarchy = getSkillHierarchy(question.skillId);
    if (hierarchy) {
      subjectName = hierarchy.subject.name;
      domainName = hierarchy.domain.name;
      skillName = hierarchy.skill.name;
    }
  } else if (question.category) {
    // Fallback to using category if available
    // Try to match category to a domain name
    const mathSubject = getSubjectById('math');
    const englishSubject = getSubjectById('english');
    
    if (mathSubject && mathSubject.domains.some(d => d.name.toLowerCase().includes(question.category?.toLowerCase() || ''))) {
      subjectName = 'Math';
      const matchedDomain = mathSubject.domains.find(d => d.name.toLowerCase().includes(question.category?.toLowerCase() || ''));
      if (matchedDomain) {
        domainName = matchedDomain.name;
        skillName = matchedDomain.skills[0]?.name || 'General Skills';
      }
    } else if (englishSubject && englishSubject.domains.some(d => d.name.toLowerCase().includes(question.category?.toLowerCase() || ''))) {
      subjectName = 'English';
      const matchedDomain = englishSubject.domains.find(d => d.name.toLowerCase().includes(question.category?.toLowerCase() || ''));
      if (matchedDomain) {
        domainName = matchedDomain.name;
        skillName = matchedDomain.skills[0]?.name || 'General Skills';
      }
    } else {
      // Default fallback
      if (question.category?.toLowerCase().includes('math') || 
          question.category?.toLowerCase().includes('algebra') || 
          question.category?.toLowerCase().includes('geometry')) {
        subjectName = 'Math';
      } else {
        subjectName = 'English';
      }
      domainName = question.category || 'General';
    }
  }
  
  // Calculate point changes for this question
  const isCorrect = selectedAnswer === question.correctAnswer;
  
  // Use difficulty_band as the primary source for point calculations
  // The database has both difficulty_band (numeric 1-7) and difficulty_letter (E/M/H)
  console.log('DEBUG - Full question object:', question);
  console.log('DEBUG - Question difficulty:', question.difficulty);
  console.log('DEBUG - Question difficultyBand:', question.difficultyBand);
  console.log('DEBUG - Question difficultyLetter:', question.difficultyLetter);
  
  // Try to get the correct difficulty band
  const difficultyBand = question.difficultyBand || question.difficulty || 4;
  console.log('Using difficulty band for points calculation:', difficultyBand);
  const pointChange = calculatePointsForQuestion(difficultyBand, isCorrect);
  
  // Get current skill score and calculate new score
  const skillId = question.skillId || '';
  const defaultSkillScore = 200; // Default starting score
  const baseSkillScore = userProgress?.skillScores[skillId] || defaultSkillScore;
  const previouslyAccumulated = accumulatedPoints[skillId] || 0;
  
  // Current score is base + previously accumulated points
  const currentSkillScore = baseSkillScore + previouslyAccumulated;
  const newSkillScore = Math.max(0, Math.min(800, currentSkillScore + pointChange));
  const skillPointChange = pointChange;
  
  // Update accumulated points when component mounts - only once
  useEffect(() => {
    if (onPointChange && skillId) {
      onPointChange(skillId, previouslyAccumulated + pointChange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Empty dependency array means this runs once on mount
  
  console.log("Question: ", question);
  console.log("Using skillId:", question.skillId);
  console.log("Subject Name: ", subjectName);
  console.log("Domain Name: ", domainName);
  console.log("Skill Name: ", skillName);
  console.log("Current skill score:", currentSkillScore);
  console.log("Point change:", pointChange);
  console.log("New skill score:", newSkillScore);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Side - Results */}
      <div className="space-y-6 lg:col-span-2">
        {/* Dynamic Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Overall Card - Always shown */}
          {showOverallCard && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-paynes-gray mb-1">All Topics</h3>
              <p className="text-sm text-glaucous mb-2">Diamond</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">1127/1600</span>
                {skillPointChange !== 0 && (
                  <span className={`text-xs ${skillPointChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {skillPointChange > 0 ? '+' : ''}{Math.round(skillPointChange * 0.25)}
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                <div className="flex w-full">
                  <div className="bg-emerald-500 h-2" style={{ width: '70%' }} />
                  {skillPointChange < 0 && (
                    <div className="bg-red-500 h-2" style={{ width: '5%' }} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Subject Card - Shown for subject, domain, and skill practice */}
          {showSubjectCard && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-paynes-gray mb-1">{subjectName}</h3>
              <p className="text-sm text-glaucous mb-2">SAThlete</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">1567/1600</span>
                {skillPointChange !== 0 && (
                  <span className={`text-xs ${skillPointChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {skillPointChange > 0 ? '+' : ''}{Math.round(skillPointChange * 0.5)}
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                <div className="flex w-full">
                  <div className="bg-emerald-500 h-2" style={{ width: '90%' }} />
                  {skillPointChange < 0 && (
                    <div className="bg-red-500 h-2" style={{ width: '10%' }} />
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Domain Card - Shown for domain and skill practice */}
          {showDomainCard && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-paynes-gray mb-1">{domainName}</h3>
              <p className="text-sm text-glaucous mb-2">Apprentice</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">350/800</span>
                {skillPointChange !== 0 && (
                  <span className={`text-xs ${skillPointChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {skillPointChange > 0 ? '+' : ''}{Math.round(skillPointChange * 0.8)}
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                <div className="flex w-full">
                  <div className="bg-emerald-500 h-2" style={{ width: '43%' }} />
                  {skillPointChange < 0 && (
                    <div className="bg-red-500 h-2" style={{ width: '2%' }} />
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Skill Card - Shown only for skill practice */}
          {showSkillCard && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-paynes-gray mb-1">{skillName}</h3>
              <p className="text-sm text-glaucous mb-2">Novice</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{currentSkillScore}/800</span>
                {skillPointChange !== 0 && (
                  <span className={`text-xs ${skillPointChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {skillPointChange > 0 ? '+' : ''}{skillPointChange}
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
                <div className="flex w-full">
                  <div 
                    className="bg-emerald-500 h-2" 
                    style={{ width: `${Math.min(100, Math.max(0, (currentSkillScore / 800) * 100))}%` }} 
                  />
                  {skillPointChange < 0 && (
                    <div 
                      className="bg-red-500 h-2" 
                      style={{ width: `${Math.min(100, Math.abs(skillPointChange / 800) * 100)}%` }} 
                    />
                  )}
                </div>
              </div>
              {/* Show before/after scores */}
              {skillPointChange !== 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  {currentSkillScore} → {newSkillScore}
                </div>
              )}
            </div>
          )}
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