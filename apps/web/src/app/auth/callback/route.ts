import { createSupabaseServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handle Supabase OAuth callback.
 * Supabase redirects here after user signs up/signs in with magic link.
 */export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  
  // Redirect to onboarding - Supabase client ya tiene la sesión
  return NextResponse.redirect(`${origin}/onboarding`);
}
