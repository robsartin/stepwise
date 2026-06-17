import type { Command } from '../core/command';
import { matchKeyword } from '../core/keywords';
import { startSttStream, type SttClient } from './stt';

// Wraps the STT stream: every snapshot's newest words are matched to a Command.
// Debounced so one spoken word fires a command once, not on every interim frame.
export class AsrCommandSource {
  private client: SttClient | null = null;
  private lastFired = '';

  constructor(
    private readonly apiKey: string,
    private readonly onError?: (err: unknown) => void,
  ) {}

  subscribe(handler: (command: Command) => void): () => void {
    this.client = startSttStream(
      this.apiKey,
      (snap) => {
        const tail = (snap.finalText + ' ' + snap.interimText).trim().slice(-40);
        const command = matchKeyword(tail);
        if (command && tail !== this.lastFired) {
          this.lastFired = tail;
          handler(command);
        }
        if (snap.finished) this.lastFired = '';
      },
      this.onError,
    );
    return () => this.client?.close();
  }

  sendPcm(chunk: Uint8Array): void {
    this.client?.sendPcm(chunk);
  }
}
