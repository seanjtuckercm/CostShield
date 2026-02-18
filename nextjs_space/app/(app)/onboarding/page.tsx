/**
 * Onboarding Wizard
 * Multi-step form to guide new users through setup
 * Reference: Section 17.2 of COSTSHIELD_COMPLETE_PLATFORM_GUIDE.md
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Step = 'welcome' | 'openai-key' | 'budget' | 'success';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>('welcome');
  const [openaiKey, setOpenaiKey] = useState('');
  const [budget, setBudget] = useState([5.0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydration guard: Only render interactive elements after client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSaveOpenAIKey = async () => {
    if (!openaiKey.trim()) {
      setError('Please enter your OpenAI API key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding/openai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: openaiKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save OpenAI key');
      }

      setStep('budget');
    } catch (err: any) {
      setError(err.message || 'Failed to save OpenAI key');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: budget[0] }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save budget');
      }

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.push('/dashboard');
  };

  // Handle "Get Started" button click with debug logging
  const handleStart = () => {
    console.log('Get Started clicked!');
    setStep('openai-key');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to CostShield</CardTitle>
          <CardDescription>
            Let's get you set up in just a few steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step Indicator */}
          <div className="mb-8 flex items-center justify-between">
            <div className={`flex items-center ${step === 'welcome' || step === 'openai-key' || step === 'budget' || step === 'success' ? 'text-brand-green' : 'text-gray-400'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === 'welcome' ? 'bg-brand-green text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Welcome</span>
            </div>
            <div className="h-px flex-1 bg-gray-200 mx-4" />
            <div className={`flex items-center ${step === 'openai-key' || step === 'budget' || step === 'success' ? 'text-brand-green' : 'text-gray-400'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === 'openai-key' ? 'bg-brand-green text-white' : step === 'budget' || step === 'success' ? 'bg-brand-green text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">OpenAI Key</span>
            </div>
            <div className="h-px flex-1 bg-gray-200 mx-4" />
            <div className={`flex items-center ${step === 'budget' || step === 'success' ? 'text-brand-green' : 'text-gray-400'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === 'budget' ? 'bg-brand-green text-white' : step === 'success' ? 'bg-brand-green text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Budget</span>
            </div>
            <div className="h-px flex-1 bg-gray-200 mx-4" />
            <div className={`flex items-center ${step === 'success' ? 'text-brand-green' : 'text-gray-400'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === 'success' ? 'bg-brand-green text-white' : 'bg-gray-200'}`}>
                4
              </div>
              <span className="ml-2 text-sm font-medium">Done</span>
            </div>
          </div>

          {/* Step 1: Welcome */}
          {step === 'welcome' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Welcome, {user?.firstName || 'there'}!</h3>
                <p className="text-gray-600">
                  CostShield protects your OpenAI API usage with budget limits and cost tracking.
                  Let's set you up in just a few steps.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-green/10 flex items-center justify-center">
                    <span className="text-brand-green text-sm">✓</span>
                  </div>
                  <div>
                    <p className="font-medium">Secure Storage</p>
                    <p className="text-sm text-gray-600">Your OpenAI API key is encrypted with AES-256-GCM</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-green/10 flex items-center justify-center">
                    <span className="text-brand-green text-sm">✓</span>
                  </div>
                  <div>
                    <p className="font-medium">Budget Protection</p>
                    <p className="text-sm text-gray-600">Set spending limits to prevent surprise bills</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-green/10 flex items-center justify-center">
                    <span className="text-brand-green text-sm">✓</span>
                  </div>
                  <div>
                    <p className="font-medium">Real-time Tracking</p>
                    <p className="text-sm text-gray-600">Monitor your usage and costs in real-time</p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleStart} 
                className="w-full"
                disabled={!isLoaded || !mounted}
              >
                Get Started →
              </Button>
            </div>
          )}

          {/* Step 2: OpenAI Key */}
          {step === 'openai-key' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Add Your OpenAI API Key</h3>
                <p className="text-gray-600">
                  We'll encrypt and store your OpenAI API key securely. You can find your key in your{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-blue hover:underline"
                  >
                    OpenAI dashboard
                  </a>
                  .
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  Your key is encrypted with AES-256-GCM and never stored in plain text.
                </p>
              </div>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setStep('welcome')} disabled={loading}>
                  Back
                </Button>
                <Button onClick={handleSaveOpenAIKey} disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : 'Continue →'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 'budget' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Set Your Budget</h3>
                <p className="text-gray-600">
                  Choose your monthly spending limit. We'll stop requests when you reach this amount.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Monthly Budget: ${budget[0].toFixed(2)}</Label>
                  <Slider
                    value={budget}
                    onValueChange={setBudget}
                    min={1}
                    max={1000}
                    step={1}
                    className="mt-4"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>$1</span>
                    <span>$1000</span>
                  </div>
                </div>
                <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                  💡 You can change this anytime in your dashboard settings.
                </div>
              </div>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setStep('openai-key')} disabled={loading}>
                  Back
                </Button>
                <Button onClick={handleSaveBudget} disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : 'Continue →'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center">
                <span className="text-4xl">✓</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">You're All Set!</h3>
                <p className="text-gray-600">
                  Your CostShield account is ready. You can now start using the proxy to protect your OpenAI API usage.
                </p>
              </div>
              <Button onClick={handleComplete} className="w-full">
                Go to Dashboard →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
