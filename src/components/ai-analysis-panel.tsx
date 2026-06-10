import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';

interface AiAnalysis {
  resumen: string;
  fortalezas: string[];
  debilidades: string[];
  recomendaciones: string[];
  jugadores_destacados: { nombre: string; motivo: string }[];
  dato_clave: string;
}

interface AiAnalysisPanelProps {
  matchLocalId: string;
  className?: string;
}

/**
 * Análisis táctico con IA de un partido finalizado.
 * Llama a la edge function ai-match-analysis (cachea 1 análisis por partido;
 * "Regenerar" fuerza uno nuevo, útil después de editar eventos).
 */
export const AiAnalysisPanel = ({ matchLocalId, className }: AiAnalysisPanelProps) => {
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-match-analysis', {
        body: { match_local_id: matchLocalId, force },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis as AiAnalysis);
      setFromCache(Boolean(data.cached));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando el análisis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={cn('rounded-xl border border-border bg-surface p-4 md:p-5', className)}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            ✨ Análisis IA
          </h3>
          <p className="text-[10px] text-muted-fg mt-0.5">
            Lectura táctica del partido generada por IA a partir de tus eventos
          </p>
        </div>
        {analysis && (
          <button
            type="button"
            onClick={() => generate(true)}
            disabled={loading}
            className="shrink-0 text-[11px] text-muted-fg hover:text-fg px-2.5 py-1.5 rounded-md border border-border bg-surface-2 transition-colors disabled:opacity-50"
          >
            ↻ Regenerar
          </button>
        )}
      </div>

      {!analysis && !loading && (
        <button
          type="button"
          onClick={() => generate(false)}
          className="w-full py-3 rounded-md bg-primary/10 border border-primary/40 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          Generar análisis del partido
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-fg">
          <span className="inline-block w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Analizando el partido…
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 mt-2">
          {error}
        </p>
      )}

      {analysis && !loading && (
        <div className="space-y-4 animate-fade-in">
          {/* Dato clave */}
          <div className="rounded-md border border-primary/40 bg-primary/5 px-3 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-primary mb-1">💡 Dato clave</p>
            <p className="text-sm text-fg leading-snug">{analysis.dato_clave}</p>
          </div>

          {/* Resumen */}
          <p className="text-sm text-fg/90 leading-relaxed">{analysis.resumen}</p>

          <div className="grid md:grid-cols-2 gap-3">
            <AiList title="✅ Fortalezas" items={analysis.fortalezas} tone="green" />
            <AiList title="⚠️ Debilidades" items={analysis.debilidades} tone="red" />
          </div>

          <AiList title="🎯 Recomendaciones para el próximo partido" items={analysis.recomendaciones} tone="blue" />

          {analysis.jugadores_destacados?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg mb-1.5">
                ⭐ Jugadores destacados
              </p>
              <div className="space-y-1.5">
                {analysis.jugadores_destacados.map((j) => (
                  <div key={j.nombre} className="flex gap-2 text-xs rounded-md border border-border bg-surface-2/50 px-2.5 py-2">
                    <span className="font-semibold text-fg shrink-0">{j.nombre}</span>
                    <span className="text-muted-fg leading-snug">{j.motivo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fromCache && (
            <p className="text-[10px] text-muted-fg text-center">
              Análisis guardado · si editaste eventos, tocá «Regenerar»
            </p>
          )}
        </div>
      )}
    </section>
  );
};

const AiList = ({ title, items, tone }: { title: string; items: string[]; tone: 'green' | 'red' | 'blue' }) => {
  const dot = tone === 'green' ? 'bg-green-500' : tone === 'red' ? 'bg-red-500' : 'bg-blue-500';
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg mb-1.5">{title}</p>
      <ul className="space-y-1.5">
        {(items ?? []).map((it, i) => (
          <li key={i} className="flex gap-2 text-xs text-fg/90 leading-snug">
            <span className={cn('mt-1 w-1.5 h-1.5 rounded-full shrink-0', dot)} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
};
