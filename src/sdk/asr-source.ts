import type { Command } from '../core/command';
import { matchKeyword } from '../core/keywords';
import { startSttStream, type SttClient } from './stt';

// Wraps the STT stream and turns finalized utterances into Commands. Matching
// runs only when the speaker pauses (a finished snapshot), on just the words
// said since the last pause — never on the volatile interim hypothesis or the
// whole rolling transcript. That, plus matchKeyword's command-length gate, is
// what stops verbose recipe narration from auto-advancing steps.
export class AsrCommandSource {
  private client: SttClient | null = null;
  private committedLen = 0;
  private capture: { onDish: (dish: string) => void } | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly onError?: (err: unknown) => void,
  ) {}

  subscribe(handler: (command: Command) => void): () => void {
    this.client = startSttStream(
      this.apiKey,
      (snap) => {
        if (!snap.finished) return;

        // The newest utterance: everything finalized since the last pause.
        const utterance = snap.finalText.slice(this.committedLen).trim();
        this.committedLen = snap.finalText.length;

        if (this.capture) {
          if (utterance) {
            const { onDish } = this.capture;
            this.capture = null;
            onDish(utterance);
          }
          return;
        }

        const command = matchKeyword(utterance);
        if (command) handler(command);
      },
      this.onError,
    );
    return () => this.client?.close();
  }

  /** Capture the next spoken utterance as a dish name (one-shot). */
  startDishCapture(onDish: (dish: string) => void): void {
    this.capture = { onDish };
  }

  cancelDishCapture(): void {
    this.capture = null;
  }

  sendPcm(chunk: Uint8Array): void {
    this.client?.sendPcm(chunk);
  }
}
