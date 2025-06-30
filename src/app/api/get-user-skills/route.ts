import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('📊 User skills fetch request received');
    
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ User skills fetch failed: Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { skillIds } = await request.json();
    
    // console.log('📊 Skill IDs to fetch:', skillIds);
    console.log('📊 Number of Skill IDs:', skillIds.length);
    
    // Validate required fields
    if (!skillIds || !Array.isArray(skillIds) || skillIds.length === 0) {
      console.log('❌ User skills fetch failed: Missing or invalid skillIds');
      return NextResponse.json(
        { error: 'Missing required field: skillIds (array)' },
        { status: 400 }
      );
    }

    // Call the SQL function to get user skills
    const { data: result, error: fetchError } = await supabase
      .rpc('get_user_skills', {
        p_skill_ids: skillIds
      });

    if (fetchError) {
      console.log('❌ User skills fetch SQL error:', fetchError.message);
      return NextResponse.json(
        { error: 'Failed to fetch skill scores' },
        { status: 500 }
      );
    }

    console.log('✅ User skills fetched successfully:');
    return NextResponse.json({ 
      success: true, 
      result: result
    });
    
  } catch (error) {
    console.log('💥 User skills fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}