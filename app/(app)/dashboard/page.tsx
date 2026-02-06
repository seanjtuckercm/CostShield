/**
 * Dashboard Page
 * Developer-focused dashboard with terminal aesthetics
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BudgetProgress } from '@/components/app/dashboard/budget-progress';
import { RecentRequests } from '@/components/app/dashboard/recent-requests';
import { IntegrationGuide } from '@/components/app/dashboard/integration-guide';
import { DollarSign, Activity, Key, Cpu } from 'lucide-react';
import { getEncryptionService } from '@/lib/encryption';

/**
 * Decrypt API key from storage
 */
function decryptApiKey(encryptedKey: string): string {
  try {
    // Handle raw keys (fallback from when encryption wasn't available)
    if (encryptedKey?.startsWith('raw:')) {
      return encryptedKey.substring(4);
    }
    // Handle truncated keys (old format)
    if (encryptedKey?.endsWith('...')) {
      return encryptedKey; // Can't decrypt, return as-is
    }
    const encryptionService = getEncryptionService();
    return encryptionService?.decrypt(encryptedKey) ?? encryptedKey;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedKey ?? ''; // Return as-is if decryption fails
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
  const { data: credentials, error: credError } = await supabase
    .from('openai_credentials')
    .select('id')
    .eq('user_id', dbUser?.id)
    .maybeSingle();

  // If no OpenAI credentials found, redirect to onboarding
  if (!credError && !credentials) {
    redirect('/onboarding');
  }

  // Get user's budget (optional - may not exist yet)
  const { data: budget } = await supabase
    .from('budgets')
    .select('amount, spent, period_type, name')
    .eq('user_id', dbUser?.id)
    .eq('is_active', true)
    .maybeSingle();

  const budgetAmount = budget ? Number(budget?.amount ?? 0) : 0;
  const budgetSpent = budget ? Number(budget?.spent ?? 0) : 0;

  // Fetch usage stats directly from database
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: usageLogs } = await supabase
    .from('usage_logs')
    .select('cost, prompt_tokens, completion_tokens, total_tokens, created_at, model, endpoint, status_code')
    .eq('user_id', dbUser?.id ?? '')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(5);

  // Get all usage for accurate totals
  const { count: totalRequestsCount } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', dbUser?.id)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const { data: allUsageLogs } = await supabase
    .from('usage_logs')
    .select('cost, total_tokens')
    .eq('user_id', dbUser?.id)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const actualTotalRequests = totalRequestsCount ?? 0;
  const actualTotalSpend = allUsageLogs?.reduce((sum, log) => sum + Number(log?.cost ?? 0), 0) ?? 0;
  const actualTotalTokens = allUsageLogs?.reduce((sum, log) => sum + Number(log?.total_tokens ?? 0), 0) ?? 0;

  // Fetch API keys
  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('id, key_prefix, is_active')
    .eq('user_id', dbUser?.id);

  const apiKeyCount = apiKeys?.length ?? 0;
  const encryptedPrimaryKey = apiKeys?.find((key) => key?.is_active)?.key_prefix ?? apiKeys?.[0]?.key_prefix;
  // Decrypt the API key for display
  const primaryApiKey = encryptedPrimaryKey ? decryptApiKey(encryptedPrimaryKey) : undefined;

  // Format recent requests
  const recentRequests = (usageLogs ?? [])?.map((log) => ({
    id: log?.created_at ?? '', // Use timestamp as ID for display
    model: log?.model ?? 'unknown',
    endpoint: log?.endpoint ?? 'unknown',
    cost: Number(log?.cost ?? 0),
    status_code: log?.status_code ?? 200,
    created_at: log?.created_at ?? '',
  })) ?? [];

  // Determine if user has made any requests
  const hasRequests = actualTotalRequests > 0;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://costshield.dev';

  // Format numbers for display
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-dev-muted font-mono">
          <span className="text-dev-accent">~</span>
          <span>/dashboard</span>
        </div>
        <h1 className="text-2xl font-semibold text-dev-text">
          Welcome back, {dbUser?.name ?? user?.firstName ?? 'dev'}
        </h1>
      </div>

      {/* Integration Guide for New Users */}
      {!hasRequests && (
        <IntegrationGuide 
          apiKey={primaryApiKey}
          baseUrl={baseUrl}
        />
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Spend */}
        <div className="card-terminal">
          <div className="flex items-center justify-between mb-3">
            <span className="stat-label">Total Spend</span>
            <DollarSign className="h-4 w-4 text-dev-accent" />
          </div>
          <div className="stat-value text-dev-accent">
            ${actualTotalSpend?.toFixed(6) ?? '0.000000'}
          </div>
          <div className="text-xs text-dev-muted mt-1 font-mono">last 30 days</div>
        </div>

        {/* Total Requests */}
        <div className="card-terminal">
          <div className="flex items-center justify-between mb-3">
            <span className="stat-label">Requests</span>
            <Activity className="h-4 w-4 text-dev-cyan" />
          </div>
          <div className="stat-value">
            {actualTotalRequests?.toLocaleString() ?? '0'}
          </div>
          <div className="text-xs text-dev-muted mt-1 font-mono">last 30 days</div>
        </div>

        {/* Total Tokens */}
        <div className="card-terminal">
          <div className="flex items-center justify-between mb-3">
            <span className="stat-label">Tokens</span>
            <Cpu className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="stat-value">
            {formatTokens(actualTotalTokens)}
          </div>
          <div className="text-xs text-dev-muted mt-1 font-mono">last 30 days</div>
        </div>

        {/* API Keys */}
        <div className="card-terminal">
          <div className="flex items-center justify-between mb-3">
            <span className="stat-label">API Keys</span>
            <Key className="h-4 w-4 text-purple-400" />
          </div>
          <div className="stat-value">
            {apiKeyCount}
          </div>
          <div className="text-xs text-dev-muted mt-1 font-mono">
            {apiKeyCount === 0 ? 'none created' : 'active'}
          </div>
        </div>
      </div>

      {/* Budget and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Budget Progress */}
        <BudgetProgress
          spent={budgetSpent}
          limit={budgetAmount}
          periodType={budget?.period_type ?? 'monthly'}
          budgetName={budget?.name}
        />

        {/* Recent Requests */}
        <RecentRequests requests={recentRequests} />
      </div>
    </div>
  );
}
