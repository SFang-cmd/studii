/**
 * Represents a user's progress across different skills
 */
export interface UserProgress {
  userId: string;
  skillScores: {
    [skillId: string]: number;  // Maps skill IDs to scores (0-800)
  };
  lastUpdated: Date;
}

/**
 * Represents changes in a user's skill scores after a quiz
 */
export interface UserProgressUpdate {
  userId: string;
  skillScores: {
    [skillId: string]: number;  // Maps skill IDs to updated scores
  };
  pointChanges: {
    [skillId: string]: number;  // Maps skill IDs to point changes (positive or negative)
  };
}
