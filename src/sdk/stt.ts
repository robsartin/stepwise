// Speech-to-text client for the G2 microphone.
//
// The G2 mic emits PCM s16le @ 16 kHz mono via `bridge.audioControl(true)`.
// Each onEvenHubEvent callback with `audioEvent.audioPcm` delivers a chunk.
//
// Bring your own provider (Deepgram, AssemblyAI, etc.). Treat each snapshot as
// a full transcript state, not a delta. The AsrCommandSource adapter consumes
// snapshots and matches keywords ("next", "back", ...) into Commands.

export interface SttSnapshot {
  finalText: string;
  interimText: string;
  finished: boolean;
}

export interface SttClient {
  sendPcm(chunk: Uint8Array): void;
  close(): void;
}

export function startSttStream(
  _apiKey: string,
  _onSnapshot: (snap: SttSnapshot) => void,
  _onError?: (err: unknown) => void,
): SttClient {
  throw new Error(
    'STT provider not implemented — open src/sdk/stt.ts and wire up your chosen STT service.',
  );
}
