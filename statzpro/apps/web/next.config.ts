import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Turborepo-friendly: transpile internal workspace packages
    optimizePackageImports: [
      '@sportiq/core',
      '@sportiq/media',
      '@sportiq/auth',
      '@sportiq/ui',
    ],
  },

  // Allow workspace packages to be transpiled
  transpilePackages: [
    '@sportiq/core',
    '@sportiq/media',
    '@sportiq/auth',
    '@sportiq/ui',
    '@sportiq/analytics',
  ],

  images: {
    remotePatterns: [
      // Supabase Storage
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/**',
      },
      // Future: Cloudflare R2
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          {
            key:   'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',  // allow mic for future voice tagging
          },
        ],
      },
      {
        // Videos served via signed URLs — allow cross-origin for the video player
        source: '/api/storage/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST' },
        ],
      },
    ];
  },

  // Redirect legacy routes from Handball Pro
  async redirects() {
    return [
      // If users bookmarked old routes
      { source: '/dashboard',    destination: '/orgs', permanent: false },
      { source: '/match/:id',   destination: '/orgs',  permanent: false },
    ];
  },
};

export default nextConfig;
