import { getRankFromScore } from '@/utils/rank-system';
import { SATSkill } from '@/types/sat-structure';
import Link from 'next/link';

interface SkillCardProps {
  skill: SATSkill;
  subjectId: string;
  domainId: string;
}

export function SkillCard({ skill, subjectId, domainId }: SkillCardProps) {
  const rankInfo = getRankFromScore(skill.currentScore);
  const progressWithinTier = (skill.currentScore - rankInfo.minScore) / (rankInfo.maxScore - rankInfo.minScore);
  const progressPercentage = Math.max(0, Math.min(100, progressWithinTier * 100));
  
  const href = `/practice/${subjectId}/${domainId}/${skill.id}`;

  const CardContent = (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02]">
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-paynes-gray text-sm leading-tight mb-1">
            {skill.name}
          </h4>
          <p 
            className="text-xs font-medium capitalize"
            style={{ color: rankInfo.color }}
          >
            {rankInfo.name}
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-700">
              {skill.currentScore}/{skill.maxScore}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${progressPercentage}%`,
                backgroundColor: rankInfo.color
              }}
            />
          </div>
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