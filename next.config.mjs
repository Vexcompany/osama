/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Keep server actions enabled for the aspiration submit flow
    serverActions: {
      bodySizeLimit: "32kb",
    },
  },
  // We rely on Supabase via REST; no server-only packages needed at build.
  transpilePackages: [],
};

export default nextConfig;
