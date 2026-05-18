/**
 * @sportiq/auth — Auth helpers, Supabase client factory, and org context utilities.
 *
 * This package bridges Supabase Auth with the SportIQ multi-tenant model.
 * It provides typed helpers that any feature can import without knowing
 * the details of the Supabase client setup.
 */

import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';
import type { Organization, OrgMember, OrgMemberRole, UserProfile } from '@sportiq/core';

// ─── Supabase client ──────────────────────────────────────────────────────────

let _client: SupabaseClient | null = null;

export interface SupabaseConfig {
  url:     string;
  anonKey: string;
}

/**
 * Initialize the Supabase client singleton.
 * Call once at app startup (e.g. in apps/web/src/lib/supabase.ts).
 */
export function initSupabase(config: SupabaseConfig): SupabaseClient {
  _client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession:    true,
      autoRefreshToken:  true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}

export function getSupabase(): SupabaseClient {
  if (!_client) throw new Error('[sportiq/auth] Supabase not initialized. Call initSupabase() first.');
  return _client;
}

// ─── Auth state types ─────────────────────────────────────────────────────────

export interface AuthState {
  user:    User    | null;
  session: Session | null;
  loading: boolean;
}

export interface OrgContext {
  org:    Organization;
  role:   OrgMemberRole;
  member: OrgMember;
}

// ─── Org helpers ──────────────────────────────────────────────────────────────

/**
 * Fetch all organizations the current user belongs to, with their role.
 */
export async function getUserOrgs(): Promise<OrgContext[]> {
  const sb = getSupabase();

  const { data, error } = await sb
    .from('org_members')
    .select(`
      role,
      joined_at,
      organizations (
        id, name, slug, sport_type, plan, logo_url, created_at, updated_at
      )
    `)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data
    .filter((row) => row.organizations != null)
    .map((row) => ({
      org:    row.organizations as unknown as Organization,
      role:   row.role as OrgMemberRole,
      member: {
        org_id:    (row.organizations as any).id,
        user_id:   '',  // filled from auth context by caller
        role:      row.role as OrgMemberRole,
        joined_at: row.joined_at,
      },
    }));
}

/**
 * Fetch a single org by slug (for URL-based routing: /[orgSlug]/...).
 * Verifies the calling user is a member.
 */
export async function getOrgBySlug(slug: string): Promise<OrgContext | null> {
  const sb = getSupabase();

  const { data, error } = await sb
    .from('organizations')
    .select(`
      *,
      org_members!inner (role, joined_at)
    `)
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  const member = (data as any).org_members?.[0];
  if (!member) return null;

  return {
    org:  data as unknown as Organization,
    role: member.role as OrgMemberRole,
    member: {
      org_id:    data.id,
      user_id:   '',
      role:      member.role,
      joined_at: member.joined_at,
    },
  };
}

/**
 * Role-based permission check (used in Server Components and middleware).
 */
export function canWrite(role: OrgMemberRole): boolean {
  return role === 'owner' || role === 'coach' || role === 'analyst';
}

export function canManage(role: OrgMemberRole): boolean {
  return role === 'owner' || role === 'coach';
}

export function isOwner(role: OrgMemberRole): boolean {
  return role === 'owner';
}

// ─── Profile helpers ──────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data ?? null;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('profiles').update(updates).eq('id', userId);
  if (error) throw error;
}

// ─── Plan guards ──────────────────────────────────────────────────────────────

export type PlanFeature =
  | 'video_upload'
  | 'clip_export'
  | 'advanced_analytics'
  | 'timeline_editor'
  | 'team_collaboration'
  | 'custom_branding'
  | 'ai_tagging';

const PLAN_FEATURES: Record<string, PlanFeature[]> = {
  free: [
    'video_upload',
  ],
  pro: [
    'video_upload',
    'clip_export',
    'advanced_analytics',
    'timeline_editor',
  ],
  team: [
    'video_upload',
    'clip_export',
    'advanced_analytics',
    'timeline_editor',
    'team_collaboration',
  ],
  enterprise: [
    'video_upload',
    'clip_export',
    'advanced_analytics',
    'timeline_editor',
    'team_collaboration',
    'custom_branding',
    'ai_tagging',
  ],
};

export function planHasFeature(plan: string, feature: PlanFeature): boolean {
  return (PLAN_FEATURES[plan] ?? []).includes(feature);
}
