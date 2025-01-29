import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	webpack: (config) => {
		config.externals.push({
			sharp: 'commonjs sharp',
		});
		return config;
	},
};

export default nextConfig;
