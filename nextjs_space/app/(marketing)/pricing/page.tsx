/**
 * Pricing Page
 * Developer-focused pricing with clean, technical aesthetics
 */

import { Button } from '@/components/ui/button';
import { Check, Zap, Shield, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { PricingCalculator } from '@/components/marketing/pricing-calculator';
import { FAQPageSchema } from '@/components/shared/json-ld';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const metadata = {
  title: 'Pricing - CostShield',
  description: 'Simple, predictable pricing. $0 (Free), $15 (Starter), $49 (Pro). No overage charges.',
};

export default function PricingPage() {
  const faqQuestions = [
    {
      question: 'Do I need a credit card for the free tier?',
      answer: 'No. The free tier is completely free. No credit card required.',
    },
    {
      question: 'What happens when I exceed my request limit?',
      answer: 'Requests are blocked until your limit resets or you upgrade. No surprise charges.',
    },
    {
      question: 'Are there overage charges?',
      answer: 'No. This is a core principle. Requests are blocked, not billed. You control your costs.',
    },
    {
      question: 'Can I switch tiers?',
      answer: 'Yes. Upgrades are instant. Downgrades take effect at the end of your billing cycle.',
    },
    {
      question: 'Annual billing discount?',
      answer: 'Yes. Save 20% with annual billing. Starter: $12/mo, Pro: $39/mo.',
    },
  ];

  return (
    <>
      <FAQPageSchema questions={faqQuestions} />
      <div className="min-h-screen bg-dev-bg pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-dev-text">
              Simple pricing. No surprises.
            </h1>
            <p className="text-lg text-dev-muted max-w-xl mx-auto">
              Pay for the tier, not the usage. Requests blocked at limit, never billed.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm font-mono">
              <span className="flex items-center gap-2 text-dev-muted">
                <Check className="h-4 w-4 text-dev-accent" />
                No overage charges
              </span>
              <span className="flex items-center gap-2 text-dev-muted">
                <Check className="h-4 w-4 text-dev-accent" />
                Cancel anytime
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Free Tier */}
            <div className="card-terminal flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-dev-text">Free</h3>
                <p className="text-sm text-dev-muted mt-1">For side projects</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold font-mono text-dev-text">$0</span>
                <span className="text-dev-muted">/month</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  <span className="font-mono">10,000</span> requests/mo
                </li>
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  Budget enforcement
                </li>
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  Real-time tracking
                </li>
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  7-day retention
                </li>
              </ul>
              <Button 
                asChild 
                variant="outline" 
                className="w-full border-dev-border text-dev-text hover:bg-dev-surface hover:text-dev-accent font-mono rounded-sm"
              >
                <Link href="/sign-up">Get started</Link>
              </Button>
            </div>

            {/* Starter Tier - Highlighted */}
            <div className="card-terminal flex flex-col glow-border relative">
              <div className="absolute -top-3 left-4">
                <span className="px-2 py-1 bg-dev-accent text-dev-bg text-xs font-mono rounded-sm">Popular</span>
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-dev-text">Starter</h3>
                <p className="text-sm text-dev-muted mt-1">For growing projects</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold font-mono text-dev-accent">$15</span>
                <span className="text-dev-muted">/month</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  <span className="font-mono">100,000</span> requests/mo
                </li>
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  Everything in Free
                </li>
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  Priority support
                </li>
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  Advanced analytics
                </li>
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  90-day retention
                </li>
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  CSV/JSON export
                </li>
              </ul>
              <Button 
                asChild 
                className="w-full bg-dev-accent text-dev-bg hover:bg-dev-accent/90 font-mono rounded-sm"
              >
                <Link href="/sign-up?tier=starter">Start free trial</Link>
              </Button>
            </div>

            {/* Pro Tier */}
            <div className="card-terminal flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-dev-text">Professional</h3>
                <p className="text-sm text-dev-muted mt-1">For teams & startups</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold font-mono text-dev-text">$49</span>
                <span className="text-dev-muted">/month</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  <span className="font-mono">500,000</span> requests/mo
                </li>
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  Everything in Starter
                </li>
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  Custom rate limits
                </li>
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  Webhooks (soon)
                </li>
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  1-year retention
                </li>
                <li className="flex items-center gap-2 text-sm text-dev-muted">
                  <Check className="h-4 w-4 text-dev-accent flex-shrink-0" />
                  Team access (soon)
                </li>
              </ul>
              <Button 
                asChild 
                variant="outline" 
                className="w-full border-dev-border text-dev-text hover:bg-dev-surface hover:text-dev-accent font-mono rounded-sm"
              >
                <Link href="/sign-up?tier=professional">Start free trial</Link>
              </Button>
            </div>
          </div>

          {/* Enterprise */}
          <div className="card-terminal text-center space-y-4">
            <h3 className="text-xl font-semibold text-dev-text">Need more?</h3>
            <p className="text-dev-muted">
              Custom limits, SLAs, SSO, dedicated support.
            </p>
            <p className="text-lg font-mono text-dev-accent">Starting at $299/month</p>
            <Button 
              asChild 
              variant="outline" 
              className="border-dev-border text-dev-text hover:bg-dev-surface hover:text-dev-accent font-mono rounded-sm"
            >
              <Link href="/contact">Contact sales</Link>
            </Button>
          </div>

          {/* Calculator */}
          <div className="max-w-xl mx-auto">
            <PricingCalculator />
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-dev-text text-center">FAQ</h2>
            <Accordion type="single" collapsible className="space-y-2">
              {faqQuestions?.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="card-terminal border-0"
                >
                  <AccordionTrigger className="text-dev-text text-sm hover:text-dev-accent hover:no-underline py-4">
                    {faq?.question ?? ''}
                  </AccordionTrigger>
                  <AccordionContent className="text-dev-muted text-sm pb-4">
                    {faq?.answer ?? ''}
                  </AccordionContent>
                </AccordionItem>
              )) ?? null}
            </Accordion>
          </div>

          {/* CTA */}
          <div className="card-terminal text-center space-y-4 glow-border">
            <h2 className="text-2xl font-bold text-dev-text">
              Start with <span className="font-mono text-dev-accent">10K</span> free requests
            </h2>
            <Button 
              asChild 
              size="lg"
              className="bg-dev-accent text-dev-bg hover:bg-dev-accent/90 font-mono rounded-sm"
            >
              <Link href="/sign-up">Get API Key →</Link>
            </Button>
            <p className="text-dev-muted text-sm font-mono">
              No credit card · Upgrade anytime · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
