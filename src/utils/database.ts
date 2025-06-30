// Database utility functions for user progress

import { createClient } from '@/utils/supabase/server'
import { 
  UserSkillProgress, 
  UserSkillProgressInsert, 
  UserSkillProgressUpdate,
  Question,
  QuestionInsert,
  UserProfile,
  UserProfileUpdate,
} from '@/types/database'
import { getAllSkillIds } from '@/types/sat-structure'
import { getSkillIdFromSATCode } from '@/utils/sat-skill-mapping'

// Get all skill progress for a user, initializing with 200 if no data exists
export async function getUserSkillProgress(userId: string): Promise<Record<string, number>> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_skill_progress')
    .select('skill_id, current_score')
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error fetching user skill progress:', error)
    return {}
  }
  
  // Get all skill IDs from SAT structure
  const allSkillIds = getAllSkillIds()
  
  // Convert existing data to skillId -> score format
  const existingScores = data.reduce((acc, row) => {
    acc[row.skill_id] = row.current_score
    return acc
  }, {} as Record<string, number>)
  
  // If user has no progress data, initialize all skills with 200 (SAT minimum)
  if (data.length === 0) {
    const initialScores = allSkillIds.reduce((acc, skillId) => {
      acc[skillId] = 200
      return acc
    }, {} as Record<string, number>)
    
    // Initialize in database
    await initializeUserProgress(userId, initialScores)
    return initialScores
  }
  
  // Fill missing skills with 200 and backfill database if needed
  const completeScores = allSkillIds.reduce((acc, skillId) => {
    acc[skillId] = existingScores[skillId] || 200
    return acc
  }, {} as Record<string, number>)
  
  // Check if we need to backfill any new skills in the database
  const missingSkills = allSkillIds.filter(skillId => !existingScores[skillId])
  if (missingSkills.length > 0) {
    await backfillMissingSkills(userId, missingSkills)
  }
  
  return completeScores
}

// Get user's score for a specific skill
export async function getUserSkillScore(userId: string, skillId: string): Promise<number> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_skill_progress')
    .select('current_score')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .single()
  
  if (error || !data) {
    return 200 // SAT minimum score
  }
  
  return data.current_score
}

// Check if user has any progress data
export async function hasUserProgress(userId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_skill_progress')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
  
  if (error) {
    console.error('Error checking user progress:', error)
    return false
  }
  
  return data.length > 0
}

// Update or insert user skill progress
export async function upsertUserSkillProgress(
  userId: string, 
  skillId: string, 
  updates: Partial<UserSkillProgressUpdate>
): Promise<UserSkillProgress | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_skill_progress')
    .upsert({
      user_id: userId,
      skill_id: skillId,
      ...updates
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error upserting user skill progress:', error)
    return null
  }
  
  return data
}

// Bulk insert initial skill progress for new users
export async function initializeUserProgress(
  userId: string, 
  skillScores: Record<string, number>
): Promise<boolean> {
  const supabase = await createClient()
  
  const insertData: UserSkillProgressInsert[] = Object.entries(skillScores).map(([skillId, score]) => ({
    user_id: userId,
    skill_id: skillId,
    current_score: score
  }))
  
  const { error } = await supabase
    .from('user_skill_progress')
    .insert(insertData)
  
  if (error) {
    console.error('Error initializing user progress:', error)
    return false
  }
  
  return true
}

// Backfill missing skills for existing users (when new skills are added to SAT_STRUCTURE)
export async function backfillMissingSkills(userId: string, missingSkillIds: string[]): Promise<boolean> {
  const supabase = await createClient()
  
  const insertData: UserSkillProgressInsert[] = missingSkillIds.map(skillId => ({
    user_id: userId,
    skill_id: skillId,
    current_score: 200, // SAT minimum
    questions_attempted: 0,
    questions_correct: 0,
    time_spent_minutes: 0
  }))
  
  const { error } = await supabase
    .from('user_skill_progress')
    .insert(insertData)
  
  if (error) {
    console.error('Error backfilling missing skills:', error)
    return false
  }
  
  return true
}

