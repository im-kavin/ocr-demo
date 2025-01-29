import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	output: 'standalone',
	images: {
		unoptimized: true,
	},
	webpack: (config) => {
		if (process.env.NODE_ENV === 'development') {
			config.externals.push({
				sharp: 'commonjs sharp',
			});
		}
		return config;
	},
};

export default nextConfig;
