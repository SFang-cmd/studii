import { z } from 'zod'

// Authentication validation schemas
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email is too long')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long'), // Reasonable max to prevent DoS
})

export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email is too long')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])|(?=.*[a-z])(?=.*\d)|(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least 2 of: lowercase, uppercase, or numbers'
    ),
})

// Redirect validation schema
export const redirectSchema = z
  .string()
  .optional()
  .refine((url) => {
    if (!url) return true
    // Only allow relative URLs starting with / and not // (to prevent open redirects)
    return url.startsWith('/') && !url.startsWith('//')
  }, 'Invalid redirect URL')

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>