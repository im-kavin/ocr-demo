import { FileUpload } from '../components/FileUpload';

export default function Home() {
	return (
		<main className="container mx-auto p-8">
			<h1 className="text-3xl font-bold mb-8">Document Upload</h1>
			<FileUpload />
		</main>
	);
}
