import type { Locale } from './dict';

export interface HeadSeo {
  title: string;
  description: string;
  /** valor de <meta property="og:locale"> */
  ogLocale: string;
}

/**
 * SEO de la landing por idioma. El hook `useLocalizedHead` aplica esto al
 * <head> cuando cambia el idioma. (SEO "de verdad" por idioma necesita URLs
 * por idioma + hreflang — pendiente aparte.)
 */
export const LANDING_SEO: Record<Locale, HeadSeo> = {
  es: {
    title: 'StatzPro · Estadísticas y análisis de handball en vivo',
    description:
      'Registrá tiros, atajadas y exclusiones en vivo desde el celular y analizá tus partidos de handball (balonmano): mapas de calor, eficacia por jugador y evolución de la temporada.',
    ogLocale: 'es_AR',
  },
  en: {
    title: 'StatzPro · Live handball stats & match analysis',
    description:
      'Track shots, saves and suspensions live from your phone and analyse your handball matches: shot heatmaps, per-player efficiency and season trends.',
    ogLocale: 'en_US',
  },
  pt: {
    title: 'StatzPro · Estatísticas e análise de handebol ao vivo',
    description:
      'Registre arremessos, defesas e exclusões ao vivo pelo celular e analise seus jogos de handebol: mapas de calor, eficiência por jogador e evolução da temporada.',
    ogLocale: 'pt_BR',
  },
  de: {
    title: 'StatzPro · Handball-Statistik & Spielanalyse live',
    description:
      'Erfasse Würfe, Paraden und Zeitstrafen live per Handy und analysiere deine Handballspiele: Wurf-Heatmaps, Effektivität pro Spieler und Saisonverlauf.',
    ogLocale: 'de_DE',
  },
  fr: {
    title: 'StatzPro · Statistiques et analyse de handball en direct',
    description:
      'Enregistre tirs, arrêts et exclusions en direct depuis ton téléphone et analyse tes matchs de handball : heatmaps de tir, efficacité par joueur et évolution de la saison.',
    ogLocale: 'fr_FR',
  },
  it: {
    title: 'StatzPro · Statistiche e analisi di pallamano dal vivo',
    description:
      'Registra tiri, parate ed esclusioni dal vivo dal telefono e analizza le tue partite di pallamano: heatmap dei tiri, efficacia per giocatore ed evoluzione della stagione.',
    ogLocale: 'it_IT',
  },
};
