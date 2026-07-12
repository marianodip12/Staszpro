/**
 * support-chat-api.ts
 * Wrapper de las RPCs de chat de soporte en vivo entre usuario final y admin.
 */

import { supabase } from './supabase';

export interface SupportMessage {
  id: string;
  sender_is_admin: boolean;
  content: string;
  read: boolean;
  created_at: string;
}

export interface SupportThreadSummary {
  user_id: string;
  user_email: string;
  last_message_at: string;
  last_message_preview: string;
  last_message_from_admin: boolean;
  unread_count: number;
  total_messages: number;
}

// ═══════════════════ USER ═══════════════════

export async function postSupportMessage(content: string): Promise<string> {
  const { data, error } = await supabase.rpc('post_support_message', { p_content: content });
  if (error) throw error;
  return data as string;
}

export async function listMySupportMessages(limit = 100): Promise<SupportMessage[]> {
  const { data, error } = await supabase.rpc('list_my_support_messages', { p_limit: limit });
  if (error) throw error;
  return (data as SupportMessage[]) ?? [];
}

export async function countMyUnreadAdminMessages(): Promise<number> {
  const { data, error } = await supabase.rpc('count_my_unread_admin_messages');
  if (error) throw error;
  return Number(data ?? 0);
}

export async function markMyAdminMessagesRead(): Promise<number> {
  const { data, error } = await supabase.rpc('mark_my_admin_messages_read');
  if (error) throw error;
  return Number(data ?? 0);
}

// ═══════════════════ ADMIN ═══════════════════

export async function postAdminSupportMessage(userId: string, content: string): Promise<string> {
  const { data, error } = await supabase.rpc('post_admin_support_message', {
    p_user_id: userId,
    p_content: content,
  });
  if (error) throw error;
  return data as string;
}

export async function listAllSupportThreads(): Promise<SupportThreadSummary[]> {
  const { data, error } = await supabase.rpc('list_all_support_threads');
  if (error) throw error;
  return (data as SupportThreadSummary[]) ?? [];
}

export async function listSupportThread(userId: string, limit = 200): Promise<SupportMessage[]> {
  const { data, error } = await supabase.rpc('list_support_thread', {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data as SupportMessage[]) ?? [];
}

export async function markSupportThreadRead(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('mark_support_thread_read', { p_user_id: userId });
  if (error) throw error;
  return Number(data ?? 0);
}
