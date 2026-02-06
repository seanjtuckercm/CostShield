/**
 * Integration Guide Component
 * Developer-focused onboarding with code examples
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TabsCode } from '@/components/ui/tabs-code';
import { Copy, Check, TestTube, Terminal, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface IntegrationGuideProps {
  apiKey?: string;
  baseUrl: string;
}

export function IntegrationGuide({ apiKey, baseUrl }: IntegrationGuideProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const displayKey = apiKey ?? 'YOUR_API_KEY';

  const codeTabs = [
    {
      label: 'Python',
      language: 'python',
      code: `import openai

client = openai.OpenAI(
    api_key="${displayKey}",
    base_url="${baseUrl}/api/proxy"
)

response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)`,
    },
    {
      label: 'Node.js',
      language: 'javascript',
      code: `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: '${displayKey}',
  baseURL: '${baseUrl}/api/proxy',
});

const response = await client.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(response.choices[0].message.content);`,
    },
    {
      label: 'curl',
      language: 'bash',
      code: `curl -X POST ${baseUrl}/api/proxy/v1/chat/completions \\
  -H "Authorization: Bearer ${displayKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
    },
  ];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast({
        title: 'No API Key',
        description: 'Please create an API key first.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(`${baseUrl}/api/proxy/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response?.ok) {
        toast({
          title: '✓ Connection verified',
          description: 'Your CostShield proxy is ready to use.',
        });
      } else {
        const data = await response?.json();
        toast({
          title: 'Connection failed',
          description: data?.error ?? 'Unable to connect. Check your API key.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Connection error',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="card-terminal glow-border">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="h-4 w-4 text-dev-accent" />
          <span className="text-sm font-mono text-dev-accent uppercase tracking-wide">Get Started</span>
        </div>
        <div className="space-y-4">
          <p className="text-dev-muted text-sm">
            Create your first API key to start using CostShield.
          </p>
          <Button 
            asChild
            className="bg-dev-accent text-dev-bg hover:bg-dev-accent/90 font-mono text-sm rounded-sm"
          >
            <Link href="/api-keys">
              Create API Key <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-terminal glow-border">
      <div className="flex items-center gap-2 mb-6">
        <Terminal className="h-4 w-4 text-dev-accent" />
        <span className="text-sm font-mono text-dev-accent uppercase tracking-wide">Quick Start</span>
      </div>

      <div className="space-y-6">
        {/* API Key display */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-dev-muted uppercase tracking-wide">Your API Key</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-dev-bg border border-dev-border rounded-sm px-3 py-2 font-mono text-sm text-dev-text overflow-x-auto">
              {apiKey}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(apiKey, 'key')}
              className="border-dev-border text-dev-muted hover:text-dev-accent hover:border-dev-accent flex-shrink-0"
            >
              {copied === 'key' ? (
                <Check className="h-4 w-4 text-dev-accent" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="border-dev-border text-dev-muted hover:text-dev-accent hover:border-dev-accent flex-shrink-0"
              title="Test Connection"
            >
              {isTesting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-dev-muted border-t-dev-accent" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Base URL */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-dev-muted uppercase tracking-wide">Base URL</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-dev-bg border border-dev-border rounded-sm px-3 py-2 font-mono text-sm text-dev-text">
              {baseUrl}/api/proxy
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(`${baseUrl}/api/proxy`, 'url')}
              className="border-dev-border text-dev-muted hover:text-dev-accent hover:border-dev-accent flex-shrink-0"
            >
              {copied === 'url' ? (
                <Check className="h-4 w-4 text-dev-accent" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Code Examples */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-dev-muted uppercase tracking-wide">Integration Code</label>
          <TabsCode tabs={codeTabs} />
        </div>
      </div>
    </div>
  );
}
