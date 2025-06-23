import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function HomeButton() {
    const supabase = await createClient();
    
    // Force fresh auth check to avoid hydration issues
    const { data: { user } } = await supabase.auth.getUser();

    return (
        user ? (
            <Link 
                href="/dashboard"
                className="px-8 py-3 text-white text-lg font-medium rounded-full hover:opacity-90 transition-colors"
                style={{ backgroundColor: '#FE5F55' }}
            >
                Dashboard
            </Link>
        ) : (
            <Link 
                href="/auth/signup"
                className="px-8 py-3 text-white text-lg font-medium rounded-full hover:opacity-90 transition-colors"
                style={{ backgroundColor: '#FE5F55' }}
            >
                Get Started
            </Link>
        )
    )
}