import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import UserDropdown from "./user-dropdown";

export default async function NavBar() {
  const supabase = await createClient();
  
  // Force fresh auth check to avoid hydration issues
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="p-6 md:p-8 flex justify-between items-center">
      <Link href="/" className="text-6xl" style={{ color: '#495867', fontFamily: 'var(--font-carattere)' }}>
        Studii
      </Link>
      
      <nav className="flex items-center space-x-4">
        {user ? (
          // Logged in navigation
          <>
            <Link 
              href="/dashboard" 
              className="px-6 py-3 rounded-full text-white font-medium hover:opacity-90 transition-colors"
              style={{ backgroundColor: '#FE5F55' }}
            >
              Dashboard
            </Link>
            <UserDropdown user={user} />
          </>
        ) : (
          // Not logged in navigation
          <>
            <Link 
              href="/auth/login" 
              className="text-lg hover:underline transition-colors"
              style={{ color: '#577399' }}
            >
              Log In
            </Link>
            <Link 
              href="/auth/signup" 
              className="px-6 py-3 rounded-full text-white font-medium hover:opacity-90 transition-colors"
              style={{ backgroundColor: '#FE5F55' }}
            >
              Get Started
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}