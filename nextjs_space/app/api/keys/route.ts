/**
 * API Keys Management Routes
 * Handles creation, listing, and deletion of CostShield API keys
 * Reference: Section 23 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { getTierLimits } from '@/lib/subscriptions/tier-limits';
import { getEncryptionService } from '@/lib/encryption';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Hash API key using SHA-256
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate a secure random API key
 * Format: cs_live_<32 random hex characters>
 */
function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(16); // 16 bytes = 32 hex characters
  const randomHex = randomBytes.toString('hex');
  return `cs_live_${randomHex}`;
}

/**
 * Encrypt API key for storage (reversible)
 */
function encryptApiKey(apiKey: string): string {
  try {
    const encryptionService = getEncryptionService();
    return encryptionService.encrypt(apiKey);
  } catch (error) {
    console.error('Encryption service not available:', error);
    // Fallback: store with a recognizable prefix for later decryption
    return `raw:${apiKey}`;
  }
}

/**
 * Decrypt API key from storage
 */
function decryptApiKey(encryptedKey: string): string {
  try {
    // Handle raw keys (fallback from when encryption wasn't available)
    if (encryptedKey.startsWith('raw:')) {
      return encryptedKey.substring(4);
    }
    // Handle truncated keys (old format)
    if (encryptedKey.endsWith('...')) {
      return encryptedKey; // Can't decrypt, return as-is
    }
    const encryptionService = getEncryptionService();
    return encryptionService.decrypt(encryptedKey);
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedKey; // Return as-is if decryption fails
  }
}

/**
 * GET /api/keys
 * List all API keys for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();
    
    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all API keys for this user
    const { data: apiKeys, error: keysError } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, is_active, last_used_at, created_at, budget_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (keysError) {
      console.error('Error fetching API keys:', keysError);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    // Decrypt API keys for display
    const decryptedKeys = (apiKeys || []).map(key => ({
      ...key,
      key_prefix: key.key_prefix ? decryptApiKey(key.key_prefix) : null,
    }));

    return NextResponse.json({ keys: decryptedKeys });
  } catch (error: any) {
    console.error('Error in GET /api/keys:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/keys
 * Create a new API key
 * Returns the raw key ONCE - user must save it immediately
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, budget_id } = await req.json();

    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
      return NextResponse.json({ error: 'Name is required and must be between 1 and 100 characters' }, { status: 400 });
    }

    const supabase = getAdminSupabaseClient();
    
    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check user's subscription tier for API key limits
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('plan_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const planName = subscription?.plan_name || 'free';

    // Free tier: max 2 API keys
    if (planName === 'free') {
      const { data: existingKeys, error: keysCountError } = await supabase
        .from('api_keys')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (keysCountError) {
        console.error('Error counting API keys:', keysCountError);
        return NextResponse.json({ error: 'Failed to check API key limit' }, { status: 500 });
      }

      const keyCount = existingKeys?.length || 0;
      if (keyCount >= 2) {
        return NextResponse.json(
          { error: 'Free tier is limited to 2 API keys. Upgrade to create more.' },
          { status: 403 }
        );
      }
    }

    // Validate budget_id if provided
    if (budget_id) {
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .select('id')
        .eq('id', budget_id)
        .eq('user_id', user.id)
        .single();

      if (budgetError || !budget) {
        return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
      }
    }

    // Get tier limits for rate limit
    const tierLimits = getTierLimits(planName);

    // Generate new API key
    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);
    const encryptedKey = encryptApiKey(rawKey); // Store encrypted full key for retrieval

    // Insert into database
    const { data: apiKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        key_hash: keyHash,
        key_prefix: encryptedKey, // Store encrypted key instead of truncated prefix
        name: name,
        budget_id: budget_id || null,
        rate_limit_per_minute: tierLimits.rateLimitPerMinute,
        is_active: true,
      })
      .select('id, name, key_prefix, created_at')
      .single();

    if (insertError) {
      console.error('Error creating API key:', insertError);
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }

    // Return the raw key ONLY ONCE
    return NextResponse.json({
      key: rawKey,
      keyData: apiKey,
      warning: 'Save this key now. You will not be able to see it again.',
    });
  } catch (error: any) {
    console.error('Error in POST /api/keys:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
