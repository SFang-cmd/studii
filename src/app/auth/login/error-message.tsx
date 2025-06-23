"use client";

export default function ErrorMessage({ searchParams }: { searchParams: { error?: string, message?: string } }) {
  if (searchParams.error === 'login_failed') {
    return (
      <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
        <p className="text-red-600 text-sm">Invalid email or password. Please try again.</p>
      </div>
    )
  }
  
  if (searchParams.message === 'check_email') {
    return (
      <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
        <p className="text-green-600 text-sm">Check your email for a confirmation link.</p>
      </div>
    )
  }
  
  return null
}