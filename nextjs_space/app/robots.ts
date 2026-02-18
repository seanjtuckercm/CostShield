/**
 * Robots.txt Configuration
 * Controls search engine crawling behavior
 * Reference: Section 14.2 of COSTSHIELD_MARKETING_WEBSITE_SPEC.md
 */

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://costshield.dev';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/app/',
          '/api/',
          '/dashboard/',
          '/onboarding/',
          '/api-keys/',
          '/usage/',
          '/billing/',
          '/settings/',
          '/_next/',
          '/admin/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
