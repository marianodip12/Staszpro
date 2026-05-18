/**
 * Route: POST /api/render/trigger
 * Proxy to Supabase Edge Function trigger-render.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase';

const EDGE_FN_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/trigger-render`;

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const res = await fetch(EDGE_FN_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
