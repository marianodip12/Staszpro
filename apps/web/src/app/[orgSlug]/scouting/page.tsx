/**
 * Route: /[orgSlug]/scouting
 * Coming-soon gate — visible solo para owner/coach.
 * Se activa con NEXT_PUBLIC_FF_SCOUTING=true.
 */

import Link from 'next/link';
import { Shield, Lock, ChevronRight } from 'lucide-react';

export default function ScoutingPage() {
  const enabled = process.env.NEXT_PUBLIC_FF_SCOUTING === 'true';

  if (enabled) {
    // Placeholder para cuando el módulo esté listo
    return (
      <div className="p-6">
        <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
          Scouting
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Módulo en desarrollo.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
           style={{ background: 'var(--navy-800)', border: '1px solid var(--surface-border)' }}>
        <Shield size={36} style={{ color: 'var(--blue-400)' }} />
      </div>

      <h1 className="font-display font-bold text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>
        Scouting
      </h1>
      <p className="text-base mb-1" style={{ color: 'var(--text-secondary)' }}>
        Análisis y seguimiento de jugadores rivales.
      </p>
      <p className="text-sm mb-8 max-w-sm" style={{ color: 'var(--text-muted)' }}>
        Próximamente: perfiles de jugadores, historial de actuaciones,
        alertas de rendimiento y exportación para cuerpo técnico.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {[
          'Perfiles de jugadores rivales',
          'Historial de partidos analizados',
          'Métricas de rendimiento individual',
          'Exportación de informes',
          'Integración con IA (tagging automático)',
        ].map((feat) => (
          <div key={feat} className="flex items-center gap-3 p-3 rounded-lg text-left"
               style={{ background: 'var(--surface-raised)', border: '1px solid var(--surface-border)' }}>
            <Lock size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{feat}</span>
          </div>
        ))}
      </div>

      <p className="text-xs mt-8" style={{ color: 'var(--text-muted)' }}>
        Disponible en plan Enterprise.{' '}
        <Link href="mailto:hola@sportiq.app" className="hover:underline" style={{ color: 'var(--blue-400)' }}>
          Contactanos
        </Link>
      </p>
    </div>
  );
}

export async function generateMetadata() {
  return { title: 'Scouting — SportIQ' };
}
