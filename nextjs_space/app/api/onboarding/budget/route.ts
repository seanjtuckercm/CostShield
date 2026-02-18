/**
 * API Route: Update Budget
 * Updates the user's default budget amount
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await req.json();

    if (!amount || typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'Valid budget amount is required' }, { status: 400 });
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

    // Update default budget
    const { error: budgetError } = await supabase
      .from('budgets')
      .update({
        amount: amount,
      })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (budgetError) {
      console.error('Error updating budget:', budgetError);
      return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in budget route:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
