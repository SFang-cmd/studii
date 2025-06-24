import Link from "next/link";
import { signup, signInWithGoogle, signInWithFacebook } from "../actions";
import ErrorMessage from "./error-message";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with Logo */}
      <header className="p-6 md:p-8">
        <Link href="/" className="text-6xl" style={{ color: '#495867', fontFamily: 'var(--font-carattere)' }}>
          Studii
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-white rounded-3xl shadow-lg p-8">
            {/* Title */}
            <h1 className="text-3xl font-bold text-center mb-8" style={{ color: '#495867' }}>
              Sign Up
            </h1>

            <ErrorMessage searchParams={params} />
            
            {/* Form */}
            <form action={signup} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#495867' }}>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Email"
                  className="w-full px-4 py-3 rounded-lg border-0 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  style={{ backgroundColor: '#F0F4F8' }}
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: '#495867' }}>
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Password"
                  className="w-full px-4 py-3 rounded-lg border-0 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  style={{ backgroundColor: '#F0F4F8' }}
                />
              </div>

              {/* Sign Up Button */}
              <button
                type="submit"
                className="w-full py-3 rounded-lg text-white font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: '#FE5F55' }}
              >
                Sign Up
              </button>
            </form>

            {/* Divider */}
            <div className="my-8 flex items-center">
              <div className="flex-1 border-t-2" style={{ borderColor: '#495867' }}></div>
            </div>

            {/* Social Login Buttons */}
            <div className="flex justify-center space-x-4">
              {/* Google */}
              <form action={signInWithGoogle} className="inline">
                <button type="submit" className="w-12 h-12 rounded-full bg-white border border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </button>
              </form>
              
              {/* Facebook */}
              <form action={signInWithFacebook} className="inline">
                <button type="submit" className="w-12 h-12 rounded-full text-white flex items-center justify-center hover:opacity-90 transition-colors" style={{ backgroundColor: '#1877F2' }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
              </form>
              
            </div>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm" style={{ color: '#577399' }}>
                Already have an account?{' '}
                <Link href="/auth/login" className="font-medium hover:underline" style={{ color: '#495867' }}>
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}