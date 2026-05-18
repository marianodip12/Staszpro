/**
 * apps/web — Root layout.
 *
 * Provider order matters:
 *  1. SupabaseProvider    — client singleton (everything else may need auth)
 *  2. StorageProviderRoot — injectable StorageProvider
 *  3. QueryClientProvider — TanStack Query for server-state
 *  4. OrgProvider         — active org context (reads from URL or session)
 *  5. ThemeProvider       — visual theming
 */

import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets:  ['latin'],
  variable: '--font-sans',
  display:  'swap',
});

const mono = JetBrains_Mono({
  subsets:  ['latin'],
  variable: '--font-mono',
  display:  'swap',
});

export const metadata: Metadata = {
  title:       { default: 'SportIQ', template: '%s — SportIQ' },
  description: 'Unified sports intelligence platform',
  robots:      { index: false },   // until public launch
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
