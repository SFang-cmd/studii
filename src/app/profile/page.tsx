import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-6 md:p-8 flex justify-between items-center">
        <Link href="/" className="text-6xl" style={{ color: '#495867', fontFamily: 'var(--font-carattere)' }}>
          Studii
        </Link>
        <Link 
          href="/dashboard" 
          className="px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: '#577399' }}
        >
          ← Back to Dashboard
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-8" style={{ color: '#495867' }}>
            Profile
          </h1>
          
          <div className="bg-white rounded-3xl shadow-lg p-8">
            {/* User Info Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#495867' }}>
                Account Information
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: '#495867' }}
                  >
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-medium" style={{ color: '#495867' }}>
                      {user.email?.split('@')[0]}
                    </h3>
                    <p className="text-sm" style={{ color: '#577399' }}>
                      {user.email}
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm" style={{ color: '#577399' }}>
                    <span className="font-medium">Account created:</span>{' '}
                    {new Date(user.created_at || '').toLocaleDateString()}
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#577399' }}>
                    <span className="font-medium">Last sign in:</span>{' '}
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            {/* Study Progress Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#495867' }}>
                Study Progress
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#F0F4F8' }}>
                  <h3 className="font-medium mb-2" style={{ color: '#495867' }}>Math Score</h3>
                  <p className="text-2xl font-bold" style={{ color: '#FE5F55' }}>Coming Soon</p>
                </div>
                
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#F0F4F8' }}>
                  <h3 className="font-medium mb-2" style={{ color: '#495867' }}>English Score</h3>
                  <p className="text-2xl font-bold" style={{ color: '#FE5F55' }}>Coming Soon</p>
                </div>
                
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#F0F4F8' }}>
                  <h3 className="font-medium mb-2" style={{ color: '#495867' }}>Questions Answered</h3>
                  <p className="text-2xl font-bold" style={{ color: '#FE5F55' }}>0</p>
                </div>
                
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#F0F4F8' }}>
                  <h3 className="font-medium mb-2" style={{ color: '#495867' }}>Study Streak</h3>
                  <p className="text-2xl font-bold" style={{ color: '#FE5F55' }}>0 days</p>
                </div>
              </div>
            </div>

            {/* Settings Section */}
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#495867' }}>
                Settings
              </h2>
              
              <div className="space-y-3">
                <button 
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                  style={{ color: '#577399' }}
                >
                  Change Password
                </button>
                
                <button 
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                  style={{ color: '#577399' }}
                >
                  Email Preferences
                </button>
                
                <button 
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                  style={{ color: '#577399' }}
                >
                  Export Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}