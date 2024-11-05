import figlet from "figlet";
import { existsSync, mkdirSync, unlinkSync } from "fs";
import path from "path";

import { bufferToWav, generateNewText, getTranscription } from "./functions";

const tmpPath = path.join(__dirname, "temp");
if (!existsSync(tmpPath)) {
	mkdirSync(tmpPath);
}

const supportedLanguages: any[string] = [
	"en-US",
	"es-ES",
	"fr-FR",
	"de-DE",
	"it-IT",
	"pt-BR",
];

const difficultyLevels: any[string] = ["easy", "medium", "hard"];

const server2 = Bun.serve({
	port: Bun.env.PORT || 3000,
	async fetch(req, server) {
		const success = server.upgrade(req);
		if (success) {
			return undefined;
		}

		const url = new URL(req.url);

		const pathSegments = url.pathname.split("/").filter((segment) => segment);

		let out: any;

		if (pathSegments.length === 3 && pathSegments[0] === "text") {
			if (
				supportedLanguages.includes(pathSegments[1]) &&
				difficultyLevels.includes(pathSegments[2])
			) {
				const text = await generateNewText(pathSegments[1], pathSegments[2]);
				out = {
					text,
					lang: pathSegments[1],
					difficulty: pathSegments[2],
				};
			} else {
				return new Response(
					`Invalid language or difficulty. Available languages: ${supportedLanguages.join(
						", "
					)}. Available difficulties: ${difficultyLevels.join(", ")}.`
				);
			}
		}

		const response = new Response(
			JSON.stringify(out ?? { message: "Invalid path" })
		);
		response.headers.set("Access-Control-Allow-Origin", "*");
		response.headers.set(
			"Access-Control-Allow-Methods",
			"GET, POST, PUT, DELETE, OPTIONS"
		);
		response.headers.set(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization"
		);
		return response;
	},
	websocket: {
		open: (ws) => {
			console.log(`Client connected: ${ws.remoteAddress}`);
		},

		close: (ws) => {
			console.log(`Client disconnected: ${ws.remoteAddress}`);
		},

		async message(ws, message) {
			if (Buffer.isBuffer(message)) {
				try {
					const temporalName = `temp/output-${new Date().getTime()}.wav`;
					bufferToWav(message, temporalName);

					const transcription = await getTranscription(temporalName);

					unlinkSync(temporalName);

					const response = transcription.words?.map((word) => word.word);

					ws.send(JSON.stringify(response));
				} catch (error: any) {
					ws.send(error.message);
				}
			} else {
				ws.send(`Hello!, ${message}`);
			}
		},
	},
});

console.log(figlet.textSync("Speech Pro!"));
console.log(`Listening on ${server2.hostname}:${server2.port}`);
