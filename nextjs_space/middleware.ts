import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes
const isPublicRoute = createRouteMatcher([
  '/',
  '/features',
  '/pricing',
  '/openclaw',
  '/docs(.*)',
  '/blog(.*)',
  '/about',
  '/security',
  '/contact',
  '/changelog',
  '/legal(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
  // API routes that handle their own authentication
  // They return 401 themselves instead of being blocked by middleware
  '/api/keys(.*)',
  '/api/usage(.*)',
  '/api/billing(.*)',
  '/api/onboarding(.*)',
]);

// Define routes that should completely bypass Clerk middleware
// These routes use custom authentication (API keys, webhook signatures, etc.)
const isBypassRoute = createRouteMatcher([
  '/api/proxy(.*)',      // Proxy uses API key auth, not Clerk session
  '/api/webhooks(.*)',   // Webhooks use signature verification
  '/api/__clerk(.*)',    // Clerk proxy route
  '/__clerk(.*)',        // Clerk proxy requests
]);

// Only use Clerk middleware if publishable key is valid
const hasValidClerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_');

export default hasValidClerkKey 
  ? clerkMiddleware((auth, req) => {
      // Completely bypass Clerk for routes with custom auth
      // This prevents Clerk from trying to validate Authorization headers
      // that contain API keys instead of JWT tokens
      if (isBypassRoute(req)) {
        return NextResponse.next();
      }
      
      // Protect all routes except public ones
      if (!isPublicRoute(req)) {
        auth().protect();
      }
    })
  : (req: any) => {
      // No-op middleware when Clerk is not configured
      return NextResponse.next();
    };

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
