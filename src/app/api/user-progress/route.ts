import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    
    if (!requestedUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Verify that the requesting user is the same as the requested userId
    // In a real app, you might check for admin role here too
    if (user.id !== requestedUserId) {
      return NextResponse.json({ error: 'Unauthorized to access this user data' }, { status: 403 });
    }
    
    // Query the database for user skill scores
    const { data: skillScores, error } = await supabase
      .from('user_skill_progress')
      .select('skill_id, current_score, updated_at')
      .eq('user_id', requestedUserId);
    
    if (error) {
      console.error('Error querying skill scores:', error);
      return NextResponse.json({ error: 'Failed to fetch user progress' }, { status: 500 });
    }
    
    // Transform the data into the expected format
    const formattedSkillScores: Record<string, number> = {};
    let lastUpdated = new Date(0); // Initialize with oldest possible date
    
    skillScores.forEach((score: { skill_id: string; current_score: number; updated_at: string }) => {
      formattedSkillScores[score.skill_id] = score.current_score;
      
      // Track the most recent update time
      const scoreUpdatedAt = new Date(score.updated_at);
      if (scoreUpdatedAt > lastUpdated) {
        lastUpdated = scoreUpdatedAt;
      }
    });
    
    return NextResponse.json({
      userId: requestedUserId,
      skillScores: formattedSkillScores,
      lastUpdated: lastUpdated.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    return NextResponse.json({ error: 'Failed to fetch user progress' }, { status: 500 });
  }
}