// Get detailed progress with metadata
export async function getUserProgressDetails(userId: string): Promise<UserSkillProgress[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_skill_progress')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching user progress details:', error)
    return []
  }
  
  return data
}

// ==================== SESSION FUNCTIONS REMOVED ====================
// Quiz session functionality removed for clean reimplementation

// ==================== SESSION ANSWERS FUNCTIONS REMOVED ====================
// User session answer functionality removed for clean reimplementation

// ==================== QUESTIONS FUNCTIONS ====================

// Create a new question
export async function createQuestion(questionData: QuestionInsert): Promise<Question | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('questions')
    .insert(questionData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating question:', error)
    return null
  }
  
  return data
}

// Get question by ID
export async function getQuestionById(questionId: string): Promise<Question | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .eq('is_active', true)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data
}

/**
 * Unified function to fetch questions for any practice level using the PostgreSQL stored procedure
 * 
 * @param options Configuration options for question fetching
 * @returns Array of Question objects
 */
export async function getQuestionsForPractice(
  options: {
    level?: 'all' | 'subject' | 'domain' | 'skill';
    targetId?: string;
    
    // Filtering options
    difficultyRange?: [number, number];
    difficultyLevel?: number;
    limit?: number;
    excludeAnsweredQuestions?: boolean;
    userId?: string;
    excludeQuestionIds?: (string | number)[]; // Additional question IDs to exclude
  } = {}
): Promise<Question[]> {
  const supabase = await createClient()
  
  const {
    level = 'all',
    targetId,
    difficultyRange = [1, 7],
    difficultyLevel,
    limit = 10,
    excludeAnsweredQuestions = false,
    userId,
    excludeQuestionIds = []
  } = options

  // Set the level and target ID
  const effectiveLevel = level
  const effectiveTargetId = targetId
  
  // Get excluded question IDs if needed
  let excludeIds: string[] = []
  
  // Add explicitly excluded question IDs
  if (excludeQuestionIds.length > 0) {
    // Convert all IDs to strings
    excludeIds = excludeQuestionIds.map(id => String(id))
  }
  
  // Add user's previously answered questions if requested
  if (excludeAnsweredQuestions && userId) {
    // TODO: Implement getUserAnsweredQuestions when session answers table is enabled
    // For now, skip excluding answered questions to get basic functionality working
    console.log('Skipping answered questions exclusion - function not implemented yet')
  }
  
  // Use the PostgreSQL function for efficient random selection
  try {
    // Set difficulty parameters
    const minDifficulty = difficultyLevel || difficultyRange[0]
    const maxDifficulty = difficultyLevel || difficultyRange[1]
    
    // Call the PostgreSQL function
    const { data, error } = await supabase
      .rpc('get_random_practice_questions',
      {
        level_param: effectiveLevel,
        target_id_param: effectiveTargetId || '',
        min_difficulty: minDifficulty,
        max_difficulty: maxDifficulty,
        exclude_ids: excludeIds,
        limit_param: limit
      }
    )
    
    // Debug logging
    console.log(`getQuestionsForPractice - level: ${effectiveLevel}, targetId: ${effectiveTargetId}`)
    console.log('getQuestionsForPractice - difficultyRange:', [minDifficulty, maxDifficulty])
    console.log('getQuestionsForPractice - excludeIds count:', excludeIds.length)
    console.log('getQuestionsForPractice - data count:', data?.length || 0)
    
    if (error) {
      console.error('Error calling get_random_practice_questions:', error)
      throw new Error(`Failed to fetch questions: ${error.message}`)
    }
    
    return data || []
  } catch (error) {
    console.error('Exception in getQuestionsForPractice:', error)
    throw error
  }
}

/**
 * @deprecated Use getQuestionsForPractice with level='skill' and targetId instead
 * This function is maintained for backward compatibility
 */
