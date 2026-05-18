'use client';

/**
 * OrgShell — persistent app shell with sidebar + topbar.
 *
 * Aesthetic: industrial-precision sports dashboard.
 * Sidebar: narrow, icon-first, expandable on hover.
 * Topbar: org switcher + breadcrumb + user menu.
 */

import { useState, createContext, useContext, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Play, BarChart3, Users, Trophy,
  Settings, ChevronRight, Menu, X, Zap, LogOut,
  Video, TrendingUp, Shield,
} from 'lucide-react';
import type { Organization, OrgMemberRole } from '@sportiq/core';

// ─── Context ──────────────────────────────────────────────────────────────────

interface OrgContextValue {
  org:    Organization;
  role:   OrgMemberRole;
  userId: string;
}

const OrgCtx = createContext<OrgContextValue | null>(null);

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgCtx);
  if (!ctx) throw new Error('useOrg must be used inside OrgShell');
  return ctx;
}

// ─── Nav definition ───────────────────────────────────────────────────────────

interface NavItem {
  label:    string;
  href:     (slug: string) => string;
  icon:     React.ElementType;
  badge?:   string;
  roles?:   OrgMemberRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  href: (s) => `/${s}/dashboard`,        icon: LayoutDashboard },
  { label: 'Partidos',   href: (s) => `/${s}/matches`,          icon: Play             },
  { label: 'Video',      href: (s) => `/${s}/video`,            icon: Video            },
  { label: 'Estadísticas',href: (s) => `/${s}/stats`,           icon: BarChart3        },
  { label: 'Evolución',  href: (s) => `/${s}/evolution`,        icon: TrendingUp       },
  { label: 'Equipos',    href: (s) => `/${s}/teams`,            icon: Users            },
  { label: 'Torneos',    href: (s) => `/${s}/tournaments`,      icon: Trophy           },
  { label: 'Scouting',   href: (s) => `/${s}/scouting`,         icon: Shield,
    badge: 'Pronto', roles: ['owner', 'coach'] },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Ajustes',    href: (s) => `/${s}/settings`,         icon: Settings         },
];

// ─── Shell component ──────────────────────────────────────────────────────────

interface OrgShellProps {
  org:      Organization;
  role:     OrgMemberRole;
  userId:   string;
  children: ReactNode;
}

