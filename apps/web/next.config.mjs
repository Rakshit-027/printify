/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@printflow/database', '@printflow/shared-types'],
  experimental: {
    serverComponentsExternalPackages: ['@azure/storage-blob', 'bcryptjs', 'pdf-lib'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.blob.core.windows.net',
      },
    ],
  },
};

export default nextConfig;
