/**
 * Privileged Supabase admin client
 * Uses SERVICE_ROLE_KEY to bypass RLS for budget enforcement checks
 * Reference: Section 7.1 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase admin environment variables');
}

/**
 * Get admin Supabase client with service role key
 * This client bypasses RLS and should only be used server-side
 * for operations that require elevated privileges (e.g., budget checks)
 */
export function createAdminSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Singleton instance
let adminClient: ReturnType<typeof createAdminSupabaseClient> | null = null;

/**
 * Get singleton admin client instance
 */
export function getAdminSupabaseClient() {
  if (!adminClient) {
    adminClient = createAdminSupabaseClient();
  }
  return adminClient;
}
