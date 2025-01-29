'use server';

import sharp from 'sharp';

export async function preprocessImage(
	buffer: ArrayBuffer,
): Promise<Uint8Array | undefined> {
	try {
		const processedBuffer = await sharp(Buffer.from(buffer))
			.grayscale()
			.normalize()
			.sharpen()
			.threshold(128)
			.toBuffer();

		return new Uint8Array(processedBuffer);
	} catch (error) {
		console.error('Error preprocessing image:', error);
		return undefined;
	}
}
