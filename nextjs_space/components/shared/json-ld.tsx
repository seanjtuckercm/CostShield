/**
 * JSON-LD Schema Component
 * Injects structured data for SEO and AI Agents
 * Reference: Section 9.3 of COSTSHIELD_MARKETING_WEBSITE_SPEC.md
 */

interface SoftwareApplicationSchemaProps {
  name?: string;
  description?: string;
  applicationCategory?: string;
  offers?: Array<{
    name: string;
    price: string;
    priceCurrency: string;
    billingDuration?: string;
  }>;
  featureList?: string[];
  url?: string;
}

interface FAQPageSchemaProps {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

export function SoftwareApplicationSchema({
  name = 'CostShield Cloud',
  description = 'OpenAI proxy with budget enforcement, cost tracking, and seamless OpenClaw integration.',
  applicationCategory = 'DeveloperApplication',
  offers = [
    { name: 'Free', price: '0', priceCurrency: 'USD', billingDuration: 'P1M' },
    { name: 'Starter', price: '15', priceCurrency: 'USD', billingDuration: 'P1M' },
    { name: 'Pro', price: '49', priceCurrency: 'USD', billingDuration: 'P1M' },
  ],
  featureList = [
    'Budget Enforcement',
    'Real-Time Cost Tracking',
    'OpenClaw Integration',
    'AES-256 Encryption',
    'OpenAI-Compatible API',
  ],
  url = process.env.NEXT_PUBLIC_APP_URL || 'https://costshield.dev',
}: SoftwareApplicationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    applicationCategory,
    url,
    offers: offers.map((offer) => ({
      '@type': 'Offer',
      name: offer.name,
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      ...(offer.billingDuration && { billingDuration: offer.billingDuration }),
    })),
    featureList,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQPageSchema({ questions }: FAQPageSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((qa) => ({
      '@type': 'Question',
      name: qa.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: qa.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
