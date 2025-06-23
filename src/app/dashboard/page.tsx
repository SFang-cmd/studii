import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-6 md:p-8 flex justify-between items-center">
        <Link href="/" className="text-6xl" style={{ color: '#495867', fontFamily: 'var(--font-carattere)' }}>
          Studii
        </Link>
        <div className="text-right">
          <p className="text-sm" style={{ color: '#577399' }}>Welcome back!</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8" style={{ color: '#495867' }}>
            Dashboard
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Math Card */}
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#495867' }}>
                Math
              </h2>
              <p className="text-sm mb-4" style={{ color: '#577399' }}>
                Practice algebra, geometry, and more
              </p>
              <button 
                className="w-full py-3 rounded-lg text-white font-medium transition-colors"
                style={{ backgroundColor: '#FE5F55' }}
              >
                Start Practice
              </button>
            </div>

            {/* English Card */}
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#495867' }}>
                English
              </h2>
              <p className="text-sm mb-4" style={{ color: '#577399' }}>
                Reading comprehension and writing
              </p>
              <button 
                className="w-full py-3 rounded-lg text-white font-medium transition-colors"
                style={{ backgroundColor: '#FE5F55' }}
              >
                Start Practice
              </button>
            </div>

            {/* Progress Card */}
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#495867' }}>
                Progress
              </h2>
              <p className="text-sm mb-4" style={{ color: '#577399' }}>
                Track your improvement
              </p>
              <button 
                className="w-full py-3 rounded-lg text-white font-medium transition-colors"
                style={{ backgroundColor: '#FE5F55' }}
              >
                View Stats
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}