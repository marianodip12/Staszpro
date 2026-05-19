import { NextRequest, NextResponse } from 'next/server';

/**
 * Supabase Auth Callback Route
 * 
 * Supabase redirects here after user signs up/in.
 * The client-side already handles the session via Supabase auth listener.
 * We just need to redirect to the app.
 */
export async function GET(request: NextRequest) {
  // Get the origin to redirect to
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  // Redirect to onboarding - Supabase client already has the session
  return NextResponse.redirect(`${origin}/onboarding`);
}
