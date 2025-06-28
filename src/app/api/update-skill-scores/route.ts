import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId, skillScores } = await request.json();
    
    if (!userId || !skillScores) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and skillScores' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Verify the user exists and is authorized
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Prepare batch upsert data
    const upsertData = Object.entries(skillScores).map(([skillId, score]) => ({
      user_id: userId,
      skill_id: skillId,
      current_score: score,
      updated_at: new Date().toISOString()
    }));
    
    // Batch upsert all skill scores
    const { error } = await supabase
      .from('user_skill_progress')
      .upsert(upsertData, {
        onConflict: 'user_id,skill_id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('Error updating skill scores:', error);
      return NextResponse.json(
        { error: 'Failed to update skill scores' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in update-skill-scores API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
