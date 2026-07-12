/**
 * Helper para el badge de unread en el AdminPage.
 * Suma los unread_count de todos los threads.
 */

import { listAllSupportThreads } from '@/lib/support-chat-api';

export async function countAdminUnreadSupportMessages(): Promise<number> {
  try {
    const threads = await listAllSupportThreads();
    return threads.reduce((a, t) => a + t.unread_count, 0);
  } catch {
    return 0;
  }
}
