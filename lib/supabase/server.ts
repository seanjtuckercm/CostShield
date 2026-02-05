/**
 * Server-side Supabase client using @supabase/ssr with Clerk JWT integration
 * Reference: Section 7.1 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 * Reference: MD-FILES/19-SECURITY-LOCKDOWN.md - JWT Integration
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Get server-side Supabase client with Clerk JWT for RLS
 * Use this for RLS-protected queries that need user context
 * 
 * This function:
 * 1. Gets the Clerk JWT token using the "supabase" template
 * 2. Passes it to Supabase via Authorization header using custom fetch
 * 3. Enables RLS policies to check auth.jwt()->>'sub' against clerk_id
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  // Get Clerk JWT token for Supabase RLS
  const { getToken } = await auth();
  const clerkToken = await getToken({ template: 'supabase' });

  // Create custom fetcher that includes Clerk JWT in Authorization header
  const customFetcher: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    
    // Add Clerk JWT to Authorization header if available
    if (clerkToken) {
      headers.set('Authorization', `Bearer ${clerkToken}`);
    }
    
    return fetch(input, {
      ...init,
      headers,
    });
  };

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
    global: {
      fetch: customFetcher,
    },
  });
}

/**
 * Get a basic Supabase client (no session)
 * Use this for public queries or when you need the admin client
 */
export function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}
