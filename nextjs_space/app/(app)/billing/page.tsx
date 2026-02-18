/**
 * Billing & Subscription Management Page
 * Reference: Section 27 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, CreditCard, ExternalLink } from 'lucide-react';

interface Subscription {
  plan_name: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface UsageStats {
  totalRequests: number;
  monthlyLimit: number;
}

const PLAN_FEATURES: { [key: string]: { name: string; requests: string; apiKeys: string; rateLimit: string; price: string } } = {
  free: {
    name: 'Free',
    requests: '10,000/month',
    apiKeys: '2 keys',
    rateLimit: '60/min',
    price: '$0',
  },
  starter: {
    name: 'Starter',
    requests: '100,000/month',
    apiKeys: '10 keys',
    rateLimit: '300/min',
    price: '$15',
  },
  professional: {
    name: 'Professional',
    requests: '1,000,000/month',
    apiKeys: '50 keys',
    rateLimit: '1,000/min',
    price: '$49',
  },
  enterprise: {
    name: 'Enterprise',
    requests: 'Unlimited',
    apiKeys: 'Unlimited',
    rateLimit: '5,000/min',
    price: 'Custom',
  },
};

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    fetchSubscription();
    fetchUsageStats();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/billing/subscription');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }
      const data = await response.json();
      setSubscription(data.subscription);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const response = await fetch('/api/usage');
      if (!response.ok) {
        throw new Error('Failed to fetch usage stats');
      }
      const data = await response.json();
      setUsageStats({
        totalRequests: data.summary?.totalRequests || 0,
        monthlyLimit: getMonthlyLimit(subscription?.plan_name || 'free'),
      });
    } catch (err: any) {
      console.error('Error fetching usage stats:', err);
    }
  };

  const getMonthlyLimit = (planName: string): number => {
    const limits: { [key: string]: number } = {
      free: 10000,
      starter: 100000,
      professional: 1000000,
      enterprise: -1, // Unlimited
    };
    return limits[planName] || 10000;
  };

  const handleUpgrade = async (priceId: string) => {
    setUpgrading(true);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start upgrade');
      setUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    setOpeningPortal(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open billing portal');
      setOpeningPortal(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12 text-gray-500">Loading subscription...</div>
      </div>
    );
  }

  const currentPlan = subscription?.plan_name || 'free';
  const planFeatures = PLAN_FEATURES[currentPlan];
  const usagePercentage = usageStats && usageStats.monthlyLimit > 0
    ? (usageStats.totalRequests / usageStats.monthlyLimit) * 100
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-gray-600 mt-2">
          Manage your subscription and view usage
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your active subscription details</CardDescription>
            </div>
            <Badge variant={currentPlan === 'free' ? 'secondary' : 'default'}>
              {planFeatures.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium capitalize">{subscription?.status || 'active'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Price</p>
              <p className="font-medium">{planFeatures.price}/month</p>
            </div>
            {subscription?.current_period_end && (
              <>
                <div>
                  <p className="text-sm text-gray-600">Current Period End</p>
                  <p className="font-medium">{formatDate(subscription.current_period_end)}</p>
                </div>
                {subscription.cancel_at_period_end && (
                  <div>
                    <p className="text-sm text-gray-600">Cancellation</p>
                    <p className="font-medium text-yellow-600">Cancels at period end</p>
                  </div>
                )}
              </>
            )}
          </div>

          {currentPlan !== 'free' && (
            <Button
              onClick={handleManageBilling}
              disabled={openingPortal}
              variant="outline"
              className="w-full"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {openingPortal ? 'Opening...' : 'Manage Billing'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Usage Progress */}
      {usageStats && usageStats.monthlyLimit > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Usage</CardTitle>
            <CardDescription>Requests used this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{usageStats.totalRequests.toLocaleString()} requests</span>
                <span>{usageStats.monthlyLimit.toLocaleString()} limit</span>
              </div>
              <Progress value={Math.min(usagePercentage, 100)} />
              <p className="text-xs text-gray-500">
                {usagePercentage >= 100
                  ? 'Limit reached. Upgrade to continue.'
                  : `${((usageStats.monthlyLimit - usageStats.totalRequests) / 1000).toFixed(0)}K requests remaining`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Features */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
          <CardDescription>What's included in your current plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span className="text-sm">{planFeatures.requests} requests</span>
            </div>
            <div className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span className="text-sm">{planFeatures.apiKeys} API keys</span>
            </div>
            <div className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span className="text-sm">{planFeatures.rateLimit} rate limit</span>
            </div>
            <div className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span className="text-sm">Budget enforcement</span>
            </div>
            <div className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-green-500" />
              <span className="text-sm">Usage analytics</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      {currentPlan === 'free' && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>Get more requests, API keys, and features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Starter</h3>
                <span className="text-lg font-bold">$15/month</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                100K requests/month, 10 API keys, 300/min rate limit
              </p>
              <Button
                onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '')}
                disabled={upgrading}
                className="w-full"
              >
                {upgrading ? 'Processing...' : 'Upgrade to Starter'}
              </Button>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Professional</h3>
                <span className="text-lg font-bold">$49/month</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                1M requests/month, 50 API keys, 1,000/min rate limit
              </p>
              <Button
                onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '')}
                disabled={upgrading}
                variant="outline"
                className="w-full"
              >
                {upgrading ? 'Processing...' : 'Upgrade to Professional'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
