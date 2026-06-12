import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './app-shell';
import { RequireAuth } from './require-auth';
import { MatchesPage } from '@/features/matches/matches-page';
import { TeamsPage } from '@/features/teams/teams-page';
import { LiveMatchPage } from '@/features/live-match/live-match-page';
import { MatchAnalysisPage } from '@/features/match-analysis/match-analysis-page';
import { VideoAnalysisPage } from '@/features/video-analysis/video-analysis-page';
import { StatsPage } from '@/features/stats/stats-page';
import { EvolutionPage } from '@/features/evolution/evolution-page';
import { SharePage } from '@/features/share/share-page';
import { SharedAnalysisPage } from '@/features/video-analysis/shared-analysis-page';
import { LandingPage } from '@/features/landing/landing-page';
import { AuthPage } from '@/features/auth/auth-page';
import { ResetPasswordPage } from '@/features/auth/reset-password-page';
import { AdminPage } from '@/features/admin/admin-page';
import { PlansPage } from '@/features/billing/plans-page';
import { BillingReturnPage } from '@/features/billing/billing-return-page';
import { SupportPage } from '@/features/support/support-page';
import { StaffPage } from '@/features/staff/staff-page';
import { I18nProvider } from '@/lib/i18n';
import { AuthProvider } from '@/lib/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  // Public routes
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <AuthPage mode="signin" /> },
  { path: '/signup', element: <AuthPage mode="signup" /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/share/:token', element: <SharePage /> },
  { path: '/share-analysis/:token', element: <SharedAnalysisPage /> },

  // Protected app — everything under /app requires login
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <MatchesPage /> },
          { path: 'teams',     element: <TeamsPage /> },
          { path: 'live',      element: <LiveMatchPage /> },
          { path: 'stats',     element: <StatsPage /> },
          { path: 'evolution', element: <EvolutionPage /> },
          { path: 'analysis/:id', element: <MatchAnalysisPage /> },
          { path: 'video/:id',    element: <VideoAnalysisPage /> },
          { path: 'admin',       element: <AdminPage /> },
          { path: 'plans',       element: <PlansPage /> },
          { path: 'support',     element: <SupportPage /> },
          { path: 'staff',       element: <StaffPage /> },
          { path: 'billing/success', element: <BillingReturnPage status="success" /> },
          { path: 'billing/failure', element: <BillingReturnPage status="failure" /> },
          { path: 'billing/pending', element: <BillingReturnPage status="pending" /> },
        ],
      },
    ],
  },

  // Catch-all → landing
  { path: '*', element: <Navigate to="/" replace /> },
]);

export const App = () => (
  <I18nProvider>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthProvider>
  </I18nProvider>
);
