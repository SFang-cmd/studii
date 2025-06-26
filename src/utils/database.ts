// Database utility functions for user progress

import { createClient } from '@/utils/supabase/server'
import { UserSkillProgress, UserSkillProgressInsert, UserSkillProgressUpdate } from '@/types/database'

// Get all skill progress for a user
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
  
  // Convert to skillId -> score format (matching DUMMY_USER_PROGRESS.skillScores)
  return data.reduce((acc, row) => {
    acc[row.skill_id] = row.current_score
    return acc
  }, {} as Record<string, number>)
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
    return 0 // No progress yet
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