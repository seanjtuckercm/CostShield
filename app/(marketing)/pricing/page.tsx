/**
 * Pricing Page
 * Transparent pricing with calculator and FAQ
 * Reference: Section 5.2 of COSTSHIELD_MARKETING_WEBSITE_SPEC.md
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
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
  title: 'Pricing - Simple & Predictable | CostShield Cloud',
  description: 'Transparent pricing: $0 (Free), $15 (Starter), $49 (Pro). No hidden fees. Predictable costs for OpenAI budget protection.',
};

export default function PricingPage() {
  const faqQuestions = [
    {
      question: 'Do I need a credit card for the free tier?',
      answer: 'No! The free tier is completely free—no credit card required. You can upgrade to a paid tier anytime if you need more requests or features.',
    },
    {
      question: 'What happens if I exceed my request limit?',
      answer: 'If you exceed your tier\'s monthly request limit, additional requests will be blocked until you upgrade or the next month begins. We\'ll send you notifications as you approach your limit.',
    },
    {
      question: 'Can I switch between tiers?',
      answer: 'Yes! You can upgrade or downgrade anytime. Upgrades are instant. Downgrades take effect at the end of your current billing cycle.',
    },
    {
      question: 'Are there overage charges?',
      answer: 'No. There are no overage charges. If you exceed your tier\'s limit, requests are blocked—not billed. You won\'t see surprise charges. This is a core value proposition of CostShield.',
    },
    {
      question: 'Can I get a refund?',
      answer: 'Yes. If you\'re not satisfied within the first 30 days, we\'ll refund your subscription in full. No questions asked.',
    },
    {
      question: 'Is there a discount for annual billing?',
      answer: 'Yes! Save 20% by paying annually. For example, Starter is $12/mo (billed $144/year) instead of $15/mo.',
    },
  ];

  return (
    <>
      <FAQPageSchema questions={faqQuestions} />
      <div className="container mx-auto px-4 py-16 space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold">
          Simple Pricing. No Hidden Costs.
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Pay for the tier. Not the usage. Predictable costs, always.
        </p>
        <div className="flex items-center justify-center space-x-2 text-sm text-green-600 font-medium">
          <Check className="h-4 w-4" />
          <span>No overage charges</span>
          <span className="text-gray-400">•</span>
          <Check className="h-4 w-4" />
          <span>Cancel anytime</span>
          <span className="text-gray-400">•</span>
          <Check className="h-4 w-4" />
          <span>14-day free trial</span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Free Tier */}
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Perfect for side projects</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-gray-600">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                10,000 requests/month
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Budget enforcement
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Real-time tracking
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Email support
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Community access
              </li>
            </ul>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/sign-up">Start Free →</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Starter Tier */}
        <Card className="border-green-500 border-2 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-green-500">Most Popular</Badge>
          </div>
          <CardHeader>
            <CardTitle>Starter</CardTitle>
            <CardDescription>For growing projects</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">$15</span>
              <span className="text-gray-600">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                100,000 requests/month
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Everything in Free, plus:
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Priority support
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Advanced analytics
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Export data (CSV/JSON)
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                90-day retention
              </li>
            </ul>
            <Button className="w-full" asChild>
              <Link href="/sign-up?tier=starter">Start Free Trial →</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Pro Tier */}
        <Card>
          <CardHeader>
            <CardTitle>Professional</CardTitle>
            <CardDescription>For growing startups</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">$49</span>
              <span className="text-gray-600">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                500,000 requests/month
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Everything in Starter, plus:
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Team collaboration (coming soon)
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Custom rate limits
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Webhooks (coming soon)
              </li>
              <li className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-green-500" />
                1-year retention
              </li>
            </ul>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/sign-up?tier=professional">Start Free Trial →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Enterprise Section */}
      <div className="text-center space-y-4 py-8 border-t">
        <h2 className="text-2xl font-semibold">Need more? Custom plans for teams and enterprises.</h2>
        <p className="text-gray-600">
          Unlimited requests, custom SLAs, SSO & SAML, dedicated account manager, white-label options
        </p>
        <p className="text-xl font-semibold">Starting at $299/month</p>
        <Button variant="outline" asChild>
          <Link href="/contact">Contact Sales →</Link>
        </Button>
      </div>

      {/* Budget Calculator */}
      <div className="max-w-2xl mx-auto">
        <PricingCalculator />
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-center">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="no-credit-card">
            <AccordionTrigger>Do I need a credit card for the free tier?</AccordionTrigger>
            <AccordionContent>
              No! The free tier is completely free—no credit card required. You can upgrade to a paid tier anytime if you need more requests or features.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="exceed-limit">
            <AccordionTrigger>What happens if I exceed my request limit?</AccordionTrigger>
            <AccordionContent>
              If you exceed your tier's monthly request limit, additional requests will be blocked until you upgrade or the next month begins. We'll send you notifications as you approach your limit.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="switch-tiers">
            <AccordionTrigger>Can I switch between tiers?</AccordionTrigger>
            <AccordionContent>
              Yes! You can upgrade or downgrade anytime. Upgrades are instant. Downgrades take effect at the end of your current billing cycle.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="no-overage">
            <AccordionTrigger>Are there overage charges?</AccordionTrigger>
            <AccordionContent>
              <strong className="text-green-600">No. There are no overage charges.</strong> If you exceed your tier's limit, requests are blocked—not billed. You won't see surprise charges. This is a core value proposition of CostShield.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="refund">
            <AccordionTrigger>Can I get a refund?</AccordionTrigger>
            <AccordionContent>
              Yes. If you're not satisfied within the first 30 days, we'll refund your subscription in full. No questions asked.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="annual">
            <AccordionTrigger>Is there a discount for annual billing?</AccordionTrigger>
            <AccordionContent>
              Yes! Save 20% by paying annually. For example, Starter is $12/mo (billed $144/year) instead of $15/mo.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Final CTA */}
      <div className="text-center space-y-6 py-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-8">
        <h2 className="text-3xl font-bold text-white">
          Start with 10K Free Requests Today
        </h2>
        <Button size="lg" variant="secondary" asChild>
          <Link href="/sign-up">Get Started Free →</Link>
        </Button>
        <p className="text-white/90 text-sm">
          ✓ No credit card required  •  ✓ Upgrade anytime  •  ✓ Cancel anytime
        </p>
      </div>
    </div>
    </>
  );
}
