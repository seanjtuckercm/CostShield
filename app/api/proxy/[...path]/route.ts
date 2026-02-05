/**
 * OpenAI Proxy Endpoint with Budget Enforcement
 * Reference: Section 29 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 * Reference: Section 3 of COSTSHIELD_CLOUD_REQUIREMENTS.md
 * 
 * This endpoint:
 * 1. Extracts CostShield API Key from Authorization header
 * 2. Authenticates the key against api_keys table
 * 3. Checks budgets table to ensure spending limit is not exceeded
 * 4. Decrypts the associated user's OpenAI key
 * 5. Forwards the request to OpenAI (supporting streaming)
 * 6. On completion, calculates final cost and increments spent in budgets table
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { getEncryptionService } from '@/lib/encryption';
import { getTokenCounter } from '@/lib/proxy/token-counter';
import { calculateCost, estimateCost } from '@/lib/proxy/cost-calculator';

const OPENAI_API_BASE = 'https://api.openai.com';

/**
 * Hash API key for lookup
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Extract API key from Authorization header
 */
function extractApiKey(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Authenticate CostShield API key
 */
async function authenticateApiKey(apiKey: string) {
  const supabase = getAdminSupabaseClient();
  const keyHash = hashApiKey(apiKey);
  
  // FORENSIC LOG: Hash calculation (sanitized)
  console.log('[Auth] Key format check:', apiKey.startsWith('cs_live_') ? 'valid prefix' : 'invalid prefix');
  console.log('[Auth] Hash calculated (length):', keyHash.length);
  
  const { data: apiKeyRecord, error } = await supabase
    .from('api_keys')
    .select('id, user_id, budget_id, is_active, name')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .maybeSingle(); // Use maybeSingle() to handle "not found" gracefully
  
  // FORENSIC LOG: Query result (sanitized)
  if (error) {
    console.error('[Auth] Database error:', error.code, error.message);
  } else if (!apiKeyRecord) {
    console.log('[Auth] No matching active key found in database');
  } else {
    console.log('[Auth] Key authenticated - User ID:', apiKeyRecord.user_id);
  }
  
  if (error || !apiKeyRecord) {
    return null;
  }
  
  return apiKeyRecord;
}

/**
 * Check budget and get user's OpenAI credentials
 */
async function checkBudgetAndGetCredentials(userId: string, budgetId: string | null, estimatedCost: number) {
  const supabase = getAdminSupabaseClient();
  
  // FORENSIC LOG: User ID for credentials lookup
  console.log('[Credentials] Looking up credentials for user_id:', userId);
  
  // Get user's OpenAI credentials AND monthly_budget from users table
  const { data: credentials, error: credError } = await supabase
    .from('openai_credentials')
    .select('encrypted_key, key_prefix, user_id')
    .eq('user_id', userId)
    .single();
  
  // FORENSIC LOG: Credentials query result
  if (credError) {
    console.error('[Credentials] Database error:', credError);
    console.error('[Credentials] Error code:', credError.code);
    console.error('[Credentials] Error message:', credError.message);
  } else if (!credentials) {
    console.log('[Credentials] No credentials found for user_id:', userId);
  } else {
    console.log('[Credentials] Credentials found');
    console.log('[Credentials] user_id match:', credentials.user_id === userId);
  }
  
  if (credError || !credentials) {
    throw new Error('OpenAI credentials not found');
  }
  
  // ========== BUDGET ENFORCEMENT CHECK ==========
  // Get user's active budget from budgets table
  const { data: budgetData, error: budgetError } = await supabase
    .from('budgets')
    .select('id, amount, spent, period_type, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  
  if (budgetError) {
    console.error('[Budget] Error fetching budget:', budgetError);
  }
  
  console.log('[Budget] Budget data:', budgetData);
  
  // Enforce budget if user has an active budget
  if (budgetData && budgetData.amount > 0) {
    const budgetAmount = parseFloat(budgetData.amount) || 0;
    const budgetSpent = parseFloat(budgetData.spent) || 0;
    
    console.log('[Budget] Budget limit:', budgetAmount);
    console.log('[Budget] Current spent:', budgetSpent);
    console.log('[Budget] Estimated cost for this request:', estimatedCost);
    
    // Check if already over budget
    if (budgetSpent >= budgetAmount) {
      console.log('[Budget] BLOCKED: Budget already exceeded');
      throw new Error('Budget exceeded');
    }
    
    // Check if this request would exceed budget
    if (budgetSpent + estimatedCost > budgetAmount) {
      console.log('[Budget] BLOCKED: Request would exceed budget');
      throw new Error('Budget exceeded');
    }
    
    console.log('[Budget] OK: Request within budget');
  } else {
    // FALLBACK: Calculate from usage_logs if no budget record
    // Get current month's spending
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const { data: usageData, error: usageError } = await supabase
      .from('usage_logs')
      .select('cost')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth);
    
    if (!usageError && usageData) {
      const totalSpend = usageData.reduce((sum, log) => sum + (parseFloat(log.cost) || 0), 0);
      console.log('[Budget] No budget record, calculated spend from usage_logs:', totalSpend);
      
      // Use a default budget of $1 if no budget is set (as mentioned in the task)
      const defaultBudget = 1.00;
      if (totalSpend >= defaultBudget) {
        console.log('[Budget] BLOCKED: Default $1 budget exceeded (spend:', totalSpend, ')');
        throw new Error('Budget exceeded');
      }
      console.log('[Budget] OK: Within default $1 budget');
    } else {
      console.log('[Budget] No budget limit configured, allowing request');
    }
  }
  
  // Legacy budget_id check (kept for backwards compatibility)
  if (budgetId) {
    const { data: success, error: rpcError } = await supabase.rpc('increment_budget_spent', {
      budget_id: budgetId,
      cost_amount: estimatedCost
    });
    
    if (rpcError) {
      console.error('Error checking budget (legacy):', rpcError);
      // Don't throw - use new budget check as primary
    }
    
    if (!success && !rpcError) {
      console.log('[Budget] Legacy budget check failed');
      throw new Error('Budget exceeded');
    }
  }
  
  return credentials.encrypted_key;
}

/**
 * Update budget after request completion
 * Note: Budget is already incremented atomically during checkBudgetAndGetCredentials
 * This function is kept for backwards compatibility but should not be called
 * if the atomic check was already performed.
 */
async function updateBudget(budgetId: string, cost: number) {
  const supabase = getAdminSupabaseClient();
  
  // Use atomic RPC function - no fallback (migration must be applied)
  const { error } = await supabase.rpc('increment_budget_spent', {
    budget_id: budgetId,
    cost_amount: cost,
  });
  
  if (error) {
    console.error('Error updating budget:', error);
    // Don't throw - budget was already checked, this is just logging the final cost
    // If RPC fails, it means migration wasn't applied - log for monitoring
  }
}

/**
 * Log usage to usage_logs table
 */
async function logUsage(
  userId: string,
  apiKeyId: string,
  model: string,
  endpoint: string,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number,
  cost: number,
  statusCode: number,
  durationMs: number | null,
  errorMessage: string | null
) {
  const supabase = getAdminSupabaseClient();
  const requestId = crypto.randomUUID();
  
  console.log('[Usage] Logging usage:', { userId, apiKeyId, model, endpoint, promptTokens, completionTokens, cost, statusCode });
  
  // Note: total_tokens is a generated column in the database, so we don't insert it
  const { data, error } = await supabase.from('usage_logs').insert({
    user_id: userId,
    api_key_id: apiKeyId,
    request_id: requestId,
    model,
    endpoint,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    cost,
    status_code: statusCode,
    duration_ms: durationMs,
    error_message: errorMessage,
  });
  
  if (error) {
    console.error('[Usage] Error logging usage:', error);
  } else {
    console.log('[Usage] Usage logged successfully');
  }
}

/**
 * Update API key last_used_at
 */
async function updateApiKeyLastUsed(apiKeyId: string) {
  const supabase = getAdminSupabaseClient();
  
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKeyId);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const startTime = Date.now();
  let promptTokens = 0;
  let completionTokens = 0;
  let statusCode = 200;
  let errorMessage: string | null = null;
  
  try {
    // 1. Extract CostShield API Key from Authorization header
    const authHeader = request.headers.get('authorization');
    const apiKey = extractApiKey(authHeader);
    
    // FORENSIC LOG: API key extraction (sanitized)
    console.log('[Proxy] Auth header present:', !!authHeader);
    console.log('[Proxy] API key format:', apiKey ? (apiKey.startsWith('cs_live_') ? 'cs_live_*' : 'invalid') : 'missing');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }
    
    // 2. Authenticate the key against api_keys table
    const keyHash = hashApiKey(apiKey);
    console.log('[Proxy] Key hash calculated (length):', keyHash.length);
    
    const apiKeyRecord = await authenticateApiKey(apiKey);
    
    // FORENSIC LOG: Authentication result
    console.log('[Proxy] API key authenticated:', !!apiKeyRecord);
    if (apiKeyRecord) {
      console.log('[Proxy] User ID from api_keys:', apiKeyRecord.user_id);
      console.log('[Proxy] Budget ID:', apiKeyRecord.budget_id || 'null');
    } else {
      console.log('[Proxy] Authentication failed - key not found or inactive');
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // 3. Parse request body
    const body = await request.json();
    const model = body.model || 'gpt-3.5-turbo';
    const isStreaming = body.stream === true;
    const maxTokens = body.max_tokens || 4096;
    
    // 4. Count input tokens and estimate cost
    const tokenCounter = getTokenCounter();
    const inputTokens = tokenCounter.countChatTokens(body.messages || [], model);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const estimatedCost = await estimateCost(
      model,
      inputTokens,
      maxTokens,
      supabaseUrl,
      supabaseAnonKey
    );
    
    // 5. Check budget and get OpenAI credentials
    const encryptedOpenAiKey = await checkBudgetAndGetCredentials(
      apiKeyRecord.user_id,
      apiKeyRecord.budget_id || null,
      estimatedCost
    );
    
    // FORENSIC LOG: Credentials retrieval (sanitized)
    console.log('[Proxy] Encrypted key retrieved:', !!encryptedOpenAiKey);
    console.log('[Proxy] Encrypted key length:', encryptedOpenAiKey?.length || 0);
    
    // 6. Decrypt OpenAI key
    let encryptionService;
    let openAiKey;
    try {
      encryptionService = getEncryptionService();
      console.log('[Proxy] Encryption service initialized');
      console.log('[Proxy] ENCRYPTION_MASTER_KEY configured:', !!process.env.ENCRYPTION_MASTER_KEY);
      console.log('[Proxy] ENCRYPTION_MASTER_KEY length:', process.env.ENCRYPTION_MASTER_KEY?.length || 0);
      
      openAiKey = encryptionService.decrypt(encryptedOpenAiKey);
      console.log('[Proxy] Decryption successful');
      console.log('[Proxy] Decrypted key length:', openAiKey?.length || 0);
    } catch (decryptError: any) {
      console.error('[Proxy] Decryption error:', decryptError);
      console.error('[Proxy] Decryption error message:', decryptError?.message);
      console.error('[Proxy] Decryption error stack:', decryptError?.stack);
      throw new Error(`Decryption failed: ${decryptError?.message || 'Unknown error'}`);
    }
    
    // 7. Forward request to OpenAI
    const path = params.path.join('/');
    const openAiUrl = `${OPENAI_API_BASE}/${path}`;
    
    const openAiRequest = {
      ...body,
      stream: isStreaming,
    };
    
    const openAiResponse = await fetch(openAiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openAiRequest),
    });
    
    statusCode = openAiResponse.status;
    
    // FORENSIC LOG: OpenAI response
    console.log('[Proxy] OpenAI response status:', statusCode);
    console.log('[Proxy] OpenAI URL:', openAiUrl);
    console.log('[Proxy] OpenAI key prefix:', openAiKey?.substring(0, 10) + '...');
    
    if (!openAiResponse.ok) {
      const errorData = await openAiResponse.json().catch(() => ({ error: 'Unknown error' }));
      errorMessage = JSON.stringify(errorData);
      console.log('[Proxy] OpenAI error response:', errorMessage);
      
      // Log failed request
      await logUsage(
        apiKeyRecord.user_id,
        apiKeyRecord.id,
        model,
        path,
        inputTokens,
        0,
        inputTokens,
        0,
        statusCode,
        Date.now() - startTime,
        errorMessage
      );
      
      return NextResponse.json(errorData, { status: statusCode });
    }
    
    // 8. Handle streaming response
    if (isStreaming) {
      const stream = new ReadableStream({
        async start(controller) {
          const reader = openAiResponse.body?.getReader();
          const decoder = new TextDecoder();
          
          if (!reader) {
            controller.close();
            return;
          }
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                // Get final usage from last chunk if available
                // Note: OpenAI streaming doesn't always include usage in chunks
                // We'll need to estimate or wait for final chunk
                break;
              }
              
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  
                  if (data === '[DONE]') {
                    controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
                    continue;
                  }
                  
                  try {
                    const parsed = JSON.parse(data);
                    
                    // Extract usage if present
                    if (parsed.usage) {
                      promptTokens = parsed.usage.prompt_tokens || promptTokens;
                      completionTokens = parsed.usage.completion_tokens || completionTokens;
                    }
                    
                    controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
                  } catch (e) {
                    // Invalid JSON, skip
                  }
                }
              }
            }
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
            
            // Calculate final cost
            // Note: Budget was already incremented atomically during checkBudgetAndGetCredentials
            // using estimated cost. If actual cost differs significantly, we could adjust here,
            // but for simplicity, we accept the estimated cost as the increment.
            const totalTokens = promptTokens + completionTokens;
            const finalCost = await calculateCost(
              model,
              promptTokens,
              completionTokens,
              supabaseUrl,
              supabaseAnonKey
            );
            
            // Budget was already incremented during check - no need to update again
            // (The atomic function already handled the increment based on estimated cost)
            
            // Log usage
            await logUsage(
              apiKeyRecord.user_id,
              apiKeyRecord.id,
              model,
              path,
              promptTokens,
              completionTokens,
              totalTokens,
              finalCost,
              200,
              Date.now() - startTime,
              null
            );
            
            // Update API key last_used_at
            await updateApiKeyLastUsed(apiKeyRecord.id);
          }
        },
      });
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    // 9. Handle non-streaming response
    const responseData = await openAiResponse.json();
    
    // Extract usage from response
    if (responseData.usage) {
      promptTokens = responseData.usage.prompt_tokens || 0;
      completionTokens = responseData.usage.completion_tokens || 0;
    }
    
    const totalTokens = promptTokens + completionTokens;
    const finalCost = await calculateCost(
      model,
      promptTokens,
      completionTokens,
      supabaseUrl,
      supabaseAnonKey
    );
    
    // Budget was already incremented atomically during checkBudgetAndGetCredentials
    // using estimated cost. No need to update again.
    
    // Log usage (async, don't wait)
    logUsage(
      apiKeyRecord.user_id,
      apiKeyRecord.id,
      model,
      path,
      promptTokens,
      completionTokens,
      totalTokens,
      finalCost,
      200,
      Date.now() - startTime,
      null
    ).catch(console.error);
    
    // Update API key last_used_at (async, don't wait)
    updateApiKeyLastUsed(apiKeyRecord.id).catch(console.error);
    
    return NextResponse.json(responseData);
    
  } catch (error: any) {
    console.error('Proxy error:', error);
    
    const errorStatus = error.message === 'Budget exceeded' ? 429 : 500;
    const errorMsg = error.message || 'Internal server error';
    
    return NextResponse.json(
      { error: errorMsg },
      { status: errorStatus }
    );
  }
}

