/**
 * Stripe Client Initialization
 * Reference: Section 9 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20' as any, // TypeScript types may be ahead of actual API
      typescript: true,
    });
  }
  return stripeInstance;
}

// Export for backward compatibility (lazy initialization)
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripeClient()[prop as keyof Stripe];
  },
});
