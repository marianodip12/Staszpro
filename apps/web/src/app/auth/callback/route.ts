import { createSupabaseServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handle Supabase OAuth callback.
 * Supabase redirects here after user signs up/signs in with magic link.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    try {
      const supabase = await createSupabaseServer();
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error('[SportIQ] Auth callback error:', error);
      // Continue redirect even if exchange fails
    }
  }

  // Redirect to onboarding after signup
  return NextResponse.redirect(new URL('/onboarding', request.url));
}
