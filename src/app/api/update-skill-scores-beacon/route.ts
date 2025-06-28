import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * API route handler for updating user skill scores via beacon API
 * This endpoint is specifically designed to work with navigator.sendBeacon
 * which sends data during page unload events
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the JSON data from the request
    const data = await request.json();
    const { userId, skillScores } = data;
    
    // Validate required fields
    if (!userId || !skillScores) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and skillScores' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabase = await createClient();
    
    // Update each skill score in the database
    const updatePromises = Object.entries(skillScores).map(async ([skillId, score]) => {
      // Ensure score is within valid range (0-800)
      const validScore = Math.max(0, Math.min(800, Number(score)));
      
      // Upsert the skill progress record
      const { error } = await supabase
        .from('user_skill_progress')
        .upsert({
          user_id: userId,
          skill_id: skillId,
          current_score: validScore,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,skill_id'
        });
      
      if (error) {
        console.error(`Error updating skill ${skillId}:`, error);
        return false;
      }
      
      return true;
    });
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    // Return a 202 Accepted response to acknowledge receipt
    // This is appropriate for beacon requests where we can't return data to the client
    return new NextResponse(null, { status: 202 });
    
  } catch (error) {
    console.error('Error processing skill scores update via beacon:', error);
    
    // Still return 202 since this is a beacon request and the client won't see the response
    return new NextResponse(null, { status: 202 });
  }
}
