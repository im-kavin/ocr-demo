'use client';

import { preprocessImage } from '@/actions/preprocess-image';
import { processDocument } from '@/actions/process-documents';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
} from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Cloud, File, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { FC } from 'react';
import { useForm } from 'react-hook-form';

interface ProcessedFile {
	file: File;
	preprocessed?: boolean;
}

interface FileInfo {
	id: string;
	name: string;
	size: string;
	progress: number;
	originalFile: File;
	preprocessedFile?: File;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
	'application/pdf',
	'image/png',
	'image/jpeg',
	'image/jpg',
];

// Fix formatFileSize utility function
const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

// Update the File constructor type with proper type declaration
const createProcessedFile = (
	blob: Blob,
	filename: string,
	type: string,
): File => {
	try {
		// Create a new File object with proper type casting
		const fileArray = [blob];
		const fileOptions = { type };
		const file = new (
			File as unknown as new (
				fileBits: BlobPart[],
				fileName: string,
				options?: FilePropertyBag,
			) => File
		)(fileArray, filename, fileOptions);
		return file;
	} catch (error) {
		// Fallback for browsers that don't support the File constructor
		const file = blob as unknown as File;
		Object.defineProperty(file, 'name', {
			writable: true,
			value: filename,
		});
		Object.defineProperty(file, 'lastModified', {
			writable: true,
			value: new Date().getTime(),
		});
		return file;
	}
};

const preprocessImageFile = async (file: File): Promise<File | undefined> => {
	try {
		if (!file.type.startsWith('image/')) {
			return undefined;
		}

		const buffer = await file.arrayBuffer();
		const processedBuffer = await preprocessImage(buffer);

		if (!processedBuffer) {
			return undefined;
		}

		// Create new file from processed buffer
		const blob = new Blob([processedBuffer], { type: file.type });
		return createProcessedFile(blob, `processed-${file.name}`, file.type);
	} catch (error) {
		console.error('Error preprocessing image:', error);
		return undefined;
	}
};

