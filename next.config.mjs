/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { hostname: "images.pexels.com" },
      { hostname: "localhost" }
    ],
    unoptimized: true
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "https://frontendrdjs-production.up.railway.app"]
    }
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