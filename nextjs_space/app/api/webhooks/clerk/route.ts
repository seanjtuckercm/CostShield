/**
 * Clerk Webhook Handler
 * Synchronizes Clerk users with Supabase database
 * Reference: Section 8.5 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response('Verification failed', { status: 400 });
  }

  const supabase = getAdminSupabaseClient();

  switch (evt.type) {
    case 'user.created': {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses.find(
        (e) => e.id === evt.data.primary_email_address_id
      );

      // Insert user into Supabase
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          clerk_id: id,
          email: primaryEmail?.email_address || '',
          name: [first_name, last_name].filter(Boolean).join(' ') || null,
          image_url: image_url || null,
        })
        .select('id')
        .single();

      if (userError || !user) {
        console.error('Error creating user:', userError);
        return new Response('Error creating user', { status: 500 });
      }

      // Create default free subscription
      await supabase.from('subscriptions').insert({
        user_id: user.id,
        stripe_customer_id: `temp_${user.id}`, // Temporary, will be updated when Stripe customer is created
        plan_name: 'free',
        status: 'active',
      });

      // Create default budget ($5.00 monthly)
      await supabase.from('budgets').insert({
        user_id: user.id,
        name: 'Default Budget',
        period_type: 'monthly',
        amount: 5.00,
        spent: 0,
        is_active: true,
      });

      break;
    }

    case 'user.updated': {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      const primaryEmail = email_addresses.find(
        (e) => e.id === evt.data.primary_email_address_id
      );

      await supabase
        .from('users')
        .update({
          email: primaryEmail?.email_address,
          name: [first_name, last_name].filter(Boolean).join(' ') || null,
          image_url: image_url || null,
        })
        .eq('clerk_id', id);

      break;
    }

    case 'user.deleted': {
      const { id } = evt.data;

      // Note: CASCADE delete will handle related records
      await supabase.from('users').delete().eq('clerk_id', id);

      break;
    }

    default:
      console.log(`Unhandled webhook event type: ${evt.type}`);
  }

  return new Response('Webhook processed', { status: 200 });
}
