/**
 * VISITS — registro liviano de visitas para el panel admin.
 *
 * Registra una visita por sesión de navegador por superficie:
 *   - 'landing': alguien entró a la página principal
 *   - 'app': alguien entró a la app (/app)
 *
 * No usa cookies ni identifica a nadie más allá del user_id de Supabase
 * si existe sesión. Falla en silencio: jamás puede romper la app.
 */
import { isSupabaseReady, supabase } from './supabase';

export async function trackVisit(surface: 'landing' | 'app'): Promise<void> {
  try {
    if (!isSupabaseReady()) return;

    // Una visita por sesión de navegador por superficie (no spamear la tabla)
    const key = `statzpro-visit-${surface}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    const { data: { session } } = await supabase.auth.getSession();

    await supabase.from('page_visits').insert({
      surface,
      user_id: session?.user?.id ?? null,
      path: window.location.pathname,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent.slice(0, 250),
      lang: navigator.language || null,
    });
  } catch {
    // silencio total: el tracking nunca molesta al usuario
  }
}
