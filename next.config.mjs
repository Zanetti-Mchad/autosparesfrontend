/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { hostname: "images.pexels.com" },
      { hostname: "localhost" },
      { hostname: "ywzdqadsnkknmmxpyxwf.supabase.co" },
    ],
    unoptimized: true
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "https://autosparesfrontend-production.up.railway.app"]
    }
  },

  async redirects() {
    return [
      {
        source: '/',
        destination: '/sign-in',
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'https://autosparesbackend-production.up.railway.app/api/:path*' 
          : 'http://localhost:4120/api/:path*', // Local development or Railway production
      },
    ];
  },
};

export default nextConfig;