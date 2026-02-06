/**
 * Terms of Service Page
 * Legal terms of service document
 */

export const metadata = {
  title: 'Terms of Service | CostShield Cloud',
  description: 'CostShield Cloud Terms of Service - Legal agreement for using our service.',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      
      <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
        <section>
          <p className="text-sm text-gray-500">Last updated: February 5, 2026</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing or using CostShield Cloud, you agree to be bound by these Terms of Service.
            If you disagree with any part of these terms, you may not access the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">2. Description of Service</h2>
          <p>
            CostShield Cloud is an OpenAI API proxy service that provides budget enforcement,
            cost tracking, and usage analytics. We act as an intermediary between your application
            and OpenAI's API.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">3. User Accounts</h2>
          <p>
            You are responsible for maintaining the security of your account and API keys.
            You must not share your API keys with unauthorized parties. You are responsible
            for all activity that occurs under your account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Use the service for illegal purposes</li>
            <li>Attempt to bypass budget limits or security measures</li>
            <li>Interfere with or disrupt the service</li>
            <li>Use the service to violate OpenAI's terms of service</li>
            <li>Share your API keys with unauthorized parties</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">5. Pricing and Billing</h2>
          <p>
            Subscription fees are billed monthly or annually in advance. All fees are non-refundable
            except as required by law or as explicitly stated in our refund policy. We reserve the
            right to change pricing with 30 days notice.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">6. Service Availability</h2>
          <p>
            We strive to maintain 99.9% uptime but do not guarantee uninterrupted service.
            We are not liable for any downtime or service interruptions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">7. Limitation of Liability</h2>
          <p>
            CostShield Cloud is provided "as is" without warranties of any kind. We are not liable
            for any indirect, incidental, or consequential damages arising from your use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mt-8 mb-4">8. Contact Us</h2>
          <p>
            If you have questions about these Terms, please contact us at:
          </p>
          <p>
            Email: legal@costshield.dev<br />
            Address: [Your Company Address]
          </p>
        </section>
      </div>
    </div>
  );
}
