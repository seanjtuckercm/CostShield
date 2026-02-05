/**
 * Dashboard Page
 * High-fidelity dashboard with real-time stats and onboarding prompts
 * Reference: Section 22 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BudgetProgress } from '@/components/app/dashboard/budget-progress';
import { RecentRequests } from '@/components/app/dashboard/recent-requests';
import { IntegrationGuide } from '@/components/app/dashboard/integration-guide';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Activity, Key } from 'lucide-react';
import { getEncryptionService } from '@/lib/encryption';

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

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const supabase = await createServerSupabaseClient();

  // Get user ID from Supabase first (required for all other queries)
  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('id, name')
    .eq('clerk_id', userId)
    .maybeSingle();

  // If user doesn't exist in Supabase yet (webhook hasn't run), redirect to onboarding
  if (userError || !dbUser) {
    redirect('/onboarding');
  }

  // Onboarding Gatekeeper: Check if user has completed setup
  // Reference: PRE_RELEASE_AUDIT.md - High-Priority Fix #3
  const { data: credentials, error: credError } = await supabase
    .from('openai_credentials')
    .select('id')
    .eq('user_id', dbUser.id)
    .maybeSingle();

  // If no OpenAI credentials found, redirect to onboarding
  if (!credError && !credentials) {
    redirect('/onboarding');
  }

  // FORENSIC TEST: Error Boundary Trigger (REMOVED - Test completed)
  // throw new Error("Forensic Test");

  // Get user's budget (optional - may not exist yet)
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .select('amount, spent, period_type, name')
    .eq('user_id', dbUser.id)
    .eq('is_active', true)
    .maybeSingle();

  const budgetAmount = budget ? Number(budget.amount) : 0;
  const budgetSpent = budget ? Number(budget.spent) : 0;

  // Fetch usage stats directly from database
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: usageLogs } = await supabase
    .from('usage_logs')
    .select('cost, prompt_tokens, completion_tokens, total_tokens, created_at, model, endpoint, status_code')
    .eq('user_id', dbUser?.id || '')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(5);

  // Calculate stats
  const totalRequests = usageLogs?.length || 0;
  const totalTokens = usageLogs?.reduce((sum, log) => sum + Number(log.total_tokens || 0), 0) || 0;
  const totalSpend = usageLogs?.reduce((sum, log) => sum + Number(log.cost || 0), 0) || 0;

  // Get all usage for accurate totals
  const { count: totalRequestsCount } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', dbUser.id)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const { data: allUsageLogs } = await supabase
    .from('usage_logs')
    .select('cost, total_tokens')
    .eq('user_id', dbUser.id)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const actualTotalRequests = totalRequestsCount || 0;
  const actualTotalSpend = allUsageLogs?.reduce((sum, log) => sum + Number(log.cost || 0), 0) || 0;
  const actualTotalTokens = allUsageLogs?.reduce((sum, log) => sum + Number(log.total_tokens || 0), 0) || 0;

  // Fetch API keys
  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('id, key_prefix, is_active')
    .eq('user_id', dbUser.id);

  const apiKeyCount = apiKeys?.length || 0;
  const encryptedPrimaryKey = apiKeys?.find((key) => key.is_active)?.key_prefix || apiKeys?.[0]?.key_prefix;
  // Decrypt the API key for display
  const primaryApiKey = encryptedPrimaryKey ? decryptApiKey(encryptedPrimaryKey) : undefined;

  // Format recent requests
  const recentRequests = (usageLogs || []).map((log) => ({
    id: log.created_at, // Use timestamp as ID for display
    model: log.model || 'unknown',
    endpoint: log.endpoint || 'unknown',
    cost: Number(log.cost || 0),
    status_code: log.status_code || 200,
    created_at: log.created_at,
  }));

  // Determine if user has made any requests
  const hasRequests = actualTotalRequests > 0;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://costshield.cloud';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {dbUser.name || user?.firstName || 'there'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's your budget overview and usage stats
        </p>
      </div>

      {/* Integration Guide for New Users */}
      {!hasRequests && (
        <IntegrationGuide 
          apiKey={primaryApiKey}
          baseUrl={baseUrl}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Budget Progress Card */}
        <BudgetProgress
          spent={budgetSpent}
          limit={budgetAmount}
          periodType={budget?.period_type || 'monthly'}
          budgetName={budget?.name}
        />

        {/* Quick Stats Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${actualTotalSpend.toFixed(6)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actualTotalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {actualTotalTokens >= 1000000
                ? `${(actualTotalTokens / 1000000).toFixed(2)}M`
                : actualTotalTokens >= 1000
                ? `${(actualTotalTokens / 1000).toFixed(2)}K`
                : actualTotalTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeyCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {apiKeyCount === 0 ? 'Create your first key' : 'Active keys'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <RecentRequests requests={recentRequests} />
    </div>
  );
}
