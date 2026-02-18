/**
 * Stripe Webhook Handler
 * Syncs Stripe subscription events with Supabase
 * Reference: Section 9.2 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 * Reference: Section 9.2 of COSTSHIELD_FAILURE_MODES.md (Idempotency)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';

// Map Stripe plan IDs to our plan names
const PLAN_NAME_MAP: { [key: string]: string } = {
  'price_starter': 'starter',
  'price_pro': 'professional',
  // Add more mappings as needed
};

// Map Stripe status to our status
const STATUS_MAP: { [key: string]: string } = {
  'active': 'active',
  'canceled': 'canceled',
  'past_due': 'past_due',
  'incomplete': 'incomplete',
  'trialing': 'trialing',
};

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events
 */
export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const supabase = getAdminSupabaseClient();

  // Check for idempotency - track processed event IDs
  const { data: existingEvent, error: eventCheckError } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existingEvent) {
    console.log(`Event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true, message: 'Event already processed' });
  }

  // Store event ID for idempotency (create table if needed)
  try {
    await supabase.from('webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    });
  } catch (insertError) {
    // Table might not exist yet, log but continue
    console.warn('Could not store webhook event ID (table may not exist):', insertError);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get customer metadata to find user
        const stripe = getStripeClient();
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const clerkId = (customer as Stripe.Customer).metadata?.clerk_id;
        const supabaseUserId = (customer as Stripe.Customer).metadata?.supabase_user_id;

        if (!clerkId && !supabaseUserId) {
          console.error('No user metadata found in Stripe customer');
          return NextResponse.json({ error: 'No user metadata found' }, { status: 400 });
        }

        // Find user by clerk_id or supabase_user_id
        let user;
        if (supabaseUserId) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('id', supabaseUserId)
            .single();
          user = userData;
        } else if (clerkId) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('clerk_id', clerkId)
            .single();
          user = userData;
        }

        if (!user) {
          console.error('User not found in Supabase');
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Determine plan name from price ID
        const priceId = subscription.items.data[0]?.price.id;
        let planName = 'free';
        if (priceId && PLAN_NAME_MAP[priceId]) {
          planName = PLAN_NAME_MAP[priceId];
        } else {
          // Try to infer from price amount or metadata
          const priceAmount = subscription.items.data[0]?.price.unit_amount;
          if (priceAmount === 1500) planName = 'starter'; // $15.00
          else if (priceAmount === 4900) planName = 'professional'; // $49.00
        }

        // Map Stripe status
        const status = STATUS_MAP[subscription.status] || 'active';

        // Upsert subscription
        const sub = subscription as any; // Stripe types can be inconsistent
        await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: user.id,
              stripe_customer_id: subscription.customer as string,
              stripe_subscription_id: subscription.id,
              plan_name: planName,
              status: status,
              current_period_start: sub.current_period_start 
                ? new Date(sub.current_period_start * 1000).toISOString()
                : null,
              current_period_end: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
              cancel_at_period_end: sub.cancel_at_period_end || false,
            },
            {
              onConflict: 'user_id',
            }
          );

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get customer metadata
        const stripe = getStripeClient();
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const supabaseUserId = (customer as Stripe.Customer).metadata?.supabase_user_id;

        if (supabaseUserId) {
          // Update subscription to canceled status
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              plan_name: 'free',
            })
            .eq('user_id', supabaseUserId);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
