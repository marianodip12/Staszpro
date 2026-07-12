import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n, useT, LOCALE_LABELS, type Locale } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { trackVisit } from '@/lib/visits';
import { InteractiveDemo } from './interactive-demo';
import { ModesShowcase } from './modes-showcase';
import { PricingSection } from './pricing-section';
import { SupportButton } from '@/components/support-button';

const LOCALES: Locale[] = ['es', 'en', 'pt'];

export const LandingPage = () => {
  useEffect(() => { void trackVisit('landing'); }, []);

  const t = useT();
  const { locale, setLocale } = useI18n();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 mr-auto">
            <img src="/statzpro-favicon.svg" alt="StatzPro" className="w-7 h-7 rounded-md" />
            <span className="text-sm font-semibold tracking-tight">StatzPro</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <a href="#features" className="px-3 py-1.5 rounded-md text-muted-fg hover:text-fg transition-colors">
              {t.landing_nav_features}
            </a>
            <a href="#modes" className="px-3 py-1.5 rounded-md text-muted-fg hover:text-fg transition-colors">
              Modos
            </a>
            <a href="#pricing" className="px-3 py-1.5 rounded-md text-muted-fg hover:text-fg transition-colors">
              Precios
            </a>
            <a href="#demo" className="px-3 py-1.5 rounded-md text-muted-fg hover:text-fg transition-colors">
              {t.landing_nav_demo}
            </a>
          </nav>

          <LandingLocaleSwitcher locale={locale} setLocale={setLocale} />

          {isAuthenticated ? (
            <Link
              to="/app"
              className="text-xs md:text-sm px-3 py-1.5 rounded-md bg-primary text-primary-fg hover:bg-primary/90 transition-colors font-medium"
            >
              {t.landing_nav_signin === 'Iniciar sesión'
                ? 'Ir a la app'
                : t.landing_nav_signin === 'Sign in'
                  ? 'Open app'
                  : 'Abrir app'}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex text-xs md:text-sm px-3 py-1.5 rounded-md text-muted-fg hover:text-fg transition-colors"
              >
                {t.landing_nav_signin}
              </Link>
              <Link
                to="/signup"
                className="text-xs md:text-sm px-3 py-1.5 rounded-md bg-primary text-primary-fg hover:bg-primary/90 transition-colors font-medium"
              >
                {t.landing_nav_signup}
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20 text-center">
        <p className="text-xs md:text-sm font-semibold uppercase tracking-widest text-primary mb-4">
          🤾 {t.landing_hero_eyebrow}
        </p>
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-tight">
          {t.landing_hero_title}
        </h1>
        <p className="mt-5 text-base md:text-lg text-muted-fg max-w-2xl mx-auto leading-relaxed">
          {t.landing_hero_subtitle}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            to={isAuthenticated ? '/app' : '/signup'}
            className="px-6 py-3 rounded-lg bg-primary text-primary-fg hover:bg-primary/90 transition-colors font-semibold text-sm md:text-base shadow-lg shadow-primary/20"
          >
            {t.landing_hero_cta} →
          </Link>
          <a
            href="#demo"
            className="px-6 py-3 rounded-lg border border-border bg-surface hover:bg-surface-2 transition-colors font-semibold text-sm md:text-base text-muted-fg hover:text-fg"
          >
            {t.landing_hero_secondary}
          </a>
        </div>
        {!isAuthenticated && (
          <p className="mt-4 text-xs text-muted-fg">
            ¿Sos jugador?{' '}
            <Link to="/signup?role=player" className="text-primary hover:underline font-medium">
              Registrate como jugador
            </Link>
          </p>
        )}
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            {t.landing_features_title}
          </h2>
          <p className="mt-3 text-sm md:text-base text-muted-fg max-w-2xl mx-auto">
            {t.landing_features_subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard
            icon="📍"
            title={t.landing_feature1_title}
            desc={t.landing_feature1_desc}
          />
          <FeatureCard
            icon="🔥"
            title={t.landing_feature2_title}
            desc={t.landing_feature2_desc}
          />
          <FeatureCard
            icon="👤"
            title={t.landing_feature3_title}
            desc={t.landing_feature3_desc}
          />
          <FeatureCard
            icon="📈"
            title={t.landing_feature4_title}
            desc={t.landing_feature4_desc}
          />
        </div>
      </section>

      {/* Modes Showcase: Modo Rápido vs Modo Completo */}
      <ModesShowcase />

      {/* Sección Jugador — CTA específico para el modo jugador */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20 w-full">
        <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-surface to-surface p-6 md:p-10 relative overflow-hidden">
          {/* Decorative background */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative grid md:grid-cols-2 gap-6 md:gap-10 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                🤾 Para jugadores
              </p>
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
                También podés registrar<br />tus propios partidos
              </h2>
              <p className="text-sm md:text-base text-muted-fg leading-relaxed mb-6">
                Si sos jugadora o jugador, StatzPro te deja llevar tus estadísticas personales
                partido a partido. Goles, tiros, efectividad, asistencias, exclusiones — todo con
                mapa de zonas y cuadrante del arco.
              </p>
              <ul className="space-y-2 text-sm text-muted-fg mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Marcá dónde tiraste y a qué parte del arco fue</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Modo rápido para cargar sin cuadrantes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Historial completo con efectividad y balance ganados/perdidos</span>
                </li>
              </ul>
              <Link
                to={isAuthenticated ? '/app/player/home' : '/signup?role=player'}
                className="inline-flex px-6 py-3 rounded-lg bg-primary text-primary-fg hover:bg-primary/90 transition-colors font-semibold text-sm md:text-base shadow-lg shadow-primary/20"
              >
                {isAuthenticated ? 'Ir a mi perfil' : 'Empezar como jugador'} →
              </Link>
            </div>

            {/* Preview visual — un mini mock del stat card grid */}
            <div className="grid grid-cols-3 gap-2">
              <PlayerStatPreview label="Goles"       value="47"  color="text-primary" />
              <PlayerStatPreview label="Tiros"       value="82" />
              <PlayerStatPreview label="Efectividad" value="57%" color="text-primary" />
              <PlayerStatPreview label="Asistencias" value="12" />
              <PlayerStatPreview label="Pérdidas"    value="8" />
              <PlayerStatPreview label="2 min"       value="3" />
            </div>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-20 w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            {t.landing_demo_title}
          </h2>
          <p className="mt-3 text-sm md:text-base text-muted-fg max-w-xl mx-auto">
            {t.landing_demo_subtitle}
          </p>
        </div>
        <InteractiveDemo />
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-20 text-center">
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
          {t.landing_cta_title}
        </h2>
        <p className="mt-3 text-sm md:text-base text-muted-fg">
          {t.landing_cta_subtitle}
        </p>
        <div className="mt-7">
          <Link
            to={isAuthenticated ? '/app' : '/signup'}
            className="inline-flex px-8 py-3.5 rounded-lg bg-primary text-primary-fg hover:bg-primary/90 transition-colors font-semibold text-base shadow-lg shadow-primary/20"
          >
            {t.landing_cta_button} →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-surface/40">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row gap-4 items-center justify-between text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <img src="/statzpro-favicon.svg" alt="StatzPro" className="w-6 h-6 rounded-md" />
            <span className="text-muted-fg">{t.landing_footer_tagline}</span>
          </div>
          <div className="flex items-center gap-4 text-muted-fg">
            <a
              href="mailto:marianonicoslosada@gmail.com"
              className="hover:text-fg transition-colors"
            >
              {t.landing_footer_contact}: marianonicoslosada@gmail.com
            </a>
          </div>
        </div>
        <div className="border-t border-border py-3 text-center text-[11px] text-muted-fg">
          {t.landing_footer_copyright}
        </div>
      </footer>

      {/* Floating support button */}
      <SupportButton />
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <div className="rounded-xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors">
    <div className="text-3xl mb-3">{icon}</div>
    <h3 className="text-base font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-fg leading-relaxed">{desc}</p>
  </div>
);

const PlayerStatPreview = ({
  label, value, color,
}: { label: string; value: string; color?: string }) => (
  <div className="rounded-md border border-border bg-bg/60 p-3">
    <div className="text-[9px] uppercase tracking-widest text-muted-fg">{label}</div>
    <div className={cn('mt-1 text-xl font-bold font-mono', color ?? 'text-fg')}>{value}</div>
  </div>
);

const LandingLocaleSwitcher = ({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale: (l: Locale) => void;
}) => (
  <div className="hidden sm:flex gap-0.5 rounded-md border border-border bg-surface p-0.5 mr-1">
    {LOCALES.map((l) => (
      <button
        key={l}
        type="button"
        onClick={() => setLocale(l)}
        className={cn(
          'text-[10px] font-semibold py-1 px-2 rounded transition-colors',
          l === locale ? 'bg-primary/15 text-primary' : 'text-muted-fg hover:text-fg',
        )}
        title={LOCALE_LABELS[l]}
      >
        {l.toUpperCase()}
      </button>
    ))}
  </div>
);
