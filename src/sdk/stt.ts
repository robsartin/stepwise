// Speech-to-text client for the G2 microphone.
//
// The G2 mic emits PCM s16le @ 16 kHz mono via `bridge.audioControl(true)`.
// Each onEvenHubEvent callback with `audioEvent.audioPcm` delivers a chunk.
//
// Provider: Deepgram streaming. Treat each snapshot as a full transcript
// state, not a delta. The AsrCommandSource adapter consumes snapshots and
// matches keywords ("next", "back", ...) into Commands. The message-parsing
// logic lives in the pure reducer at src/adapters/stt/deepgram.ts (unit
// tested); this file is the thin WebSocket IO edge, verified on-device.

import { initialTranscript, applyDeepgramMessage } from '../adapters/stt/deepgram';

export interface SttSnapshot {
  finalText: string;
  interimText: string;
  finished: boolean;
}

export interface SttClient {
  sendPcm(chunk: Uint8Array): void;
  close(): void;
}

const DEEPGRAM_URL =
  'wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&interim_results=true&punctuate=true&endpointing=300';

export function startSttStream(
  apiKey: string,
  onSnapshot: (snap: SttSnapshot) => void,
  onError?: (err: unknown) => void,
): SttClient {
  if (!apiKey) {
    throw new Error('STT requires an API key (set VITE_STT_API_KEY).');
  }

  let transcript = initialTranscript;
  const pending: Uint8Array[] = [];
  let open = false;

  const ws = new WebSocket(DEEPGRAM_URL, ['token', apiKey]);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    open = true;
    for (const chunk of pending) ws.send(chunk);
    pending.length = 0;
  };

  ws.onmessage = (ev) => {
    try {
      transcript = applyDeepgramMessage(transcript, JSON.parse(ev.data as string));
      onSnapshot(transcript);
    } catch (err) {
      onError?.(err);
    }
  };

  ws.onerror = (ev) => onError?.(ev);

  return {
    sendPcm(chunk) {
      if (open && ws.readyState === WebSocket.OPEN) {
        ws.send(chunk);
      } else {
        pending.push(chunk);
      }
    },
    close() {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'CloseStream' }));
      ws.close();
    },
  };
}
