import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '@/domain/constants';
import { useMatchStore } from '@/lib/store';
import { useI18n, useT, LOCALE_LABELS, type Locale } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { usePlan } from '@/lib/use-plan';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { trackVisit } from '@/lib/visits';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { DonationDialog } from '@/components/donation-dialog';
import { TutorialOverlay, useShouldShowTutorial } from '@/features/tutorial/tutorial-overlay';
import { SupportButton } from '@/components/support-button';
import { BetaBanner } from '@/components/beta-banner';
import { AdminPlanPreview } from '@/components/admin-plan-preview';
import { ClubSwitcher, ClubContextBanner } from '@/components/club-switcher';
import { clearClubContextSilent } from '@/lib/club-context';

export const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const status = useMatchStore((s) => s.status);
  const uiProMax = useMatchStore((s) => s.uiProMax);
  const t = useT();
  const { locale, setLocale } = useI18n();
  const { user, signOut } = useAuth();
  const { plan } = usePlan();
  const { show: showTutorial, setShow: setShowTutorial } = useShouldShowTutorial();
  const [isAdmin, setIsAdmin] = useState(false);

  // Registro de visita a la app (una por sesión de navegador)
  useEffect(() => { void trackVisit('app'); }, []);

  const [changePassOpen, setChangePassOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);

  // Check admin status
  useEffect(() => {
    if (!user) return;
    supabase.rpc('is_current_user_admin').then(({ data }) => {
      setIsAdmin(data === true);
    });
  }, [user]);

  // When the user changes (login/logout), clear local zustand cache so
  // we don't accidentally show one user's matches under another's account.
  // We track the user id to detect when it changes.
  useEffect(() => {
    if (!user) return;
    const KEY = 'hp_last_user_id';
    const last = localStorage.getItem(KEY);
    if (last && last !== user.id) {
      // User changed — wipe local app state (Supabase migration handles data transfer)
      try {
        localStorage.removeItem('handball-pro-v11');
        clearClubContextSilent();
      } catch {
        /* ignore */
      }
      localStorage.setItem(KEY, user.id);
      // Force reload so the freshly-cleared store is rehydrated empty
      window.location.replace('/app');
      return;
    }
    if (!last) localStorage.setItem(KEY, user.id);
  }, [user]);

  const handleSignOut = async () => {
    if (!window.confirm(t.auth_signout + '?')) return;
    await signOut();
    // Wipe local data so the next user (or none) starts clean
    try {
      localStorage.removeItem('handball-pro-v11');
      localStorage.removeItem('hp_last_user_id');
    } catch {
      /* ignore */
    }
    navigate('/', { replace: true });
  };

  const navLabels: Record<string, string> = {
    matches:   t.nav_matches,
    teams:     t.nav_teams,
    live:      t.nav_live,
    stats:     t.nav_stats,
    evolution: t.nav_evolution,
  };

  const liveLabel = status === 'live'
    ? t.live_banner
    : locale === 'en' ? 'No match' : locale === 'pt' ? 'Sem jogo' : 'Sin partido';

  return (
    <div className={cn('min-h-screen flex bg-bg text-fg', uiProMax && 'ui-pro-max')}>
      {/* ── Sidebar — desktop only ─────────────────────────────────────── */}
      <nav className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-surface lg:overflow-y-auto lg:fixed lg:inset-0">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <img src="/statzpro-favicon.svg" alt="StatzPro" className="w-8 h-8 rounded-md" />
            <div>
              <div className="text-sm font-semibold">StatzPro</div>
              <span className="text-[9px] px-1.5 py-[1px] rounded bg-primary/15 border border-primary/30 text-primary font-semibold tracking-wider">
                v11
              </span>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex-1 flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === '/app'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium',
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/40'
                    : 'text-muted-fg hover:text-fg hover:bg-surface-2',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <NavIcon itemKey={item.key} active={isActive} />
                  <span className="flex-1">{navLabels[item.key] ?? item.label}</span>
                  {item.key === 'live' && status === 'live' && (
                    <span className="w-2 h-2 rounded-full bg-danger block" />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Mi Plan link — visible para todos los logueados */}
          <NavLink
            to="/app/plans"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium mt-2 border-t border-border pt-3',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-fg hover:text-fg hover:bg-surface-2',
              )
            }
          >
            <span>💳</span>
            <span className="flex-1">Mi Plan</span>
            <span className={cn(
              'text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase',
              plan === 'free' ? 'bg-surface-2 text-muted-fg' :
              plan === 'pro' ? 'bg-blue-500/20 text-blue-400' :
              plan === 'club' ? 'bg-green-500/20 text-green-400' :
              'bg-amber-500/20 text-amber-400'
            )}>
              {plan}
            </span>
          </NavLink>

          {/* Mi Staff — usuarios habilitados (Club/Elite, la página gatea) */}
          <NavLink
            to="/app/staff"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium mt-1',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-fg hover:text-fg hover:bg-surface-2',
              )
            }
          >
            👔 <span>Mi Staff</span>
          </NavLink>

          {/* 👔 Selector de contexto de club (solo si fue invitado a alguno) */}
          <ClubSwitcher />

          {/* Soporte link — visible para todos los logueados */}
          <NavLink
            to="/app/support"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium mt-1',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-fg hover:text-fg hover:bg-surface-2',
              )
            }
          >
            💬 <span>Soporte</span>
          </NavLink>

          {/* Admin link — only visible for admins */}
          {isAdmin && (
            <NavLink
              to="/app/admin"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium mt-1',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-fg hover:text-fg hover:bg-surface-2',
                )
              }
            >
              🛡️ <span>Admin</span>
            </NavLink>
          )}

          {/* Admin plan preview selector */}
          {isAdmin && <AdminPlanPreview />}

          {/* 💛 Donar — llamativo, abre el diálogo de donación */}
          <button
            type="button"
            onClick={() => setDonateOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 transition-colors mt-1 animate-pulse-slow"
          >
            💛 <span>Donar</span>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-500/40 rounded px-1.5 py-0.5">Beta</span>
          </button>

          {/* Replay tutorial */}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('hp_tutorial_completed');
              setShowTutorial(true);
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-fg hover:text-fg hover:bg-surface-2 transition-colors mt-1"
          >
            ❓ <span>{locale === 'en' ? 'Tutorial' : locale === 'pt' ? 'Tutorial' : 'Tutorial'}</span>
          </button>
        </div>

        {/* Sidebar footer: language + status + account */}
        <div className="border-t border-border p-3 space-y-3">
          <LocaleSelector locale={locale} setLocale={setLocale} />
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-semibold uppercase tracking-wider',
            status === 'live'
              ? 'border-danger/40 bg-danger/10 text-danger'
              : 'border-border bg-surface-2/60 text-muted-fg',
          )}>
            <span className={cn('w-2 h-2 rounded-full', status === 'live' ? 'bg-danger animate-pulse-live' : 'bg-muted-fg')} />
            {liveLabel}
          </div>
          {user?.email && (
            <div className="rounded-md border border-border bg-surface-2/40 p-2">
              <div className="text-[9px] uppercase tracking-widest text-muted-fg mb-1">
                {t.auth_my_account}
              </div>
              <div className="text-[11px] text-fg truncate" title={user.email}>
                {user.email}
              </div>
              <button
                type="button"
                onClick={() => setChangePassOpen(true)}
                className="mt-2 w-full text-[10px] py-1.5 rounded border border-border bg-bg hover:bg-surface text-muted-fg hover:text-fg transition-colors"
              >
                🔒 Cambiar contraseña
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-1.5 w-full text-[10px] py-1.5 rounded border border-border bg-bg hover:bg-surface text-muted-fg hover:text-danger transition-colors"
              >
                {t.auth_signout}
              </button>
            </div>
          )}
          <ChangePasswordDialog open={changePassOpen} onClose={() => setChangePassOpen(false)} />
          <DonationDialog open={donateOpen} onClose={() => setDonateOpen(false)} />
        </div>
      </nav>

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile/tablet header */}
        <header className="lg:hidden px-4 pt-3 pb-3 flex items-center justify-between border-b border-border bg-surface-2/40">
          <div className="flex items-center gap-2">
            <img src="/statzpro-favicon.svg" alt="StatzPro" className="w-6 h-6 rounded-md" />
            <span className="text-[13px] font-medium tracking-tight">StatzPro</span>
            <span className="text-[9px] px-1.5 py-[1px] rounded bg-primary/15 border border-primary/30 text-primary font-semibold tracking-wider">v11</span>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSelector locale={locale} setLocale={setLocale} compact />
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider',
              status === 'live'
                ? 'border-danger/40 bg-danger/10 text-danger'
                : 'border-border bg-surface-2/60 text-muted-fg',
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', status === 'live' ? 'bg-danger animate-pulse-live' : 'bg-muted-fg')} />
              {liveLabel}
            </div>
            {user?.email && (
              <button
                type="button"
                onClick={handleSignOut}
                title={`${user.email} · ${t.auth_signout}`}
                className="w-7 h-7 rounded-full border border-border bg-surface-2 grid place-items-center text-[10px] font-semibold text-muted-fg hover:text-danger hover:border-danger/40 transition-colors"
              >
                {user.email[0]?.toUpperCase() ?? '?'}
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main
          key={location.pathname}
          className="flex-1 overflow-y-auto px-4 pt-4 pb-20 md:px-6 md:py-5 md:pb-6 lg:pb-6 animate-fade-in"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="w-full mx-auto lg:max-w-6xl">
            <BetaBanner className="mb-3" />
            <ClubContextBanner className="mb-3" />
            <Outlet />
          </div>
        </main>

        {/* Bottom nav — mobile & tablet only */}
        <nav className="lg:hidden fixed md:relative bottom-0 left-0 right-0 z-50 bg-bg/95 backdrop-blur border-t border-border flex pb-[env(safe-area-inset-bottom,0)] md:pb-0 md:flex-row md:justify-center md:gap-2 md:p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === '/app'}
              className={({ isActive }) => cn(
                'flex-1 md:flex-none py-2.5 md:py-2 md:px-4 flex flex-col md:flex-row md:items-center md:gap-2 items-center gap-1 touch-target transition-colors relative',
                isActive ? 'text-primary' : 'text-muted-fg hover:text-fg',
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute md:hidden top-0 left-[20%] right-[20%] h-[2px] rounded-b bg-primary" />}
                  {item.key === 'live' && status === 'live' && (
                    <span className="absolute top-1.5 right-[30%] w-1.5 h-1.5 rounded-full bg-danger md:hidden" />
                  )}
                  <NavIcon itemKey={item.key} active={isActive} />
                  <span className="text-[9px] md:text-xs font-medium tracking-wider">
                    {navLabels[item.key] ?? item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Tutorial overlay — shown on first visit */}
      {showTutorial && (
        <TutorialOverlay onClose={() => setShowTutorial(false)} />
      )}

      {/* Floating support button */}
      <SupportButton />
    </div>
  );
};

// ─── Language selector ───────────────────────────────────────────────

const LOCALES: Locale[] = ['es', 'en', 'pt'];

const LocaleSelector = ({
  locale, setLocale, compact = false,
}: { locale: Locale; setLocale: (l: Locale) => void; compact?: boolean }) => {
  if (compact) {
    const next = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length];
    return (
      <button
        type="button"
        onClick={() => setLocale(next)}
        title="Change language"
        className="text-[11px] font-semibold px-2 py-1 rounded border border-border bg-surface-2/60 text-muted-fg hover:text-fg transition-colors whitespace-nowrap"
      >
        {LOCALE_LABELS[locale]}
      </button>
    );
  }
  return (
    <div className="flex gap-1 rounded-md border border-border bg-surface-2/40 p-1">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={cn(
            'flex-1 text-[10px] font-semibold py-1 rounded transition-colors',
            l === locale ? 'bg-primary/20 text-primary border border-primary/40' : 'text-muted-fg hover:text-fg',
          )}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
};

// ─── Nav icons ───────────────────────────────────────────────────────

const NavIcon = ({ itemKey, active }: { itemKey: string; active: boolean }) => {
  const sw = active ? 2 : 1.8;
  switch (itemKey) {
    case 'matches':   return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>;
    case 'teams':     return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M15 20c0-2 1.5-3.5 4-3.5"/></svg>;
    case 'live':      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill={active ? 'currentColor' : 'none'}/></svg>;
    case 'stats':     return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>;
    case 'evolution': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8M14 7h7v7"/></svg>;
    default:          return null;
  }
};
