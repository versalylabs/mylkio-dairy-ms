import type { NextConfig } from "next";

// Where the browser may load things from. The app is served from one origin; the only outside
// host is Unsplash, for the website's and demo's stock photos. Photos a farmer takes are kept as
// data: addresses, and shrunk through blob: addresses. Next.js writes small inline scripts and
// styles itself, so those two directives allow 'unsafe-inline'; everything else is locked down.
// The development server also needs eval for hot reloading, which production never gets.
const scripts = process.env.NODE_ENV === 'production' ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline' 'unsafe-eval'";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scripts}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: contentSecurityPolicy },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
    ] }];
  },
};

export default nextConfig;
