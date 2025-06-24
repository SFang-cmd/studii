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

export function getRankFromScore(score: number): RankInfo {
  // Find the appropriate rank tier based on score
  for (const rank of RANK_TIERS) {
    if (score >= rank.minScore && score < rank.maxScore) {
      return rank;
    }
  }
  
  // Handle edge case: max score (1600) should be diamond
  if (score >= 1600) {
    return RANK_TIERS[5]; // Diamond
  }
  
  // Handle edge case: below minimum score
  if (score < 400) {
    return RANK_TIERS[0]; // Bronze
  }
  
  return RANK_TIERS[0]; // Default to bronze
}