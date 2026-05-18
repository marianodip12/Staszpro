/**
 * Route: /
 * Si el usuario está autenticado → redirige a su primera org.
 * Si no → landing page.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Zap, BarChart3, Video, Users } from 'lucide-react';
import { createSupabaseServer } from '@/lib/supabase';

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Find first org membership
    const { data: membership } = await supabase
      .from('org_members')
      .select('organizations(slug)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true })
      .limit(1)
      .single();

    const slug = (membership?.organizations as any)?.slug;
    if (slug) redirect(`/${slug}/dashboard`);
    else      redirect('/onboarding');
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--navy-950)' }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b"
           style={{ borderColor: 'var(--surface-border)', background: 'var(--navy-900)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--blue-600)' }}>
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>SportIQ</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"
                className="text-sm px-4 py-2 rounded-lg transition-all hover:brightness-110"
                style={{ color: 'var(--text-secondary)' }}>
            Ingresar
          </Link>
          <Link href="/signup"
                className="text-sm px-4 py-2 rounded-lg font-medium transition-all hover:brightness-110"
                style={{ background: 'var(--blue-600)', color: 'white' }}>
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono mb-6"
             style={{ background: 'rgba(37,99,235,.12)', color: 'var(--blue-400)', border: '1px solid rgba(37,99,235,.25)' }}>
          <div className="live-dot" style={{ width: 6, height: 6 }} />
          Plataforma de inteligencia deportiva
        </div>

        <h1 className="font-display font-bold mb-4 max-w-2xl"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'var(--text-primary)', lineHeight: 1.1 }}>
          Analizá. Grabá. Mejorá.
        </h1>

        <p className="text-lg max-w-xl mb-8" style={{ color: 'var(--text-secondary)' }}>
          Estadísticas avanzadas, editor de video y análisis táctico en una sola plataforma.
          Diseñado para entrenadores que quieren tomar decisiones con datos.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/signup"
                className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110 hover:scale-[1.02]"
                style={{ background: 'var(--blue-600)', color: 'white' }}>
            Crear cuenta gratis
          </Link>
          <Link href="/share/demo"
                className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:brightness-110"
                style={{ background: 'var(--navy-700)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}>
            Ver demo
          </Link>
        </div>
      </main>

      {/* Feature grid */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: BarChart3, title: 'Estadísticas en tiempo real', desc: 'Heatmaps, goleadores, arco rival y evolución del marcador al instante.' },
            { icon: Video,     title: 'Editor de clips',             desc: 'Cortá y exportá jugadas directamente del video del partido sin duplicar archivos.' },
            { icon: Users,     title: 'Multi-equipo',                desc: 'Gestioná múltiples equipos, temporadas y torneos desde un solo panel.' },
          ].map((f) => (
            <div key={f.title} className="card p-5 space-y-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                   style={{ background: 'rgba(37,99,235,.12)', border: '1px solid rgba(37,99,235,.2)' }}>
                <f.icon size={18} style={{ color: 'var(--blue-400)' }} />
              </div>
              <p className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-6 border-t" style={{ borderColor: 'var(--surface-border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          © 2025 SportIQ · Construido con Next.js + Supabase
        </p>
      </footer>
    </div>
  );
}
