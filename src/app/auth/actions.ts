'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const redirectTo = formData.get('redirectTo') as string

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        console.error('Error logging in:', error)
        redirect('/auth/login?error=login_failed')
        return
    }
    
    revalidatePath('/')
    redirect(redirectTo || '/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        console.error('Error signing up:', error)
        redirect('/auth/signup?error=signup_failed')
        return
    }

    redirect('/auth/login?message=check_email')
}

export async function logout() {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
        console.error('Error logging out:', error)
        return
    }
    
    revalidatePath('/', 'layout')
    redirect('/')
}

async function signInWithOAuth(provider: 'google' | 'facebook') {
    const supabase = await createClient()
    const origin = (await headers()).get('origin')
    
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    })

    if (error) {
        console.error(`Error with ${provider} OAuth:`, error)
        redirect('/auth/login?error=oauth_failed')
        return
    }

    if (data.url) {
        redirect(data.url)
    }
}

export async function signInWithGoogle() {
    return signInWithOAuth('google')
}

export async function signInWithFacebook() {
    return signInWithOAuth('facebook')
}

