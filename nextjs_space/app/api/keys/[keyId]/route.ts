/**
 * API Key Individual Route
 * Handles update and deletion of a specific API key
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';

/**
 * PATCH /api/keys/[keyId]
 * Update an API key (name, is_active, budget_id)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, is_active, budget_id } = await req.json();

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

    // Verify the API key belongs to this user
    const { data: existingKey, error: keyError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('id', params.keyId)
      .eq('user_id', user.id)
      .single();

    if (keyError || !existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
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

    // Build update object
    const updateData: any = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.length < 1 || name.length > 100) {
        return NextResponse.json({ error: 'Name must be between 1 and 100 characters' }, { status: 400 });
      }
      updateData.name = name;
    }
    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active);
    }
    if (budget_id !== undefined) {
      updateData.budget_id = budget_id || null;
    }

    // Update the API key
    const { data: updatedKey, error: updateError } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', params.keyId)
      .select('id, name, key_prefix, is_active, last_used_at, created_at, budget_id')
      .single();

    if (updateError) {
      console.error('Error updating API key:', updateError);
      return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
    }

    return NextResponse.json({ key: updatedKey });
  } catch (error: any) {
    console.error('Error in PATCH /api/keys/[keyId]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/keys/[keyId]
 * Delete an API key
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { keyId: string } }
) {
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

    // Verify the API key belongs to this user
    const { data: existingKey, error: keyError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('id', params.keyId)
      .eq('user_id', user.id)
      .single();

    if (keyError || !existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Delete the API key
    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', params.keyId);

    if (deleteError) {
      console.error('Error deleting API key:', deleteError);
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/keys/[keyId]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
