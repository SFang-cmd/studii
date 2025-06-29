import { getSkillHierarchy } from '@/types/sat-structure';
import { QuizQuestion } from '@/components/quiz/quiz-interface-v2';
import { calculateDomainScore, calculateSubjectScore } from './score-calculations';
import { UserProgress } from '@/types/user-progress';

// Define types for tracking point changes
export interface PointChange {
  before: number;
  after: number;
  change: number;
}

export interface SkillPointChanges {
  [skillId: string]: PointChange;
}

export interface DomainPointChanges {
  [domainId: string]: PointChange;
}

export interface SubjectPointChanges {
  [subjectId: string]: PointChange;
}

export interface OverallPointChange {
  before: number;
  after: number;
  change: number;
}

export interface RankPointChanges {
  skills: SkillPointChanges;
  domains: DomainPointChanges;
  subjects: SubjectPointChanges;
  overall: OverallPointChange;
}

/**
 * Calculate points to add or subtract based on question difficulty and correctness
 * 
 * @param difficultyBand Numeric difficulty band of the question (1-7)
 *        This should be the difficultyBand property from the database
 *        NOT the string difficulty ('easy', 'medium', 'hard')
 * @param isCorrect Whether the answer was correct
 * @returns Number of points to add (positive) or subtract (negative)
 */
export function calculatePointsForQuestion(difficultyBand: number, isCorrect: boolean): number {
  // Default to medium difficulty (4) if not provided
  // This ensures backward compatibility with code that might pass undefined
  const effectiveDifficulty = difficultyBand || 4;
  
  console.log(`Calculating points with difficulty band: ${effectiveDifficulty}, isCorrect: ${isCorrect}`);
  
  if (isCorrect) {
    // For correct answers: Add difficulty_band points
    return effectiveDifficulty;
  } else {
    // For incorrect answers: Subtract (8-difficulty_band) points
    return -(8 - effectiveDifficulty);
  }
}

/**
 * Update user progress with point changes from answered questions
 * @param questions Array of answered questions
 * @param selectedAnswers Record of selected answers by question ID
 * @param userProgress Current user progress
 * @returns Updated user progress and point changes
 */
export function updateUserProgressWithPoints(
  questions: QuizQuestion[],
  selectedAnswers: Record<string, string>,
  userProgress: UserProgress
): { updatedProgress: UserProgress; pointChanges: RankPointChanges } {
  // Deep clone the user progress to avoid mutations
  const updatedProgress: UserProgress = {
    userId: userProgress.userId,
    skillScores: { ...userProgress.skillScores },
    lastUpdated: new Date()
  };
  
  // Initialize point change tracking
  const pointChanges: RankPointChanges = {
    skills: {},
    domains: {},
    subjects: {},
    overall: { before: 0, after: 0, change: 0 }
  };
  
  // Track affected domains and subjects for recalculation
  const affectedDomains = new Set<string>();
  const affectedSubjects = new Set<string>();
  
  // Process each question to update skill points
  questions.forEach(question => {
    const skillId = question.skillId;
    if (!skillId) return; // Skip questions without a skill ID
    
    const isCorrect = selectedAnswers[question.id] === question.correctAnswer;
    const pointChange = calculatePointsForQuestion(question.difficultyBand || 4, isCorrect);
    
    // Get current skill score
    const currentScore = updatedProgress.skillScores[skillId] || 200; // Default to 200 if not found
    
    // Store the before state
    if (!pointChanges.skills[skillId]) {
      pointChanges.skills[skillId] = {
        before: currentScore,
        after: currentScore,
        change: 0
      };
    }
    
    // Update the skill score
    const newScore = Math.max(0, Math.min(800, currentScore + pointChange)); // Clamp between 0-800
    updatedProgress.skillScores[skillId] = newScore;
    
    // Update the point change tracking
    pointChanges.skills[skillId].after = newScore;
    pointChanges.skills[skillId].change += pointChange;
    
    // Track which domains and subjects are affected by this skill change
    const hierarchy = getSkillHierarchy(skillId);
    if (hierarchy) {
      affectedDomains.add(hierarchy.domain.id);
      affectedSubjects.add(hierarchy.subject.id);
    }
  });
  
  // Calculate domain scores before and after
  affectedDomains.forEach(domainId => {
    const hierarchy = getSkillHierarchy(Array.from(affectedDomains)[0]);
    if (!hierarchy) return;
    
    const domain = hierarchy.domain;
    
    // Calculate before score using original progress
    const beforeScore = calculateDomainScore(domain, userProgress);
    
    // Calculate after score using updated progress
    const afterScore = calculateDomainScore(domain, updatedProgress);
    
    // Store domain point changes
    pointChanges.domains[domainId] = {
      before: beforeScore,
      after: afterScore,
      change: afterScore - beforeScore
    };
  });
  
  // Calculate subject scores before and after
  affectedSubjects.forEach(subjectId => {
    const hierarchy = getSkillHierarchy(Array.from(affectedDomains)[0]);
    if (!hierarchy) return;
    
    const subject = hierarchy.subject;
    
    // Calculate before score using original progress
    const beforeScore = calculateSubjectScore(subject, userProgress);
    
    // Calculate after score using updated progress
    const afterScore = calculateSubjectScore(subject, updatedProgress);
    
    // Store subject point changes
    pointChanges.subjects[subjectId] = {
      before: beforeScore,
      after: afterScore,
      change: afterScore - beforeScore
    };
  });
  
  // Calculate overall score change (average of subject changes)
  const subjectChanges = Object.values(pointChanges.subjects);
  if (subjectChanges.length > 0) {
    const beforeOverall = subjectChanges.reduce((sum, change) => sum + change.before, 0) / subjectChanges.length;
    const afterOverall = subjectChanges.reduce((sum, change) => sum + change.after, 0) / subjectChanges.length;
    
    pointChanges.overall = {
      before: Math.round(beforeOverall),
      after: Math.round(afterOverall),
      change: Math.round(afterOverall - beforeOverall)
    };
  }
  
  return { updatedProgress, pointChanges };
}

/**
 * Update the database with the user's updated skill scores
 * @param userId User ID
 * @param updatedScores Updated skill scores
 * @returns Promise resolving to success status
 */
export async function updateUserSkillScoresInDatabase(
  userId: string,
  updatedScores: Record<string, number>
): Promise<boolean> {
  try {
    const response = await fetch('/api/update-skill-scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        skillScores: updatedScores
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error updating skill scores: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to update skill scores:', error);
    return false;
  }
}
