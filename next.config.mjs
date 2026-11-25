/**
 * Security headers.
 *
 * The app serves no third-party scripts and makes no cross-origin requests, so
 * the policy can be tight. Google Fonts is the only outside origin, and it is
 * allowed for stylesheets and font files only.
 *
 * 'unsafe-inline' for scripts is required by the Next.js App Router bootstrap;
 * removing it needs per-request nonces, which is the next step up if this ever
 * carries anything more sensitive than it does today.
 */
const isDev = process.env.NODE_ENV === 'development';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'" + (isDev ? ' ws: http://localhost:*' : ''),
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Permissions-Policy',
    // Microphone stays on for voice notes; nothing else is needed.
    value: 'camera=(), geolocation=(), payment=(), usb=(), interest-cohort=(), microphone=(self)',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Never advertise the framework version to anyone probing the site.
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  serverExternalPackages: ['bcryptjs'],
  // The demo database has to travel with the functions that read it.
  outputFileTracingIncludes: {
    '/**': ['./prisma/demo.db'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Nothing the API serves should sit in a shared cache.
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    ];
  },
};

export default nextConfig;
