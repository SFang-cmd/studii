import Link from "next/link";
import { signup } from "../actions";
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
            <div className="flex justify-center space-x-6">
              {/* Google */}
              <button className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-xl font-bold hover:bg-gray-800 transition-colors">
                G
              </button>
              
              {/* LinkedIn */}
              <button className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-xl font-bold hover:bg-gray-800 transition-colors">
                in
              </button>
              
              {/* Facebook */}
              <button className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-xl font-bold hover:bg-gray-800 transition-colors">
                f
              </button>
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