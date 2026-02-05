import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import { ToasterClient } from '@/components/ui/toaster-client';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CostShield - Budget Protection for AI Developers',
  description: 'OpenAI proxy with budget enforcement, cost tracking, and seamless OpenClaw integration.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://costshield.cloud'),
  openGraph: {
    title: 'CostShield Cloud - Budget Protection for AI Developers',
    description: 'Enforce budget limits, track costs, optimize spending. Never worry about runaway OpenAI bills again.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://costshield.cloud',
    siteName: 'CostShield Cloud',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CostShield Cloud - Budget Protection for AI Developers',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CostShield Cloud',
    description: 'Budget protection for AI developers. Never worry about runaway OpenAI bills again.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://costshield.cloud',
  },
};

// Check if Clerk is properly configured
const hasValidClerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_');

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <ToasterClient />
      </body>
    </html>
  );

  // Only wrap with ClerkProvider if keys are valid
  if (hasValidClerkKey) {
    return <ClerkProvider>{content}</ClerkProvider>;
  }

  return content;
}
