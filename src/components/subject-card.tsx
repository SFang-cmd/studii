import { RankIcon } from './rank-icon';
import { getRankFromScore } from '@/utils/rank-system';
import Link from 'next/link';

interface SubjectCardProps {
  subject: string;
  currentScore: number;
  maxScore?: number;
  href?: string;
}

export function SubjectCard({ 
  subject, 
  currentScore, 
  href = `/practice/${subject.toLowerCase().replace(/\s+/g, '-')}` 
}: SubjectCardProps) {
  const rankInfo = getRankFromScore(currentScore);
  
  // Calculate progress within the current rank tier
  const progressWithinTier = (currentScore - rankInfo.minScore) / (rankInfo.maxScore - rankInfo.minScore);
  const progressPercentage = Math.max(0, Math.min(100, progressWithinTier * 100));
  
  // Subject-specific colors for the card background
  const subjectColors: Record<string, string> = {
    'Math': 'bg-emerald-50 border-emerald-100',
    'English': 'bg-blue-50 border-blue-100'
  };

  const cardColor = subjectColors[subject] || 'bg-gray-50 border-gray-100';

  const CardContent = (
    <div className={`${cardColor} rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02]`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-paynes-gray mb-1">{subject}</h3>
          <p 
            className="text-sm font-medium capitalize mb-4"
            style={{ color: rankInfo.color }}
          >
            {rankInfo.name}
          </p>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                {currentScore}/{rankInfo.maxScore}
              </span>
              <span className="text-xs text-gray-500">
                {rankInfo.minScore} - {rankInfo.maxScore}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-3 rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${Math.min(progressPercentage, 100)}%`,
                  backgroundColor: rankInfo.color
                }}
              />
            </div>
          </div>
        </div>
        
        <div className="ml-6 flex-shrink-0">
          <RankIcon rank={rankInfo.tier} size={80} />
        </div>
      </div>
    </div>
  );

  return (
    <Link href={href} className="block">
      {CardContent}
    </Link>
  );
}