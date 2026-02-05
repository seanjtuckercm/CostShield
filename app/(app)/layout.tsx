/**
 * App Layout
 * Layout for authenticated app routes with sidebar navigation
 * Note: Onboarding gatekeeper is implemented in individual pages (e.g., dashboard/page.tsx)
 * to allow access to /onboarding route even if setup is incomplete
 * Reference: PRE_RELEASE_AUDIT.md - High-Priority Fix #3
 */

import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { AppSidebar } from '@/components/app/app-sidebar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />
      <main className="lg:pl-64">
        <div className="container mx-auto py-6 px-4">
          {children}
        </div>
      </main>
    </div>
  );
}
