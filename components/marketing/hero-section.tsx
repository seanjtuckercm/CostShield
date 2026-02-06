"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TabsCode } from "@/components/ui/tabs-code";
import { CommandLine } from "@/components/ui/code-block";
import { ArrowRight, Shield, Zap, BarChart3, Copy, Check } from "lucide-react";

export function HeroSection() {
  const [copied, setCopied] = useState(false);

  const curlCommand = `curl -X POST https://costshield.dev/api/proxy/v1/chat/completions \\
  -H "Authorization: Bearer cs_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Hello"}]}'`;

  const codeTabs = [
    {
      label: "curl",
      language: "bash",
      code: `curl -X POST https://costshield.dev/api/proxy/v1/chat/completions \\
  -H "Authorization: Bearer cs_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`,
    },
    {
      label: "Python",
      language: "python",
      code: `import openai

client = openai.OpenAI(
    api_key="cs_live_YOUR_API_KEY",
    base_url="https://costshield.dev/api/proxy"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello"}]
)

print(response.choices[0].message.content)`,
    },
    {
      label: "Node.js",
      language: "javascript",
      code: `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'cs_live_YOUR_API_KEY',
  baseURL: 'https://costshield.dev/api/proxy',
});

const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
});

console.log(response.choices[0].message.content);`,
    },
  ];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="min-h-screen bg-dev-bg pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Text content */}
          <div className="space-y-8">
            {/* Pre-headline */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-dev-surface border border-dev-border rounded-sm text-sm font-mono">
              <span className="w-2 h-2 bg-dev-accent rounded-full animate-pulse" />
              <span className="text-dev-muted">OpenAI-compatible proxy</span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-dev-text leading-tight">
              Hard budget limits for{" "}
              <span className="text-dev-accent">OpenAI</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-lg md:text-xl text-dev-muted max-w-lg leading-relaxed">
              Drop-in proxy that enforces spend limits, tracks every request, and blocks when you hit your budget. 
              <span className="text-dev-text"> Ship AI features without fear.</span>
            </p>

            {/* Quick curl command */}
            <div className="space-y-2">
              <span className="text-xs text-dev-muted font-mono uppercase tracking-wide">Get started in 30 seconds</span>
              <div className="flex items-center gap-2 bg-dev-surface border border-dev-border rounded-sm px-4 py-3 font-mono text-sm group">
                <span className="text-dev-accent select-none">$</span>
                <span className="text-dev-text flex-1 overflow-x-auto whitespace-nowrap">
                  curl -X POST costshield.dev/api/proxy/v1/chat/completions ...
                </span>
                <button
                  onClick={handleCopy}
                  className="text-dev-muted hover:text-dev-accent transition-colors flex-shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-dev-accent" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="bg-dev-accent text-dev-bg hover:bg-dev-accent/90 font-mono text-sm px-6 py-5 h-auto rounded-sm"
              >
                <Link href="/sign-up">
                  Get API Key <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-dev-border text-dev-text hover:bg-dev-surface hover:text-dev-accent font-mono text-sm px-6 py-5 h-auto rounded-sm"
              >
                <Link href="/docs">Read the docs</Link>
              </Button>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-dev-muted">
                <Shield className="h-4 w-4 text-dev-accent" />
                <span>Budget enforcement</span>
              </div>
              <div className="flex items-center gap-2 text-dev-muted">
                <BarChart3 className="h-4 w-4 text-dev-cyan" />
                <span>Real-time tracking</span>
              </div>
              <div className="flex items-center gap-2 text-dev-muted">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>~10ms latency</span>
              </div>
            </div>
          </div>

          {/* Right: Code block */}
          <div className="lg:pt-8">
            <TabsCode tabs={codeTabs} />
          </div>
        </div>

        {/* Feature grid below */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-terminal space-y-3">
            <div className="w-10 h-10 flex items-center justify-center bg-dev-accent/10 rounded-sm">
              <Shield className="h-5 w-5 text-dev-accent" />
            </div>
            <h3 className="text-lg font-semibold text-dev-text">Hard Budget Limits</h3>
            <p className="text-sm text-dev-muted leading-relaxed">
              Set monthly or per-project limits. Requests automatically blocked when budget is reached. No surprises.
            </p>
          </div>

          <div className="card-terminal space-y-3">
            <div className="w-10 h-10 flex items-center justify-center bg-dev-cyan/10 rounded-sm">
              <BarChart3 className="h-5 w-5 text-dev-cyan" />
            </div>
            <h3 className="text-lg font-semibold text-dev-text">Real-Time Analytics</h3>
            <p className="text-sm text-dev-muted leading-relaxed">
              Track spend by model, endpoint, and time. Export data via API. Full visibility into your AI costs.
            </p>
          </div>

          <div className="card-terminal space-y-3">
            <div className="w-10 h-10 flex items-center justify-center bg-yellow-500/10 rounded-sm">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <h3 className="text-lg font-semibold text-dev-text">Drop-in Compatible</h3>
            <p className="text-sm text-dev-muted leading-relaxed">
              Change two lines of code. Works with OpenAI SDK, LangChain, and any OpenAI-compatible client.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
