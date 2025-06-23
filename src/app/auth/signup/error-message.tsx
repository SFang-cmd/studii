"use client";

export default function ErrorMessage({ searchParams }: { searchParams: { error?: string } }) {
  if (searchParams.error === 'signup_failed') {
    return (
      <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
        <p className="text-red-600 text-sm">Failed to create account. Please try again.</p>
      </div>
    )
  }
  
  return null
}