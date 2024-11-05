// Author: Abel Gallo Ruiz (abelgalloruiz@gmail.com)
// Last Modified: 04/11/2024

// VARIABLES
const BACKEND_URL = "http://localhost:3000";
const WEBSOCKET_URL = "ws://localhost:3000";
const VERSION = "1.0.0";
const LAST_UPDATED = "11/04/2024";

function jsonParse(str) {
	try {
		return JSON.parse(str);
	} catch (e) {
		return null;
	}
}

const createWebSocket = (_this) => {
	_this.socket = new WebSocket(WEBSOCKET_URL);

	_this.socket.onopen = () => {
		console.log("Connected to WebSocket server");
	};

	_this.socket.onmessage = (e) => {
		const tmp = jsonParse(e.data);

		if (Array.isArray(tmp)) {
			_this.markText(tmp);
		}
	};

	_this.socket.onclose = () => {
		// Reconnect after 1 second
		console.log("WebSocket connection closed. Reconnecting...");
		setTimeout(() => {
			createWebSocket(_this);
		}, 1000);
	};

	_this.socket.onerror = (error) => {
		console.error("WebSocket error:", error);
		socket.close();
	};
};

async function setMediaDevices(_this) {
	_this.mediaDevices = [];

	const media = await navigator.mediaDevices.getUserMedia({
		audio: true,
	});
	_this.mediaDevices = await navigator.mediaDevices
		.enumerateDevices()
		.then((devices) =>
			devices.filter((d) => d.kind === "audioinput" && d.deviceId)
		);
	_this.selectedDevice = _this.mediaDevices[0]?.deviceId;
	media.getTracks().forEach((track) => track.stop());
}

function main() {
	return {
		mediaDevices: [],
		selectedDevice: null,

		availableLanguages: [
			{ code: "en-US", label: "English (United States)" },
			{ code: "es-ES", label: "Español (España)" },
			{ code: "fr-FR", label: "Français (France)" },
			{ code: "de-DE", label: "Deutsch (Deutschland)" },
			{ code: "it-IT", label: "Italiano (Italia)" },
			{ code: "pt-BR", label: "Português (Brasil)" },
		],
		selectedLanguage: "en-US",

		availableDifficulties: [
			{ code: "easy", label: "Easy" },
			{ code: "medium", label: "Medium" },
			{ code: "hard", label: "Hard" },
		],
		selectedDifficulty: "easy",

		textToRead: "",

		startedRecording: false,

		timer: "00:00",

		loadingText: false,

		socket: null,

		showModal: false,

		version: VERSION,
		lastUpdated: LAST_UPDATED,

		async init() {
			createWebSocket(this);
			await setMediaDevices(this);
			this.changeTextToRead();
		},

		changeTextToRead() {
			if (this.loadingText) {
				return;
			}

			this.loadingText = true;
			fetch(
				`${BACKEND_URL}/text/${this.selectedLanguage}/${this.selectedDifficulty}`
			)
				.then((res) => res.json())
				.then((data) => {
					this.textToRead = data?.text;
				})
				.finally(() => {
					this.loadingText = false;
				});
		},

		async toggleRecording() {
			this.startedRecording = !this.startedRecording;

			if (this.startedRecording) {
				await this.startRecording();
			} else {
				await this.stopRecording();
			}
		},

		async startRecording() {
			this.updateTimer();

			const constraints = {
				audio: {
					deviceId: { exact: this.selectedDevice },
				},
			};

			this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);

			const socket = this.socket;

			this.recorder = new RecordRTC(this.audioStream, {
				type: "audio",
				mimeType: "audio/wav",
				recorderType: RecordRTC.StereoAudioRecorder,
				timeSlice: 3000,
				// Disable logs for better performance
				disableLogs: true,
				Buffersize: 16384,
				async ondataavailable(blob) {
					const buffer = await blob.arrayBuffer();
					const modifiedBuffer = buffer.slice(44);

					socket.send(modifiedBuffer);
				},
				sampleRate: 48000,
				desiredSampRate: 48000,
				numberOfAudioChannels: 1,
			});
			this.recorder.startRecording();
		},

		async stopRecording() {
			clearInterval(timerInterval);

			this.recorder.stopRecording();
			this.audioStream.getTracks().forEach((track) => track.stop());
		},

		markText(arr) {
			const text = this.textToRead;
			const words = text.split(" ");

			const markedText = words
				.map((word) => {
					if (arr.includes(word.toLowerCase())) {
						return `<span class="word-readed">${word}</span>`;
					}

					return word;
				})
				.join(" ");

			this.textToRead = markedText;
		},

		updateTimer() {
			timerInterval = setInterval(() => {
				const time = this.timer.split(":");

				let minutes = parseInt(time[0]);
				let seconds = parseInt(time[1]);

				if (seconds < 59) {
					seconds++;
				} else {
					seconds = 0;
					minutes++;
				}

				this.timer = `${minutes < 10 ? "0" + minutes : minutes}:${
					seconds < 10 ? "0" + seconds : seconds
				}`;
			}, 1000);
		},
	};
}
