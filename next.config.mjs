/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "threads.net",
      },
    ],
  },
};

export default nextConfig;
