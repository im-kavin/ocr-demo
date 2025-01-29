import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	webpack: (config, { isServer }) => {
		if (!isServer) {
			// Don't bundle sharp on the client side
			config.resolve.fallback = {
				...config.resolve.fallback,
				sharp: false,
			};
		}
		return config;
	},
};

export default nextConfig;