export async function getQuestionsBySkill(
  skillId: string,
  options: {
    difficultyRange?: [number, number];
    excludeQuestionIds?: string[];
    limit?: number;
  } = {}
): Promise<Question[]> {
  return getQuestionsForPractice({
    level: 'skill',
    targetId: skillId,
    difficultyRange: options.difficultyRange,
    limit: options.limit,
    // Convert excludeQuestionIds to the format expected by getQuestionsForPractice
    excludeAnsweredQuestions: false,
    userId: undefined
  })
}

// Search questions by content
export async function searchQuestions(
  searchTerm: string,
  filters: {
    skillId?: string;
    difficultyLevel?: number;
    questionType?: 'mcq' | 'grid_in' | 'free_response';
    originId?: string;
    limit?: number;
  } = {}
): Promise<Question[]> {
  const { skillId, difficultyLevel, questionType, originId, limit = 50 } = filters
  
  const supabase = await createClient()
  
  let query = supabase
    .from('questions')
    .select('*')
    .eq('is_active', true)
    .textSearch('question_text', searchTerm)
  
  if (skillId) query = query.eq('skill_id', skillId)
  if (difficultyLevel) query = query.eq('difficulty', difficultyLevel)
  if (questionType) query = query.eq('question_type', questionType)
  if (originId) query = query.eq('origin_id', originId)
  
  query = query.limit(limit)
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error searching questions:', error)
    return []
  }
  
  return data || []
}

// Import SAT question from API format
export async function importSATQuestion(satQuestion: {
  stem: string;
  stimulus?: string;
  type: string;
  answerOptions?: Array<{id: string; content: string}>;
  keys: string[];
  rationale?: string;
  externalid: string;
  correct_answer: string[];
  // From overview endpoint
  skill_cd?: string;
  skill_desc?: string;
  primary_class_cd?: string;
  primary_class_cd_desc?: string;
  difficulty?: string;
  score_band_range_cd?: number;
  questionId?: string;
  createDate?: number;
  updateDate?: number;
}): Promise<Question | null> {
  
  // Map SAT skill code to our skill ID using the mapping utility
  const skillId = satQuestion.skill_cd ? getSkillIdFromSATCode(satQuestion.skill_cd) : null
  if (!skillId) {
    console.error('Could not map SAT skill code to skill ID:', satQuestion.skill_cd)
    return null
  }
  
  // Use SAT's score_band directly (1-7), fallback to letter mapping
  let difficultyLevel = satQuestion.score_band_range_cd || 4 // Default to medium
  
  // If no score_band but have letter, map to approximate score_band
  if (!satQuestion.score_band_range_cd && satQuestion.difficulty) {
    const letterToBandMap: Record<string, number> = { 'E': 2, 'M': 4, 'H': 6 }
    difficultyLevel = letterToBandMap[satQuestion.difficulty] || 4
  }
  
  // Process answer options
  const answerOptions = satQuestion.answerOptions?.map((option) => ({
    id: option.id,
    content: option.content,
    is_correct: satQuestion.keys.includes(option.id)
  }))
  
  const questionData: QuestionInsert = {
    origin: 'sat_official',
    sat_external_id: satQuestion.externalid,
    question_text: satQuestion.stem,
    stimulus: satQuestion.stimulus || undefined,
    question_type: satQuestion.type === 'mcq' ? 'mcq' : 'free_response',
    skill_id: skillId,
    difficulty_band: satQuestion.score_band_range_cd || difficultyLevel,
    difficulty_letter: satQuestion.difficulty,
    answer_options: answerOptions,
    correct_answers: satQuestion.correct_answer,
    explanation: satQuestion.rationale
  }
  
  return createQuestion(questionData)
}

