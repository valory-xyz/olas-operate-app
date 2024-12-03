/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  transpilePackages: [
    'rc-util',
    '@babel/runtime',
    '@ant-design',
    'rc-pagination',
    'rc-picker',
  ],
  webpack: (config) => {
    if (config.snapshot) {
      config.snapshot = {
        ...(config.snapshot ?? {}),
        // Add all node_modules but @next module to managedPaths
        // Allows for hot refresh of changes to @next module
        managedPaths: [/^(.+?[\\/]node_modules[\\/])(?!@next)/],
      };
    }

    config.resolve.fallback = {
      // if you miss it, all the other options in fallback, specified
      // by next.js will be dropped.
      ...config.resolve.fallback,

      fs: false, // the solution
    };

    return config;
  },
  env: {
    GNOSIS_RPC: process.env.GNOSIS_RPC,
    OPTIMISM_RPC: process.env.OPTIMISM_RPC,
    BASE_RPC: process.env.BASE_RPC,
    ETHEREUM_RPC: process.env.ETHEREUM_RPC,
  },
};

export default nextConfig;
