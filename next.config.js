/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["@supabase/supabase-js", "@supabase/ssr", "tailwind-merge", "clsx", "class-variance-authority"],
  },
};

module.exports = nextConfig;
