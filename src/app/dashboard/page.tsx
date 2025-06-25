import { createClient } from "@/utils/supabase/server";
import NavBar from "@/components/shared/navbar";
import { AllTopicsCard, DashboardContent } from "@/components/dashboard";
import { DUMMY_USER_PROGRESS } from "@/data/dummy-progress";
import { calculateOverallScore } from "@/utils/score-calculations";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Calculate overall SAT score using dummy user progress
  const totalScore = calculateOverallScore(DUMMY_USER_PROGRESS);
  
  // Get user's first name or fallback to "there"
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || "there";

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
                Hey, {firstName}!
              </h1>
              <p className="text-xl text-glaucous">
                Ready to practice?
              </p>
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
          <DashboardContent userProgress={DUMMY_USER_PROGRESS} />
        </div>
      </main>
    </div>
  );
}