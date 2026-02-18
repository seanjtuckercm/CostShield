/**
 * Privacy Policy Page
 * Legal privacy policy document
 */

export const metadata = {
  title: 'Privacy Policy | CostShield Cloud',
  description: 'CostShield Cloud Privacy Policy - How we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
        <section>
          <p className="text-sm text-gray-500">Last updated: February 5, 2026</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Information We Collect</h2>
          <p>
            We collect information that you provide directly to us, including:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Account information (email, name)</li>
            <li>OpenAI API keys (encrypted at rest)</li>
            <li>Usage metadata (model, tokens, cost, timestamps)</li>
            <li>Payment information (processed by Stripe)</li>
          </ul>
          <p className="mt-4">
            <strong>Important:</strong> We do NOT store your prompts, responses, or conversation content.
            Only metadata is logged for cost tracking and analytics.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Provide and maintain the CostShield service</li>
            <li>Enforce budget limits and track costs</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send you service-related communications</li>
            <li>Improve our service and develop new features</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">3. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>AES-256-GCM encryption for API keys at rest</li>
            <li>TLS 1.3 encryption for all data in transit</li>
            <li>Row-Level Security (RLS) in our database</li>
            <li>Regular security audits and updates</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">4. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide services.
            Usage logs are retained according to your subscription tier:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Free tier: 7 days</li>
            <li>Starter tier: 90 days</li>
            <li>Professional tier: 1 year</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and data</li>
            <li>Export your data (CSV/JSON)</li>
            <li>Opt out of marketing communications</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">6. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <p>
            Email: privacy@costshield.dev<br />
            Address: [Your Company Address]
          </p>
        </section>
      </div>
    </div>
  );
}
