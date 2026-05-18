/**
 * apps/web — Next.js Middleware
 *
 * Handles:
 *  1. Auth: redirect unauthenticated users to /login
 *  2. Org routing: validate org slug and inject org context
 *  3. Share tokens: allow public access to shared matches
 *
 * Route structure:
 *   /                          → landing (public)
 *   /login                     → auth (public)
 *   /onboarding                → auth (authenticated, no org required)
 *   /[orgSlug]/dashboard       → protected (org member required)
 *   /[orgSlug]/matches/[id]    → protected (org member) OR public (share_token)
 *   /share/[token]             → public share view
 */

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = new Set(['/', '/login', '/signup', '/forgot-password', '/about', '/pricing', '/terms', '/privacy']);
const SHARE_ROUTE   = /^\/share\//;
const AUTH_ROUTE    = /^\/(login|signup|forgot-password)/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes and share routes
  if (PUBLIC_ROUTES.has(pathname) || SHARE_ROUTE.test(pathname)) {
    return NextResponse.next();
  }

  // Create a Supabase client scoped to this request
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => request.cookies.getAll(),
        setAll:  (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Unauthenticated user trying to access a protected route
  if (!user) {
    if (!AUTH_ROUTE.test(pathname)) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // Authenticated user visiting auth pages → redirect to dashboard
  if (AUTH_ROUTE.test(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // For org-scoped routes (/[orgSlug]/...), validate membership
  const orgSlugMatch = pathname.match(/^\/([^/]+)\//);
  if (orgSlugMatch) {
    const orgSlug = orgSlugMatch[1];

    // Skip validation for special root paths
    if (orgSlug && !['dashboard', 'onboarding', 'api', '_next', 'settings'].includes(orgSlug)) {
      const { data: membership } = await supabase
        .from('org_members')
        .select('role')
        .eq('user_id', user.id)
        .in('org_id', (
          await supabase
            .from('organizations')
            .select('id')
            .eq('slug', orgSlug)
        ).data?.map((o) => o.id) ?? [])
        .single();

      if (!membership) {
        // User is authenticated but doesn't belong to this org
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // Inject role header for Server Components to consume
      response.headers.set('x-org-role', membership.role);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
