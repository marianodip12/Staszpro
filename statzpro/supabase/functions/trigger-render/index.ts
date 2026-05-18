/**
 * Edge Function: trigger-render
 *
 * Called by the client after creating a render_job row.
 * Validates ownership, enqueues the job, and returns the job status.
 *
 * Request:  POST /functions/v1/trigger-render
 * Body:     { render_job_id: string }
 * Response: { job_id: string; status: string; estimated_seconds?: number }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify caller is authenticated
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (authError || !user) return new Response('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => null);
  const { render_job_id } = body ?? {};

  if (!render_job_id) {
    return Response.json({ error: 'render_job_id is required' }, { status: 400 });
  }

  // Fetch the job and verify the caller belongs to the job's org
  const { data: job, error: jobError } = await supabase
    .from('render_jobs')
    .select('id, status, org_id, clip_signature_id, output_format')
    .eq('id', render_job_id)
    .single();

  if (jobError || !job) {
    return Response.json({ error: 'Render job not found' }, { status: 404 });
  }

  // Verify membership
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', job.org_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return Response.json({ error: 'Access denied' }, { status: 403 });
  }

  // Already done or processing — return current status
  if (job.status === 'done' || job.status === 'processing') {
    return Response.json({ job_id: job.id, status: job.status });
  }

  // Mark as queued
  await supabase
    .from('render_jobs')
    .update({ status: 'queued' })
    .eq('id', render_job_id);

  // TODO Phase 4: dispatch to external FFmpeg worker via queue
  // For Phase 1/2, respond with 'queued' and process via a separate cron/webhook.
  // In production this would be: await dispatchToWorker(job)

  return Response.json({
    job_id:             job.id,
    status:             'queued',
    estimated_seconds:  30,  // placeholder — replace with actual estimates
  });
});
