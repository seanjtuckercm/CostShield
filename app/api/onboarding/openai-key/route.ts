/**
 * API Route: Save OpenAI API Key
 * Encrypts and stores the user's OpenAI API key
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { getEncryptionService } from '@/lib/encryption';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Get user info from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found in Clerk' }, { status: 404 });
    }

    // Upsert user in Supabase (create if doesn't exist, update if exists)
    // This handles cases where the Clerk webhook hasn't fired yet or failed
    const supabase = getAdminSupabaseClient();
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        clerk_id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
        image_url: clerkUser.imageUrl || null,
      }, {
        onConflict: 'clerk_id',
      })
      .select('id')
      .single();

    if (userError || !user) {
      console.error('Error upserting user:', userError);
      return NextResponse.json({ error: 'Failed to create or find user' }, { status: 500 });
    }

    // Encrypt the API key
    let encryptionService;
    try {
      encryptionService = getEncryptionService();
      // Log encryption key status (first 8 chars only for security)
      const keyPreview = process.env.ENCRYPTION_MASTER_KEY?.substring(0, 8) || 'missing';
      console.log('[Encryption] Key loaded:', keyPreview + '...', 'Length:', process.env.ENCRYPTION_MASTER_KEY?.length || 0);
    } catch (encError: any) {
      console.error('Encryption service error:', encError);
      const errorMessage = encError.message || 'Encryption service unavailable';
      if (errorMessage.includes('ENCRYPTION_MASTER_KEY')) {
        return NextResponse.json({ 
          error: 'Encryption key not configured. Please contact support.',
          details: 'ENCRYPTION_MASTER_KEY is missing or invalid. Must be 64 hex characters (32 bytes).'
        }, { status: 500 });
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const encryptedKey = encryptionService.encrypt(apiKey);
    const keyPrefix = apiKey.substring(0, 7) + '...';
    console.log('[Encryption] Successfully encrypted API key. Encrypted length:', encryptedKey.length);

    // Upsert OpenAI credentials
    const { error: credError } = await supabase
      .from('openai_credentials')
      .upsert({
        user_id: user.id,
        encrypted_key: encryptedKey,
        key_prefix: keyPrefix,
      }, {
        onConflict: 'user_id',
      });

    if (credError) {
      console.error('Error saving OpenAI key:', credError);
      return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in openai-key route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
