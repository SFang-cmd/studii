export type RankTier = 'bronze' | 'silver' | 'gold' | 'jade' | 'ruby' | 'diamond';

export interface RankInfo {
  tier: RankTier;
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
}

export const RANK_TIERS: RankInfo[] = [
  {
    tier: 'bronze',
    name: 'Novice',
    minScore: 400,
    maxScore: 600,
    color: '#8f5100'
  },
  {
    tier: 'silver', 
    name: 'Learner',
    minScore: 600,
    maxScore: 800,
    color: '#C0C0C0'
  },
  {
    tier: 'gold',
    name: 'Skilled', 
    minScore: 800,
    maxScore: 1000,
    color: '#FFD700'
  },
  {
    tier: 'jade',
    name: 'Advanced',
    minScore: 1000,
    maxScore: 1200,
    color: '#059669'
  },
  {
    tier: 'ruby',
    name: 'Expert',
    minScore: 1200,
    maxScore: 1400,
    color: '#DC2626'
  },
  {
    tier: 'diamond',
    name: 'Scholar',
    minScore: 1400,
    maxScore: 1600,
    color: '#36daff'
  }
];

// Subject-level ranks (max 800 points)
export const SUBJECT_RANK_TIERS: RankInfo[] = [
  {
    tier: 'bronze',
    name: 'Novice',
    minScore: 200,
    maxScore: 300,
    color: '#8f5100'
  },
  {
    tier: 'silver', 
    name: 'Learner',
    minScore: 300,
    maxScore: 400,
    color: '#C0C0C0'
  },
  {
    tier: 'gold',
    name: 'Skilled', 
    minScore: 400,
    maxScore: 500,
    color: '#FFD700'
  },
  {
    tier: 'jade',
    name: 'Advanced',
    minScore: 500,
    maxScore: 600,
    color: '#059669'
  },
  {
    tier: 'ruby',
    name: 'Expert',
    minScore: 600,
    maxScore: 700,
    color: '#DC2626'
  },
  {
    tier: 'diamond',
    name: 'Scholar',
    minScore: 700,
    maxScore: 800,
    color: '#36daff'
  }
];

// Domain-level ranks (scaled to 800 points for consistency)
export const DOMAIN_RANK_TIERS: RankInfo[] = [
  {
    tier: 'bronze',
    name: 'Novice',
    minScore: 200,
    maxScore: 300,
    color: '#8f5100'
  },
  {
    tier: 'silver', 
    name: 'Learner',
    minScore: 300,
    maxScore: 400,
    color: '#C0C0C0'
  },
  {
    tier: 'gold',
    name: 'Skilled', 
    minScore: 400,
    maxScore: 500,
    color: '#FFD700'
  },
  {
    tier: 'jade',
    name: 'Advanced',
    minScore: 500,
    maxScore: 600,
    color: '#059669'
  },
  {
    tier: 'ruby',
    name: 'Expert',
    minScore: 600,
    maxScore: 700,
    color: '#DC2626'
  },
  {
    tier: 'diamond',
    name: 'Scholar',
    minScore: 700,
    maxScore: 800,
    color: '#36daff'
  }
];

// Skill-level ranks (percentage-based, scaled to match other tiers)
export function getSkillRankFromPercentage(currentScore: number, maxScore: number): RankInfo {
  const percentage = (currentScore / maxScore) * 100;
  const scaledScore = (percentage / 100) * 800; // Scale to 800 for consistency
  
  return getRankFromTiers(scaledScore, DOMAIN_RANK_TIERS);
}

// Generic rank function that works with any tier system
function getRankFromTiers(score: number, tiers: RankInfo[]): RankInfo {
  for (const rank of tiers) {
    if (score >= rank.minScore && score < rank.maxScore) {
      return rank;
    }
  }
  
  // Handle max score edge case
  if (score >= tiers[tiers.length - 1].maxScore) {
    return tiers[tiers.length - 1];
  }
  
  // Handle below minimum score
  if (score < tiers[0].minScore) {
    return tiers[0];
  }
  
  return tiers[0]; // Default to first tier
}

// Overall SAT rank (max 1600 points) - original system
export function getOverallRankFromScore(score: number): RankInfo {
  return getRankFromTiers(score, RANK_TIERS);
}

// Subject rank (max 800 points)
export function getSubjectRankFromScore(score: number): RankInfo {
  return getRankFromTiers(score, SUBJECT_RANK_TIERS);
}

// Domain rank (scaled to 800 points)
export function getDomainRankFromScore(score: number): RankInfo {
  return getRankFromTiers(score, DOMAIN_RANK_TIERS);
}

// Legacy function for backward compatibility
export function getRankFromScore(score: number): RankInfo {
  // Default to overall ranking for backward compatibility
  return getOverallRankFromScore(score);
}