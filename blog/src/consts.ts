export const SITE = {
  title: 'Blog de StatzPro',
  description:
    'Guías de análisis y estadísticas de handball (balonmano) para entrenadores: cómo llevar la planilla, qué métricas miran los cuerpos técnicos y cómo leer los datos de tu equipo.',
  url: 'https://statzpro.com',
  base: '/blog',
  app: 'https://statzpro.com',
  lang: 'es',
} as const;

export const NAV = [
  { href: '/blog', label: 'Blog' },
  { href: 'https://statzpro.com', label: 'StatzPro' },
  { href: 'https://statzpro.com/signup', label: 'Empezar gratis' },
] as const;
