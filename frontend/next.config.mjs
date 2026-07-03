/** @type {import('next').NextConfig} */
const internalApi = process.env.INTERNAL_API_URL || "http://backend:8001";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${internalApi}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