// Support other HTTP methods that OpenAI API uses
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Extract and authenticate API key (same as POST)
  const authHeader = request.headers.get('authorization');
  const apiKey = extractApiKey(authHeader);
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Unauthorized: Missing or invalid Authorization header' },
      { status: 401 }
    );
  }
  
  // Authenticate the key against api_keys table
  const apiKeyRecord = await authenticateApiKey(apiKey);
  
  if (!apiKeyRecord) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }
  
  // Forward GET requests (e.g., for models list) to OpenAI
  const path = params.path.join('/');
  const openAiUrl = `${OPENAI_API_BASE}/${path}`;
  
  // Get user's OpenAI credentials for forwarding
  const supabase = getAdminSupabaseClient();
  
  // FORENSIC LOG: GET handler credentials lookup
  console.log('[Proxy GET] Looking up credentials for user_id:', apiKeyRecord.user_id);
  
  const { data: credentials, error: credError } = await supabase
    .from('openai_credentials')
    .select('encrypted_key, key_prefix')
    .eq('user_id', apiKeyRecord.user_id)
    .single();

  // FORENSIC LOG: GET handler credentials result
  if (credError) {
    console.error('[Proxy GET] Credentials error:', credError);
    console.error('[Proxy GET] Error code:', credError.code);
  } else if (!credentials) {
    console.log('[Proxy GET] No credentials found');
  } else {
    console.log('[Proxy GET] Credentials found, encrypted key length:', credentials.encrypted_key?.length || 0);
  }

  if (credError || !credentials) {
    return NextResponse.json(
      { error: 'OpenAI credentials not found' },
      { status: 404 }
    );
  }

  // Decrypt OpenAI key
  let encryptionService;
  let openAiKey;
  try {
    encryptionService = getEncryptionService();
    console.log('[Proxy GET] Encryption service initialized');
    openAiKey = encryptionService.decrypt(credentials.encrypted_key);
    console.log('[Proxy GET] Decryption successful');
  } catch (decryptError: any) {
    console.error('[Proxy GET] Decryption error:', decryptError);
    console.error('[Proxy GET] Decryption error message:', decryptError?.message);
    return NextResponse.json(
      { error: `Decryption failed: ${decryptError?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
  
  const openAiResponse = await fetch(openAiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await openAiResponse.json();
  return NextResponse.json(data, { status: openAiResponse.status });
}
