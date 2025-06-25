import { getSkillRankFromPercentage } from '@/utils/rank-system';
import { SATSkill } from '@/types/sat-structure';
import { UserProgress } from '@/data/dummy-progress';
import { getUserSkillScore } from '@/utils/score-calculations';
import { RankIcon } from '../shared/rank-icon';
import Link from 'next/link';

interface SkillCardProps {
  skill: SATSkill;
  subjectId: string;
  domainId: string;
  userProgress: UserProgress;
  size?: 'small' | 'medium';
}

export function SkillCard({ skill, subjectId, domainId, userProgress, size = 'medium' }: SkillCardProps) {
  const currentScore = getUserSkillScore(skill.id, userProgress);
  const rankInfo = getSkillRankFromPercentage(currentScore, skill.maxScore);
  const progressWithinTier = (currentScore - rankInfo.minScore) / (rankInfo.maxScore - rankInfo.minScore);
  const progressPercentage = Math.max(0, Math.min(100, progressWithinTier * 100));
  
  const href = `/practice/${subjectId}/${domainId}/${skill.id}`;
  
  const sizeClasses = {
    small: {
      container: 'p-3',
      title: 'text-sm',
      rank: 'text-xs',
      score: 'text-xs',
      progress: 'h-1.5'
    },
    medium: {
      container: 'p-4',
      title: 'text-sm',
      rank: 'text-xs', 
      score: 'text-xs',
      progress: 'h-1.5'
    }
  };

  const iconSizes = {
    small: 32,
    medium: 40
  };

  const CardContent = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02]">
      <div className={`${sizeClasses[size].container} flex items-center gap-3`}>
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h4 className={`font-semibold text-paynes-gray ${sizeClasses[size].title} leading-tight mb-1 truncate`}>
              {skill.name}
            </h4>
            <p 
              className={`${sizeClasses[size].rank} font-medium capitalize`}
              style={{ color: rankInfo.color }}
            >
              {rankInfo.name}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className={`${sizeClasses[size].score} font-medium text-gray-700`}>
                {currentScore}/{rankInfo.maxScore}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`${sizeClasses[size].progress} rounded-full transition-all duration-500 ease-out`}
                style={{ 
                  width: `${progressPercentage}%`,
                  backgroundColor: rankInfo.color
                }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex-shrink-0">
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