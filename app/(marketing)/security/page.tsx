/**
 * Security Page
 * Bank-Level Security information
 * Reference: Section 11.2 of COSTSHIELD_MARKETING_WEBSITE_SPEC.md
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Shield, FileCheck, Github } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Security - Bank-Level Protection | CostShield Cloud',
  description: 'AES-256 encryption, TLS 1.3, SOC-2 compliance. Your OpenAI API keys and data are protected with bank-level security.',
};

export default function SecurityPage() {
  return (
    <div className="container mx-auto px-4 py-16 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold">
          Bank-Level Security. Your Data, Protected.
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          We take security seriously. Your OpenAI API keys are encrypted, your data is private, and our infrastructure is built for compliance.
        </p>
      </div>

      {/* Security Features */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <Lock className="h-12 w-12 text-green-500 mb-4" />
            <CardTitle>AES-256 Encryption</CardTitle>
            <CardDescription>At Rest</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Your OpenAI API keys are encrypted with AES-256-GCM before storage. Master keys never leave secure environment.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Verified in Sprint 3: EncryptionService uses AES-256-GCM with authenticated encryption.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Shield className="h-12 w-12 text-blue-500 mb-4" />
            <CardTitle>TLS 1.3 Everywhere</CardTitle>
            <CardDescription>In Transit</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              All traffic uses TLS 1.3. Certificate pinning available for enterprise. HTTPS only, HSTS enabled.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <FileCheck className="h-12 w-12 text-yellow-500 mb-4" />
            <CardTitle>SOC-2 Type II</CardTitle>
            <CardDescription>Compliance in Progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Compliance in progress. Q3 2026 target. We're building with security and compliance from day one.
            </p>
            <Badge variant="secondary" className="mt-2">In Progress</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Github className="h-12 w-12 text-purple-500 mb-4" />
            <CardTitle>Open Examples</CardTitle>
            <CardDescription>Transparency</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Client libraries and examples open-source on GitHub. Security through transparency.
            </p>
            <Link href="https://github.com/costshield" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
              View GitHub →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Security Information */}
      <div className="max-w-3xl mx-auto space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">How We Protect Your Keys</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              When you add your OpenAI API key to CostShield, it's immediately encrypted using AES-256-GCM (Galois/Counter Mode),
              which provides both confidentiality and authenticity. This is the same encryption standard used by banks and
              government agencies.
            </p>
            <p>
              The encryption process (verified in Sprint 3):
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your key is encrypted with a master key stored securely in environment variables</li>
              <li>The encrypted data is stored in the format: IV:AuthTag:EncryptedData</li>
              <li>When needed for API calls, the key is decrypted in memory and never logged</li>
              <li>The master encryption key never leaves our secure server environment</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Data Privacy</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>We don't store your prompts or responses.</strong> CostShield only logs metadata:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Model name (e.g., "gpt-4")</li>
              <li>Token counts (input and output)</li>
              <li>Cost per request</li>
              <li>Timestamp and status code</li>
            </ul>
            <p>
              Your actual conversation content is never stored, ensuring GDPR compliance by design.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Infrastructure Security</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              CostShield is built on modern, secure infrastructure:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Hosted on Vercel Edge Network (DDoS protection built-in)</li>
              <li>Database: Supabase PostgreSQL with Row-Level Security (RLS)</li>
              <li>Authentication: Clerk (SOC-2 compliant)</li>
              <li>Payments: Stripe (PCI-DSS Level 1 compliant)</li>
              <li>All API routes protected with authentication middleware</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Compliance & Certifications</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              We're working towards industry-standard certifications:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>SOC-2 Type II:</strong> In progress, target Q3 2026</li>
              <li><strong>GDPR:</strong> Compliant by design (data minimization, encryption)</li>
              <li><strong>ISO 27001:</strong> Future consideration</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Security Best Practices</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              We follow security best practices:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Regular security audits and penetration testing</li>
              <li>Automated dependency scanning for vulnerabilities</li>
              <li>Least privilege access controls</li>
              <li>Comprehensive audit logging</li>
              <li>Incident response plan</li>
            </ul>
          </div>
        </section>
      </div>

      {/* CTA */}
      <div className="text-center space-y-4 py-8">
        <h2 className="text-2xl font-bold">Questions About Security?</h2>
        <p className="text-gray-600">
          We're transparent about our security practices. Contact us if you have specific concerns.
        </p>
        <div className="flex justify-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/contact">Contact Us</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Start Free →</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
