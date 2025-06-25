// Score Calculation Functions (Separated from Structure)

import { SATDomain, SATSubject, SAT_STRUCTURE } from '@/types/sat-structure';
import { UserProgress } from '@/data/dummy-progress';

// Calculate domain score from skill averages using user progress (scaled to 800)
export function calculateDomainScore(domain: SATDomain, userProgress: UserProgress): number {
  if (domain.skills.length === 0) return 0;
  
  const skillAverage = domain.skills.reduce((sum, skill) => {
    const userScore = userProgress.skillScores[skill.id] || 0;
    return sum + (userScore / skill.maxScore);
  }, 0) / domain.skills.length;
  
  // Scale skill average to 800 points (domain max)
  return Math.round(skillAverage * 800);
}

// Calculate subject score from weighted domain scores using user progress
export function calculateSubjectScore(subject: SATSubject, userProgress: UserProgress): number {
  let weightedScore = 0;
  
  for (const domain of subject.domains) {
    // Calculate domain score (already scaled to 800)
    const domainScore = calculateDomainScore(domain, userProgress);
    const domainPercentage = domainScore / 800; // Domain max is now 800
    
    // Apply weight and scale to 800 points for subject
    weightedScore += domainPercentage * domain.weight * 800;
  }
  
  return Math.round(weightedScore);
}

// Calculate overall SAT score (sum of subjects) using user progress
export function calculateOverallScore(userProgress: UserProgress): number {
  return SAT_STRUCTURE.reduce((sum, subject) => {
    return sum + calculateSubjectScore(subject, userProgress);
  }, 0);
}

// Helper function to get user's current score for a specific skill
export function getUserSkillScore(skillId: string, userProgress: UserProgress): number {
  return userProgress.skillScores[skillId] || 0;
}