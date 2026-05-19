import { createServerClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handle Supabase OAuth callback.
 * Supabase redirects here after user signs up/signs in.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    try {
      const supabase = await createServerClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error('[SportIQ] Auth callback error:', error);
      // Continue anyway - they might still be logged in client-side
    }
  }

  // Redirect to onboarding after signup
  return NextResponse.redirect(new URL('/onboarding', request.url));
}
