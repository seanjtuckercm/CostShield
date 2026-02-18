import { ClerkProvider } from '@clerk/nextjs';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ToasterClient } from '@/components/ui/toaster-client';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'CostShield - OpenAI Proxy with Budget Enforcement',
  description: 'OpenAI-compatible proxy with hard budget limits, real-time cost tracking, and automatic request blocking. Ship AI features without runaway costs.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://costshield.dev'),
  openGraph: {
    title: 'CostShield - OpenAI Proxy with Budget Enforcement',
    description: 'Hard budget limits for OpenAI. Track costs, block runaway requests, ship with confidence.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://costshield.dev',
    siteName: 'CostShield',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CostShield - OpenAI Proxy',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CostShield',
    description: 'OpenAI proxy with hard budget limits. Never exceed your AI budget again.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://costshield.dev',
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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className="min-h-screen bg-dev-bg text-dev-text antialiased">
        {children}
        <ToasterClient />
      </body>
    </html>
  );

  // Only wrap with ClerkProvider if keys are valid
  if (hasValidClerkKey) {
    return (
      <ClerkProvider
        signInForceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/onboarding"
        afterSignOutUrl="/"
      >
        {content}
      </ClerkProvider>
    );
  }

  return content;
}
