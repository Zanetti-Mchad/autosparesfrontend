/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4120/api/:path*', // Proxy to backend
      },
    ];
  },
};

module.exports = nextConfig;
