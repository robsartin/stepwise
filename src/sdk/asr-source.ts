import type { Command } from '../core/command';
import { matchKeyword } from '../core/keywords';
import { startSttStream, type SttClient } from './stt';

// Wraps the STT stream: every snapshot's newest words are matched to a Command.
// Debounced so one spoken word fires a command once, not on every interim frame.
export class AsrCommandSource {
  private client: SttClient | null = null;
  private lastFired = '';
  private lastFinalText = '';
  private capture: { baseline: number; onDish: (dish: string) => void } | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly onError?: (err: unknown) => void,
  ) {}

  subscribe(handler: (command: Command) => void): () => void {
    this.client = startSttStream(
      this.apiKey,
      (snap) => {
        this.lastFinalText = snap.finalText;

        // Dish-capture mode: take the words spoken since capture began, and
        // commit them once the speaker pauses (the snapshot is finished).
        if (this.capture) {
          const phrase = snap.finalText.slice(this.capture.baseline).trim();
          if (snap.finished && phrase) {
            const { onDish } = this.capture;
            this.capture = null;
            onDish(phrase);
          }
          return;
        }

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

  /** Capture the next spoken utterance as a dish name (one-shot). */
  startDishCapture(onDish: (dish: string) => void): void {
    this.capture = { baseline: this.lastFinalText.length, onDish };
  }

  cancelDishCapture(): void {
    this.capture = null;
  }

  sendPcm(chunk: Uint8Array): void {
    this.client?.sendPcm(chunk);
  }
}
