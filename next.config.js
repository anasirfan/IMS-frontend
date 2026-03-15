/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://69.62.125.138:5041/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
