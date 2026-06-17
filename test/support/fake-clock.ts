import type { Clock, TimerHandle } from '../../src/core/clock';

interface Scheduled {
  fireAt: number;
  callback: () => void;
}

export class FakeClock implements Clock {
  private time = 0;
  private nextHandle = 1;
  private timers = new Map<TimerHandle, Scheduled>();

  now(): number {
    return this.time;
  }

  setTimeout(callback: () => void, ms: number): TimerHandle {
    const handle = this.nextHandle++;
    this.timers.set(handle, { fireAt: this.time + ms, callback });
    return handle;
  }

  clearTimeout(handle: TimerHandle): void {
    this.timers.delete(handle);
  }

  /** Advance time, firing due timers in order (including ones they schedule). */
  advance(ms: number): void {
    const target = this.time + ms;
    for (;;) {
      let next: [TimerHandle, Scheduled] | null = null;
      for (const entry of this.timers) {
        if (entry[1].fireAt <= target && (next === null || entry[1].fireAt < next[1].fireAt)) {
          next = entry;
        }
      }
      if (next === null) break;
      this.timers.delete(next[0]);
      this.time = next[1].fireAt;
      next[1].callback();
    }
    this.time = target;
  }
}
