import { RankIcon } from '../shared/rank-icon';
import { getDomainRankFromScore } from '@/utils/rank-system';
import { SATDomain } from '@/types/sat-structure';
import { UserProgress } from '@/types/user-progress';
import { calculateDomainScore } from '@/utils/score-calculations';
import Link from 'next/link';

interface DomainCardProps {
  domain: SATDomain;
  subjectId: string;
  userProgress: UserProgress;
  size?: 'small' | 'medium' | 'large';
}

export function DomainCard({ domain, subjectId, userProgress, size = 'medium' }: DomainCardProps) {
  const currentScore = calculateDomainScore(domain, userProgress);
  const rankInfo = getDomainRankFromScore(currentScore);

  // Calculate progress within the current rank tier
  const progressWithinTier = (currentScore - rankInfo.minScore) / (rankInfo.maxScore - rankInfo.minScore);
  const progressPercentage = Math.max(0, Math.min(100, progressWithinTier * 100));
  
  const href = `/practice/${subjectId}/${domain.id}`;
  
  const sizeClasses = {
    small: 'p-4 text-lg',
    medium: 'p-6 text-xl',
    large: 'p-8 text-2xl'
  };
  
  const iconSizes = {
    small: 50,
    medium: 60,
    large: 70
  };

  const CardContent = (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02]">
      <div className={`${sizeClasses[size]} flex items-center justify-between`}>
        <div className="flex-1">
          <h3 className="font-bold text-paynes-gray mb-1">{domain.name}</h3>
          <p 
            className="text-sm font-medium capitalize mb-3"
            style={{ color: rankInfo.color }}
          >
            {rankInfo.name}
          </p>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                {currentScore}/{rankInfo.maxScore}
              </span>
              <span className="text-xs text-gray-500">
                {domain.skills.length} skills
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-2 rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${progressPercentage}%`,
                  backgroundColor: rankInfo.color
                }}
              />
            </div>
          </div>
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <RankIcon rank={rankInfo.tier} size={iconSizes[size]} />
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