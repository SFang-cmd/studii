import { createClient } from "@/utils/supabase/server";
import NavBar from "@/components/shared/navbar";
import { AllTopicsCard, DashboardContent } from "@/components/dashboard";
import { getUserSkillProgress, getUserStudyStats, upsertUserProfile, updateLastLogin } from "@/utils/database";
import { calculateOverallScore } from "@/utils/score-calculations";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // Redirect to login if not authenticated
    return null;
  }
  
  // Get user progress from database
  const skillScores = await getUserSkillProgress(user.id);
  const userProgress = {
    userId: user.id,
    skillScores,
    lastUpdated: new Date()
  };
  
  // Get user profile and study statistics, create profile if needed
  let studyStats = await getUserStudyStats(user.id);
  
  // If no profile exists, create one with basic info
  if (!studyStats.profile) {
    const displayName = user?.user_metadata?.full_name?.split(' ')[0] || 
                       user?.email?.split('@')[0] || 
                       'Student';
    
    await upsertUserProfile(user.id, {
      display_name: displayName,
      onboarding_completed: false, // User hasn't set goals yet
      last_login_at: new Date().toISOString()
    });
    
    // Get updated stats
    studyStats = await getUserStudyStats(user.id);
  } else {
    // Update last login for existing users
    await updateLastLogin(user.id);
  }
  
  // Calculate overall SAT score using real user progress
  const totalScore = calculateOverallScore(userProgress);
  
  // Get user's display name or fallback
  const displayName = studyStats.profile?.display_name || 
                     user?.user_metadata?.full_name?.split(' ')[0] || 
                     user?.email?.split('@')[0] || 
                     "there";

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />

      {/* Main Content */}
      <main className="flex-1 px-6 md:px-8 pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-6 mb-8">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-paynes-gray mb-2">
                Hey, {displayName}!
              </h1>
              <div className="space-y-1">
                <p className="text-xl text-glaucous">
                  Ready to practice?
                </p>
                {studyStats.current_streak > 0 && (
                  <p className="text-sm text-paynes-gray">
                    🔥 {studyStats.current_streak} day study streak!
                  </p>
                )}
                {studyStats.profile?.study_goal_score && (
                  <p className="text-sm text-glaucous">
                    Goal: {studyStats.profile.study_goal_score} ({Math.round(studyStats.goal_progress_percentage)}% complete)
                  </p>
                )}
              </div>
            </div>
            
            <div className="lg:w-80">
              <AllTopicsCard 
                totalScore={totalScore}
                maxScore={1600}
                href="/practice"
              />
            </div>
          </div>

          {/* Dashboard Content with Filtering */}
          <DashboardContent userProgress={userProgress} />
        </div>
      </main>
    </div>
  );
}