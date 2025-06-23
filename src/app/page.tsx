import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-6 md:p-8">
        {/* Logo */}
        <div className="text-6xl" style={{ color: '#495867', fontFamily: 'var(--font-carattere)' }}>
          S
        </div>
        
        {/* Navigation */}
        <div className="flex gap-4">
          <Link href="/auth/login">
            <button 
              className="login-btn px-6 py-2 border-2 rounded-full transition-colors"
              style={{ 
                borderColor: '#495867', 
                color: '#495867',
                backgroundColor: 'transparent'
              }}
            >
              Login
            </button>
          </Link>
          <Link href="/auth/signup">
            <button 
              className="cta-btn px-6 py-2 rounded-full text-white transition-colors"
              style={{ backgroundColor: '#FE5F55' }}
            >
              Get Started
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Main Heading */}
        <h1 className="text-8xl md:text-8xl font-bold mb-4" style={{ color: '#495867' }}>
          Studii
        </h1>
        
        {/* Subtitle */}
        <p className="text-xl md:text-2xl mb-6 max-w-2xl font-bold" style={{ color: '#577399' }}>
          Your ultimate no BS SAT tool
        </p>
        
        {/* CTA Button */}
        <Link href="/auth/signup">
          <button 
            className="cta-btn px-8 py-3 text-white text-lg rounded-full transition-colors"
            style={{ backgroundColor: '#FE5F55' }}
          >
            Get Started
          </button>
        </Link>
      </main>
    </div>
  );
}
