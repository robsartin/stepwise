import type { Clock, TimerHandle } from './clock';

export class TimerEngine {
  private remaining = 0;
  private running = false;
  private handle: TimerHandle | null = null;

  constructor(
    private readonly clock: Clock,
    private readonly onTick: (remainingSec: number) => void,
    private readonly onComplete: () => void,
  ) {}

  get remainingSec(): number {
    return this.remaining;
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(durationSec: number): void {
    this.cancel();
    this.remaining = Math.max(0, Math.floor(durationSec));
    this.running = true;
    this.scheduleTick();
  }

  pause(): void {
    this.running = false;
    this.cancel();
  }

  resume(): void {
    if (!this.running && this.remaining > 0) {
      this.running = true;
      this.scheduleTick();
    }
  }

  private scheduleTick(): void {
    this.handle = this.clock.setTimeout(() => this.tick(), 1000);
  }

  private cancel(): void {
    if (this.handle !== null) {
      this.clock.clearTimeout(this.handle);
      this.handle = null;
    }
  }

  private tick(): void {
    if (!this.running) return;
    this.remaining -= 1;
    if (this.remaining <= 0) {
      this.remaining = 0;
      this.running = false;
      this.onComplete();
      return;
    }
    this.onTick(this.remaining);
    this.scheduleTick();
  }
}
