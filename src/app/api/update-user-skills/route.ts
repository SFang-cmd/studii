import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 User skills update request received');
    
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ User skills update failed: Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { skillScores } = await request.json();
    
    console.log('🔧 Skill scores to update:', skillScores);
    
    // Validate required fields
    if (!skillScores || Object.keys(skillScores).length === 0) {
      console.log('❌ User skills update failed: Missing skillScores');
      return NextResponse.json(
        { error: 'Missing required field: skillScores' },
        { status: 400 }
      );
    }

    // Call the SQL function to update user skills
    const { data: result, error: updateError } = await supabase
      .rpc('update_user_skills', {
        p_skill_scores: skillScores
      });

    if (updateError) {
      console.log('❌ User skills update SQL error:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to update skill scores' },
        { status: 500 }
      );
    }

    console.log('✅ User skills updated successfully:', result);
    return NextResponse.json({ 
      success: true, 
      result: result
    });
    
  } catch (error) {
    console.log('💥 User skills update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}