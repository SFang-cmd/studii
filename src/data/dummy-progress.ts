// User Progress Types and Dummy Data for Development

export interface UserProgress {
  userId: string;
  skillScores: Record<string, number>; // skillId -> currentScore
  lastUpdated: Date;
}

// Dummy user progress data for development
export const DUMMY_USER_PROGRESS: UserProgress = {
  userId: 'demo-user',
  lastUpdated: new Date(),
  skillScores: {
    // Math - Algebra
    'linear-equations-one-var': 740,
    'linear-functions': 347,
    'linear-equations-two-var': 537,
    'systems-linear-equations': 442,
    'linear-inequalities': 271,
    
    // Math - Advanced Math
    'nonlinear-functions': 707,
    'nonlinear-equations-systems': 669,
    
    // Math - Problem-Solving & Data Analysis
    'ratios-rates-proportions': 430,
    'percentages': 658,
    'one-variable-data': 728,
    'two-variable-data': 342,
    'probability-conditional': 448,
    'inference-statistics': 773,
    'statistical-claims': 338,
    
    // Math - Geometry & Trigonometry
    'area-volume': 427,
    'lines-angles-triangles': 286,
    'right-triangles-trigonometry': 522,
    'circles': 701,
    
    // English - Information & Ideas
    'central-ideas-details': 799,
    'inferences': 488,
    'command-evidence': 793,
    
    // English - Craft & Structure
    'words-in-context': 286,
    'text-structure-purpose': 777,
    'cross-text-connections': 426,
    
    // English - Expression of Ideas
    'rhetorical-synthesis': 567,
    'transitions': 582,
    
    // English - Standard English Conventions
    'boundaries': 769,
    'form-structure-sense': 328
  }
};

// Helper function to get user's score for a specific skill
export function getUserSkillScore(userId: string, skillId: string): number {
  // In future, this would query the database
  // For now, return dummy data
  return DUMMY_USER_PROGRESS.skillScores[skillId] || 0;
}

// Helper function to check if user has progress data
export function hasUserProgress(userId: string): boolean {
  // In future, this would check database
  return userId === 'demo-user';
}