// Get question statistics
export async function getQuestionStats(): Promise<{
  total_questions: number;
  by_origin: Record<string, number>;
  by_skill: Record<string, number>;
  by_difficulty: Record<number, number>;
  by_type: Record<string, number>;
}> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('questions')
    .select('origin_id, skill_id, difficulty, question_type')
    .eq('is_active', true)
  
  if (error || !data) {
    return {
      total_questions: 0,
      by_origin: {},
      by_skill: {},
      by_difficulty: {},
      by_type: {}
    }
  }
  
  const stats = {
    total_questions: data.length,
    by_origin: {} as Record<string, number>,
    by_skill: {} as Record<string, number>,
    by_difficulty: {} as Record<number, number>,
    by_type: {} as Record<string, number>
  }
  
  data.forEach(q => {
    stats.by_origin[q.origin_id] = (stats.by_origin[q.origin_id] || 0) + 1
    stats.by_skill[q.skill_id] = (stats.by_skill[q.skill_id] || 0) + 1
    stats.by_difficulty[q.difficulty] = (stats.by_difficulty[q.difficulty] || 0) + 1
    stats.by_type[q.question_type] = (stats.by_type[q.question_type] || 0) + 1
  })
  
  return stats
}

// Check if question exists by external ID (to avoid duplicates when scraping)
export async function questionExistsByExternalId(externalId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('questions')
    .select('id')
    .eq('external_id', externalId)
    .limit(1)
  
  if (error) {
    console.error('Error checking question existence:', error)
    return false
  }
  
  return (data?.length || 0) > 0
}

// ==================== USER PROFILES FUNCTIONS ====================

// Get user profile by user ID
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data
}

// Create or update user profile
export async function upsertUserProfile(
  userId: string, 
  profileData: Partial<UserProfileUpdate>
): Promise<UserProfile | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: userId,
      ...profileData
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error upserting user profile:', error)
    return null
  }
  
  return data
}

// Update user's last login timestamp
export async function updateLastLogin(userId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('user_profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error updating last login:', error)
    return false
  }
  
  return true
}

// Complete onboarding for user
export async function completeOnboarding(
  userId: string,
  onboardingData: {
    display_name?: string;
    study_goal_score?: number;
    preferred_subjects?: string[];
    study_time_goal_minutes?: number;
    timezone?: string;
  }
): Promise<UserProfile | null> {
  return upsertUserProfile(userId, {
    ...onboardingData,
    onboarding_completed: true
  })
}

// Update study streak (called after completing quiz session)
export async function updateStudyStreak(userId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase.rpc('update_study_streak', {
    user_uuid: userId
  })
  
  if (error) {
    console.error('Error updating study streak:', error)
    return false
  }
  
  return true
}

// Get user study statistics
export async function getUserStudyStats(userId: string): Promise<{
  profile: UserProfile | null;
  current_streak: number;
  longest_streak: number;
  total_study_days: number;
  days_since_last_study: number;
  goal_progress_percentage: number;
}> {
  const profile = await getUserProfile(userId)
  
  if (!profile) {
    return {
      profile: null,
      current_streak: 0,
      longest_streak: 0,
      total_study_days: 0,
      days_since_last_study: 0,
      goal_progress_percentage: 0
    }
  }
  
  // Session tracking removed - set default value for days since last study
  const daysSinceLastStudy = 0
  
  // Calculate goal progress (if user has goal score)
  let goalProgressPercentage = 0
  if (profile.study_goal_score) {
    // Get user's current overall score
    const skillScores = await getUserSkillProgress(userId)
    const totalScore = Object.values(skillScores).reduce((sum, score) => sum + score, 0)
    const currentScore = totalScore // Sum of Math + English
    
    // Calculate progress towards goal (current score / goal score * 100)
    goalProgressPercentage = Math.min((currentScore / profile.study_goal_score) * 100, 100)
  }
  
  return {
    profile,
    current_streak: profile.study_streak_days,
    longest_streak: profile.longest_streak_days,
    total_study_days: profile.total_study_days,
    days_since_last_study: daysSinceLastStudy,
    goal_progress_percentage: goalProgressPercentage
  }
}

// Check if user needs onboarding
export async function needsOnboarding(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId)
  return !profile?.onboarding_completed
}

// Get users with study reminders enabled (for background jobs)
export async function getUsersNeedingReminders(): Promise<UserProfile[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('notifications_enabled', true)
    .eq('email_reminders', true)
    .order('last_login_at', { ascending: false })
  
  if (error || !data) {
    return []
  }
  
  return data
}