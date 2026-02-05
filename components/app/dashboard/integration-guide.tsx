/**
 * Integration Guide Component
 * Shows "Get Started" card with API key and code snippets for new users
 * Reference: Section 22 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, TestTube } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface IntegrationGuideProps {
  apiKey?: string;
  baseUrl: string;
}

export function IntegrationGuide({ apiKey, baseUrl }: IntegrationGuideProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const pythonSnippet = `import openai

client = openai.OpenAI(
    api_key="${apiKey || 'YOUR_API_KEY'}",
    base_url="${baseUrl}/api/proxy"
)

response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello!"}]
)`;

  const nodeSnippet = `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '${apiKey || 'YOUR_API_KEY'}',
  baseURL: '${baseUrl}/api/proxy',
});

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello!' }],
});`;

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

      if (response.ok) {
        toast({
          title: '✅ Setup Verified',
          description: 'Your CostShield proxy connection is working correctly!',
          variant: 'default',
        });
      } else {
        const data = await response.json();
        toast({
          title: 'Connection Failed',
          description: data.error || 'Unable to connect to proxy. Please check your API key.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: 'Failed to test connection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Get Started</CardTitle>
          <CardDescription>Create your first API key to start using CostShield</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/api-keys">Create API Key</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader>
        <CardTitle className="text-green-900">🚀 Get Started with CostShield</CardTitle>
        <CardDescription className="text-green-700">
          Copy your API key and use it with the code snippets below
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API Key Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Your API Key</label>
          <div className="flex items-center space-x-2">
            <Input
              value={apiKey}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(apiKey, 'key')}
            >
              {copied === 'key' ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleTestConnection}
              disabled={isTesting}
              title="Test Connection"
            >
              {isTesting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Base URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Base URL</label>
          <div className="flex items-center space-x-2">
            <Input
              value={`${baseUrl}/api/proxy`}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleCopy(`${baseUrl}/api/proxy`, 'url')}
            >
              {copied === 'url' ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Code Snippets */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Python</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(pythonSnippet, 'python')}
              >
                {copied === 'python' ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
              <code>{pythonSnippet}</code>
            </pre>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Node.js</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(nodeSnippet, 'node')}
              >
                {copied === 'node' ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
              <code>{nodeSnippet}</code>
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
