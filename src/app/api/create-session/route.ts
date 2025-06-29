import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { session_type, target_id } = await request.json();
    
    // Validate required fields
    if (!session_type || !target_id) {
      return NextResponse.json(
        { error: 'Missing required fields: session_type and target_id' },
        { status: 400 }
      );
    }

    // Call the SQL function to create new quiz session
    const { data: sessions, error: sessionError } = await supabase
      .rpc('create_quiz_session', {
        p_user_id: user.id,
        p_session_type: session_type,
        p_target_id: target_id
      });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // The function returns an array, get the first (and only) result
    const session = sessions?.[0];
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session creation failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error in create-session API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}