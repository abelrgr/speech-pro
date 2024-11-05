import { createWriteStream, createReadStream } from "fs";
import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: Bun.env.OPEN_AI_KEY,
});

export async function generateNewText(lang: string, difficult: string) {
	const prompt = `Provide a ${
		Bun.env.WORDS_TO_GENERATE ?? 30
	}-word text in "${lang}" that is "${difficult}" to read, randomly selected each time, from a pool of 200 different books spanning genres like adventure, action, mystery, love, and fiction. The books can be from any era. Only return the text without any extra information or context`;

	const request = await openai.chat.completions.create({
		model: "gpt-4o-mini",
		messages: [
			{
				role: "system",
				content: "You are a teacher who loves to teach new books to read.",
			},
			{
				role: "user",
				content: prompt,
			},
		],
	});

	return request.choices?.[0]?.message?.content;
}

export function bufferToWav(buffer: Buffer, outputPath: string): void {
	const header = Buffer.alloc(44);
	const sampleRate = 48000; // Sample rate
	const numChannels = 1; // Number of audio channels
	const bitsPerSample = 16; // Bits per sample
	const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
	const blockAlign = numChannels * (bitsPerSample / 8);

	// Write WAV header
	header.write("RIFF", 0);
	header.writeUInt32LE(buffer.length + 36, 4); // File size
	header.write("WAVE", 8);
	header.write("fmt ", 12);
	header.writeUInt32LE(16, 16); // Subchunk1Size for PCM
	header.writeUInt16LE(1, 20); // AudioFormat (PCM)
	header.writeUInt16LE(numChannels, 22); // NumChannels
	header.writeUInt32LE(sampleRate, 24); // SampleRate
	header.writeUInt32LE(byteRate, 28); // ByteRate
	header.writeUInt16LE(blockAlign, 32); // BlockAlign
	header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
	header.write("data", 36);
	header.writeUInt32LE(buffer.length, 40); // DataSize

	// Create a writable stream for the output file
	const outputStream = createWriteStream(outputPath);
	outputStream.write(header); // Write the header
	outputStream.write(buffer); // Write the audio data
	outputStream.end(); // Finish writing the file
}

export async function getTranscription(path: string) {
	return await openai.audio.transcriptions.create({
		file: createReadStream(path),
		model: "whisper-1",
		response_format: "verbose_json",
		timestamp_granularities: ["word"],
	});
}