export function OrgShell({ org, role, userId, children }: OrgShellProps) {
  const [expanded, setExpanded]   = useState(false);
  const [mobileOpen, setMobile]   = useState(false);
  const pathname = usePathname();

  return (
    <OrgCtx.Provider value={{ org, role, userId }}>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--navy-950)' }}>

        {/* ── Mobile overlay ─────────────────────────────────────────── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMobile(false)}
          />
        )}

        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <aside
          className={[
            'fixed md:relative z-50 flex flex-col h-full',
            'border-r transition-all duration-300',
            expanded ? 'w-52' : 'w-14',
            mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          ].join(' ')}
          style={{
            background:  'var(--navy-900)',
            borderColor: 'var(--surface-border)',
          }}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-3.5 py-4 border-b"
               style={{ borderColor: 'var(--surface-border)' }}>
            <div className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
                 style={{ background: 'var(--blue-600)' }}>
              <Zap size={14} className="text-white" />
            </div>
            <span
              className="font-display font-bold text-lg tracking-wide overflow-hidden whitespace-nowrap transition-all duration-300"
              style={{ width: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0, color: 'var(--text-primary)' }}
            >
              SportIQ
            </span>
          </div>

          {/* Primary nav */}
          <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
            {NAV_ITEMS.filter((item) =>
              !item.roles || item.roles.includes(role)
            ).map((item) => (
              <NavLink
                key={item.label}
                item={item}
                slug={org.slug}
                expanded={expanded}
                active={pathname.startsWith(item.href(org.slug))}
                onNavigate={() => setMobile(false)}
              />
            ))}
          </nav>

          {/* Bottom nav */}
          <div className="py-3 border-t space-y-0.5"
               style={{ borderColor: 'var(--surface-border)' }}>
            {BOTTOM_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                item={item}
                slug={org.slug}
                expanded={expanded}
                active={pathname.startsWith(item.href(org.slug))}
                onNavigate={() => setMobile(false)}
              />
            ))}

            {/* Org name */}
            <div className="px-3 py-2 mt-1 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold font-mono"
                     style={{ background: 'var(--navy-600)', color: 'var(--blue-400)' }}>
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <div
                  className="overflow-hidden transition-all duration-300 min-w-0"
                  style={{ width: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
                >
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {org.name}
                  </p>
                  <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                    {role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main area ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Topbar */}
          <header className="flex-shrink-0 flex items-center gap-3 px-4 h-12 border-b"
                  style={{ background: 'var(--navy-900)', borderColor: 'var(--surface-border)' }}>
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1 rounded"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setMobile(true)}
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb */}
            <Breadcrumb pathname={pathname} orgSlug={org.slug} orgName={org.name} />

            <div className="flex-1" />

            {/* Plan badge */}
            <span className="hidden sm:block text-xs font-mono px-2 py-0.5 rounded uppercase tracking-wider"
                  style={{
                    background:  org.plan === 'free' ? 'var(--navy-600)' : 'rgba(37,99,235,.2)',
                    color:       org.plan === 'free' ? 'var(--text-muted)' : 'var(--blue-400)',
                    border:      `1px solid ${org.plan === 'free' ? 'var(--surface-border)' : 'rgba(37,99,235,.3)'}`,
                  }}>
              {org.plan}
            </span>

            {/* Sport type */}
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {org.sport_type}
            </span>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto" style={{ background: 'var(--navy-950)' }}>
            {children}
          </main>
        </div>
      </div>
    </OrgCtx.Provider>
  );
}

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({
  item, slug, expanded, active, onNavigate,
}: {
  item:       NavItem;
  slug:       string;
  expanded:   boolean;
  active:     boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href(slug)}
      onClick={onNavigate}
      className="flex items-center gap-2.5 mx-1.5 px-2 py-2 rounded-md transition-all duration-150 relative group"
      style={{
        background: active ? 'var(--navy-600)' : 'transparent',
        color:      active ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
      title={!expanded ? item.label : undefined}
    >
      {/* Active indicator */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r"
              style={{ background: 'var(--blue-500)' }} />
      )}

      <Icon size={16} className="flex-shrink-0" />

      <span
        className="text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-300 flex-1"
        style={{ width: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
      >
        {item.label}
      </span>

      {item.badge && expanded && (
        <span className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'var(--navy-500)', color: 'var(--text-muted)', fontSize: '10px' }}>
          {item.badge}
        </span>
      )}

      {/* Tooltip when collapsed */}
      {!expanded && (
        <div className="absolute left-full ml-2 px-2 py-1 rounded text-xs whitespace-nowrap
                        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
             style={{ background: 'var(--navy-700)', color: 'var(--text-primary)',
                      border: '1px solid var(--surface-border)' }}>
          {item.label}
          {item.badge && <span className="ml-1" style={{ color: 'var(--text-muted)' }}>· {item.badge}</span>}
        </div>
      )}
    </Link>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ pathname, orgSlug, orgName }: {
  pathname: string; orgSlug: string; orgName: string;
}) {
  const segments = pathname
    .replace(`/${orgSlug}`, '')
    .split('/')
    .filter(Boolean);

  const labels: Record<string, string> = {
    dashboard: 'Dashboard', matches: 'Partidos', video: 'Video',
    stats: 'Estadísticas', evolution: 'Evolución', teams: 'Equipos',
    tournaments: 'Torneos', scouting: 'Scouting', settings: 'Ajustes',
    live: 'En vivo', analysis: 'Análisis', timeline: 'Timeline',
  };

  return (
    <div className="flex items-center gap-1.5 text-sm min-w-0">
      <span className="font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
        {orgName}
      </span>
      {segments.map((seg, i) => (
        <span key={seg} className="flex items-center gap-1.5 min-w-0">
          <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span
            className="truncate"
            style={{ color: i === segments.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {labels[seg] ?? seg}
          </span>
        </span>
      ))}
    </div>
  );
}
