/**
 * Features Page
 * Comprehensive feature showcase organized by 6 categories
 * Reference: Section 4.2 of COSTSHIELD_MARKETING_WEBSITE_SPEC.md
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, TrendingUp, Zap, Lock, Puzzle, Code } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Features - Budget Protection & Cost Tracking | CostShield Cloud',
  description: 'Budget enforcement, cost tracking, OpenClaw integration, and developer-first features. Everything you need to build with AI confidently.',
};

export default function FeaturesPage() {
  return (
    <div className="container mx-auto px-4 py-16 space-y-20">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold">
          Features Built for Peace of Mind
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Budget protection, cost tracking, and seamless integration—everything you need to build with AI confidently.
        </p>
      </div>

      {/* Feature Category 1: Budget Enforcement */}
      <section id="budget-enforcement" className="space-y-8">
        <div className="flex items-center space-x-4">
          <Shield className="h-10 w-10 text-green-500" />
          <h2 className="text-3xl font-bold">Budget Protection That Actually Works</h2>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl">
          Set your budget. CostShield enforces it at the API level—no room for errors, no surprise bills. Sleep well knowing your costs are capped.
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Ironclad Monthly Limits</CardTitle>
              <CardDescription>Hard budget enforcement</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Set your maximum monthly spend. When you hit the limit, CostShield blocks all requests until the next reset. No overages, ever.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Enforced via database transactions with row-level locking (race condition protected).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Grace Periods & Alerts</CardTitle>
              <CardDescription>Soft limits and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Set soft limits (e.g., 80% of budget) to receive warnings before hitting the hard cap. Grace periods available.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Configurable thresholds: 50%, 75%, 90%, 100%, 110% (grace).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Flexible Budget Cycles</CardTitle>
              <CardDescription>Auto-reset & custom cycles</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Budgets auto-reset monthly. Customize the reset day (1-28) to match your billing cycle.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feature Category 2: Cost Tracking */}
      <section id="cost-tracking" className="space-y-8">
        <div className="flex items-center space-x-4">
          <TrendingUp className="h-10 w-10 text-blue-500" />
          <h2 className="text-3xl font-bold">See Every Token. Track Every Dollar.</h2>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl">
          Know exactly where your AI budget goes. Real-time tracking, detailed logs, and insights to optimize spending.
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Live Request Stream</CardTitle>
              <CardDescription>Real-time request logs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Every API call logged in real-time. See model, tokens, cost, duration, and status. Filterable and searchable.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accurate Token Counts</CardTitle>
              <CardDescription>99.9% accuracy</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Precise token counting using tiktoken library. Input and output tokens tracked separately. 99.9% match with OpenAI's billing.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost Analytics</CardTitle>
              <CardDescription>Visualize spending</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Visualize spending by model, day, week, month. Identify cost trends and anomalies. Exportable to CSV, JSON, PDF.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feature Category 3: OpenClaw Integration */}
      <section id="openclaw" className="space-y-8">
        <div className="flex items-center space-x-4">
          <Zap className="h-10 w-10 text-yellow-500" />
          <h2 className="text-3xl font-bold">Built for OpenClaw. Works in Minutes.</h2>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl">
          CostShield is the only OpenAI proxy designed specifically for OpenClaw users. One config change, instant budget protection.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Configure in Seconds</CardTitle>
              <CardDescription>One-line setup</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Add CostShield to OpenClaw with a single config file edit. No code changes needed.
              </p>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                <code>{`{
  "models": {
    "providers": {
      "costshield": {
        "baseUrl": "https://api.costshield.dev",
        "apiKey": "${"${COSTSHIELD_API_KEY}"}"
      }
    }
  }
}`}</code>
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Full Compatibility</CardTitle>
              <CardDescription>Tested with every version</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Works with OpenClaw 2026.1.29 and later. Streaming, all models, all features supported. OpenAI-compatible API.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feature Category 4: Developer Experience */}
      <section id="developer-experience" className="space-y-8">
        <div className="flex items-center space-x-4">
          <Code className="h-10 w-10 text-purple-500" />
          <h2 className="text-3xl font-bold">Drop-In Replacement for OpenAI API</h2>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl">
          Use your existing OpenAI client library. Just change the base URL.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>No SDK, No New API to Learn</CardTitle>
              <CardDescription>OpenAI-compatible</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Use your existing OpenAI client library. Just change the base URL.
              </p>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                <code>{`// JavaScript
const openai = new OpenAI({
  apiKey: process.env.COSTSHIELD_API_KEY,
  baseURL: "https://api.costshield.dev/v1"
});`}</code>
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Streaming Support</CardTitle>
              <CardDescription>Server-Sent Events (SSE)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Full streaming support for real-time responses. No buffering. Token counting during stream.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feature Category 5: Security */}
      <section id="security" className="space-y-8">
        <div className="flex items-center space-x-4">
          <Lock className="h-10 w-10 text-green-500" />
          <h2 className="text-3xl font-bold">Bank-Level Security. Your Keys, Safe.</h2>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl">
          Your OpenAI API keys are encrypted with AES-256-GCM before storage. Master keys never leave secure environment.
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>AES-256 Encryption at Rest</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Your OpenAI API keys encrypted with AES-256-GCM before storage. GDPR, SOC-2 ready.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Encrypted in Transit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                All traffic uses TLS 1.3. Certificate pinning available for enterprise.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>We Don't Store Your Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                CostShield only logs metadata (model, tokens, cost). Your actual prompts and responses are never stored.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Complete Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Every API call logged with timestamp, user, cost. Exportable for compliance.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feature Category 6: Integrations */}
      <section id="integrations" className="space-y-8">
        <div className="flex items-center space-x-4">
          <Puzzle className="h-10 w-10 text-blue-500" />
          <h2 className="text-3xl font-bold">Works With Your Favorite Tools</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>OpenClaw</CardTitle>
              <CardDescription>Native integration</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">One-line config change</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/openclaw">Setup guide →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>LangChain</CardTitle>
              <CardDescription>Compatible</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">Use as base_url in LLM wrapper</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/docs/langchain">Example code →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>LlamaIndex</CardTitle>
              <CardDescription>Compatible</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">Pass custom base_url</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/docs/llamaindex">Example code →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AutoGen</CardTitle>
              <CardDescription>Compatible</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">Configure proxy in config_list</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/docs/autogen">Example code →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center space-y-6 py-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-8">
        <h2 className="text-3xl font-bold text-white">
          Ready to Protect Your AI Budget?
        </h2>
        <p className="text-white/90 text-lg">
          Join developers who never worry about runaway OpenAI costs.
        </p>
        <div className="flex justify-center space-x-4">
          <Button size="lg" variant="secondary" asChild>
            <Link href="/sign-up">Start Free →</Link>
          </Button>
          <Button size="lg" variant="outline" className="bg-white/10 text-white border-white" asChild>
            <Link href="/pricing">View Pricing →</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