export const FileUpload: FC = () => {
	const [files, setFiles] = useState<FileInfo[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const { toast } = useToast();
	const form = useForm();
	const inputRef = useRef<HTMLInputElement>(null);
	const [processingStatus, setProcessingStatus] = useState<
		Record<string, string>
	>({});

	const handleFileChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const fileList = event.target.files;
			if (!fileList) return;

			// Check if adding new files would exceed the limit
			if (files.length + fileList.length > MAX_FILES) {
				toast({
					title: 'Error',
					description: `You can only upload up to ${MAX_FILES} files at a time.`,
					variant: 'destructive',
				});
				return;
			}

			const newFiles: FileInfo[] = Array.from(fileList)
				.filter((file) => {
					if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
						toast({
							title: 'Error',
							description: `${file.name} is not a supported file type.`,
							variant: 'destructive',
						});
						return false;
					}
					if (file.size > MAX_FILE_SIZE) {
						toast({
							title: 'Error',
							description: `${file.name} exceeds the 10MB file size limit.`,
							variant: 'destructive',
						});
						return false;
					}
					return true;
				})
				.map((file) => ({
					id: crypto.randomUUID(),
					name: file.name,
					size: formatFileSize(file.size),
					progress: 0,
					originalFile: file,
				}));

			setFiles((prev) => [...prev, ...newFiles]);

			// Replace forEach with for...of loop for better readability and performance
			for (const file of newFiles) {
				const interval = setInterval(() => {
					setFiles((prev) =>
						prev.map((f) =>
							f.id === file.id
								? {
										...f,
										progress: Math.min(f.progress + 10, 100),
									}
								: f,
						),
					);
				}, 500);

				// Clear interval when progress reaches 100
				setTimeout(() => {
					clearInterval(interval);
				}, 5000);
			}
		},
		[files, toast],
	);

	const removeFile = (id: string) => {
		setFiles((prev) => prev.filter((file) => file.id !== id));
	};

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const droppedFiles = Array.from(e.dataTransfer.files);
		handleFiles(droppedFiles);
	}, []);

	const handleFiles = useCallback(
		async (fileList: File[]) => {
			setFiles((prevFiles) => {
				if (fileList.length + prevFiles.length > MAX_FILES) {
					toast({
						title: 'Error',
						description: `You can only upload up to ${MAX_FILES} files at a time.`,
						variant: 'destructive',
					});
					return prevFiles;
				}

				const processFiles = async () => {
					const processedFiles: FileInfo[] = await Promise.all(
						Array.from(fileList)
							.filter((file) => {
								if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
									toast({
										title: 'Error',
										description: `${file.name} is not a supported file type.`,
										variant: 'destructive',
									});
									return false;
								}
								if (file.size > MAX_FILE_SIZE) {
									toast({
										title: 'Error',
										description: `${file.name} exceeds the 10MB file size limit.`,
										variant: 'destructive',
									});
									return false;
								}
								return true;
							})
							.map(async (file) => {
								const preprocessedFile = file.type.startsWith('image/')
									? await preprocessImageFile(file)
									: undefined;

								const fileInfo: FileInfo = {
									id: crypto.randomUUID(),
									name: file.name,
									size: formatFileSize(file.size),
									progress: 0,
									originalFile: file,
									preprocessedFile,
								};

								// Process document with OpenAI
								const result = await processDocument(file, preprocessedFile);

								if (result.success) {
									setProcessingStatus((prev) => ({
										...prev,
										[fileInfo.id]: 'Processed successfully',
									}));
								} else {
									setProcessingStatus((prev) => ({
										...prev,
										[fileInfo.id]: `Error: ${result.error}`,
									}));
								}

								return fileInfo;
							}),
					);

					setFiles((current) => [...current, ...processedFiles]);
				};

				// Start processing
				processFiles();
				return prevFiles;
			});
		},
		[toast],
	);

	const handleButtonClick = () => {
		inputRef.current?.click();
	};

	return (
		<Form {...form}>
			<form className="space-y-6">
				<FormField
					control={form.control}
					name="files"
					render={() => (
						<FormItem>
							<FormLabel className="text-lg font-semibold">
								Upload Documents
							</FormLabel>
							<FormControl>
								<div className="grid w-full gap-4">
									<div
										className={cn(
											'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
											isDragging
												? 'border-primary/50 bg-primary/5'
												: 'border-muted-foreground/25',
											files.length > 0 && 'border-muted bg-muted/5',
										)}
										onDragOver={handleDragOver}
										onDragLeave={handleDragLeave}
										onDrop={handleDrop}
									>
										<input
											ref={inputRef}
											type="file"
											multiple
											accept={ACCEPTED_FILE_TYPES.join(',')}
											onChange={(e) =>
												handleFiles(Array.from(e.target.files || []))
											}
											className="hidden"
										/>

										<div className="flex flex-col items-center justify-center text-center">
											<Cloud className="h-10 w-10 text-muted-foreground/50" />
											<div className="mt-4 flex flex-col items-center justify-center text-sm text-muted-foreground">
												<Button
													type="button"
													variant="secondary"
													className="mb-2 mt-2"
													onClick={handleButtonClick}
												>
													Choose Files
												</Button>
												<p className="text-xs text-muted-foreground">
													or drag and drop your files here
												</p>
											</div>
										</div>
									</div>

									{files.length > 0 && (
										<div className="grid gap-2">
											{files.map((file) => (
												<div
													key={file.id}
													className="flex items-center gap-2 rounded-md border bg-muted/30 p-2"
												>
													<File className="h-4 w-4 text-primary/70" />
													<div className="flex-1 grid gap-1">
														<div className="flex justify-between">
															<span className="text-sm font-medium">
																{file.name}
															</span>
															<span className="text-xs text-muted-foreground">
																{file.size}
															</span>
														</div>
														<Progress value={file.progress} className="h-1" />
														{processingStatus[file.id] && (
															<span className="text-xs text-muted-foreground">
																{processingStatus[file.id]}
															</span>
														)}
													</div>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
														onClick={() => removeFile(file.id)}
													>
														<X className="h-4 w-4" />
													</Button>
												</div>
											))}
										</div>
									)}
								</div>
							</FormControl>
							<FormDescription className="text-xs text-muted-foreground">
								Upload up to {MAX_FILES} documents (PDF, PNG, JPEG). Max file
								size: 10MB.
							</FormDescription>
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
};
