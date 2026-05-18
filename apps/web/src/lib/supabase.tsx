/**
 * apps/web — Supabase server client setup.
 *
 * Server-side (RSC and Route Handlers) use createServerClient from @supabase/ssr.
 * For client-side, use supabase-provider.tsx instead.
 */

export { createServerClient } from '@supabase/ssr';

/**
 * Create a Supabase client for use in Next.js Server Components and Route Handlers.
 * Usage: const supabase = await createSupabaseServer()
 */
export async function createSupabaseServer() {
  const { createServerClient } = await import('@supabase/ssr');
  const { cookies } = await import('next/headers');

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll:  () => {},   // RSC can't set cookies
      },
    },
  );
}
