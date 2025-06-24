import { createClient } from "@/utils/supabase/server";
import NavBar from "@/components/navbar";
import { SubjectCard } from "@/components/subject-card";
import { AllTopicsCard } from "@/components/all-topics-card";

// Dummy data - will be replaced with real data from database
const dummySubjects = [
  { subject: "Math", currentScore: 770 },
  { subject: "English", currentScore: 922 }
];

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Calculate total score from all subjects
  const totalScore = Math.round(dummySubjects.reduce((sum, subject) => sum + subject.currentScore, 0) / dummySubjects.length);
  
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
                maxScore={1200}
                href="/practice"
              />
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-glaucous rounded-2xl p-6 mb-8">
            <button className="flex items-center gap-2 bg-bittersweet text-white px-4 py-2 rounded-lg font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M7 12h10m-7 6h4"/>
              </svg>
              Filter
            </button>
          </div>

          {/* Subject Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dummySubjects.map((subject, index) => (
              <SubjectCard
                key={index}
                subject={subject.subject}
                currentScore={subject.currentScore}
                href={`/practice/${subject.subject.toLowerCase().replace(/\s+/g, '-')}`}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}