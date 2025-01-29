'use server';

import { openai } from '@ai-sdk/openai';
import { createClient } from '@vercel/postgres';
import { sql } from '@vercel/postgres';
import { streamText } from 'ai';
import { revalidatePath } from 'next/cache';

// Define types for our document storage
interface DocumentMetadata {
	id: string;
	filename: string;
	content: string;
	embedding: number[];
	fileType: string;
	uploadedAt: Date;
}

// Initialize PostgreSQL with pgvector
const initDB = async () => {
	const client = createClient();
	await client.connect();

	// Create documents table with vector support
	await sql`
    CREATE EXTENSION IF NOT EXISTS vector;
    
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding vector(1536),
      file_type TEXT NOT NULL,
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
  `;

	return client;
};

export async function processDocument(file: File, preprocessedFile?: File) {
	try {
		const db = await initDB();

		// Use preprocessed file for images, original file for PDFs
		const fileToProcess = preprocessedFile || file;
		const fileType = file.type;

		// Convert file to base64 for OpenAI API
		const buffer = await fileToProcess.arrayBuffer();
		const base64 = Buffer.from(buffer).toString('base64');

		// Extract text using OpenAI's Vision model for images or text model for PDFs
		let extractedText = '';
		if (fileType.startsWith('image/')) {
			const result = await streamText({
				model: openai('gpt-4-vision-preview'),
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: 'Extract all text from this image, maintaining the original formatting and structure.',
							},
							{
								type: 'image',
								image: `data:${fileType};base64,${base64}`,
							},
						],
					},
				],
			});

			for await (const chunk of result.textStream) {
				extractedText += chunk;
			}
		} else {
			// For PDFs, we'll need to use a different approach
			const textContent = await extractPDFText(fileToProcess);
			extractedText = textContent;
		}

		// Generate embedding for the extracted text
		const embedding = await openai.embedding(extractedText);

		// Convert embedding to array and prepare for PostgreSQL
		const embeddingArray = `{${embedding.toString()}}`;

		// Store document and embedding in PostgreSQL
		const documentId = crypto.randomUUID();
		await sql`
      INSERT INTO documents (id, filename, content, embedding, file_type)
      VALUES (
        ${documentId}, 
        ${file.name}, 
        ${extractedText}, 
        ${embeddingArray}::vector, 
        ${fileType}
      )
    `;

		revalidatePath('/');

		return {
			success: true,
			text: extractedText,
		};
	} catch (error) {
		console.error('Error processing document:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred',
		};
	}
}

// Helper function to handle PDF text extraction
async function extractPDFText(file: File): Promise<string> {
	// You'll need to implement PDF text extraction here
	// Consider using pdf-parse or a similar library
	// For now, returning empty string as placeholder
	return '';
}
