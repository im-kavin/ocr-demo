import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'OCR Demo',
	description: 'A demo application for Optical Character Recognition (OCR)',
	openGraph: {
		title: 'OCR Demo',
		description: 'A demo application for Optical Character Recognition (OCR)',
		images: [
			{
				url: '/open-graph.png',
				width: 1200,
				height: 630,
				alt: 'OCR Demo Preview',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'OCR Demo',
		description: 'A demo application for Optical Character Recognition (OCR)',
		images: ['/open-graph.png'],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				{children}
				<Toaster />
			</body>
		</html>
	);
}
