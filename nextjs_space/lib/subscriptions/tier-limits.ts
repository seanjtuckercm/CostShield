/**
 * Tier Limits Configuration
 * Defines rate limits and feature limits per subscription tier
 * Reference: Section 5.3 of COSTSHIELD_MARKETING_WEBSITE_SPEC.md
 */

export interface TierLimits {
  maxApiKeys: number;
  rateLimitPerMinute: number;
  monthlyRequests: number;
}

export const TIER_LIMITS: { [key: string]: TierLimits } = {
  free: {
    maxApiKeys: 2,
    rateLimitPerMinute: 60,
    monthlyRequests: 10000,
  },
  starter: {
    maxApiKeys: 10,
    rateLimitPerMinute: 300,
    monthlyRequests: 100000,
  },
  professional: {
    maxApiKeys: 50,
    rateLimitPerMinute: 1000,
    monthlyRequests: 1000000,
  },
  enterprise: {
    maxApiKeys: -1, // Unlimited
    rateLimitPerMinute: 5000,
    monthlyRequests: -1, // Unlimited
  },
};

export function getTierLimits(planName: string): TierLimits {
  return TIER_LIMITS[planName] || TIER_LIMITS.free;
}
