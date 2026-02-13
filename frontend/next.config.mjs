/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  // Enable source maps in production, helpful for readable stack traces.
  productionBrowserSourceMaps: true,
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
    'rc-tree',
    'rc-table',
    'rc-input',
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

    return config;
  },
  env: {
    GNOSIS_RPC: process.env.GNOSIS_RPC,
    OPTIMISM_RPC: process.env.OPTIMISM_RPC,
    BASE_RPC: process.env.BASE_RPC,
    ETHEREUM_RPC: process.env.ETHEREUM_RPC,
    MODE_RPC: process.env.MODE_RPC,
    CELO_RPC: process.env.CELO_RPC,
    POLYGON_RPC: process.env.POLYGON_RPC,
  },
};

export default nextConfig;
