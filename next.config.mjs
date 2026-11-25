/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  serverExternalPackages: ['bcryptjs'],
  // The demo database has to travel with the functions that read it.
  outputFileTracingIncludes: {
    '/**': ['./prisma/demo.db'],
  },
};

export default nextConfig;
