// Time is injected so TimerEngine is deterministic under test. The real impl
// wraps Date.now / setTimeout; tests pass a fake that advances on demand.

export type TimerHandle = number;

export interface Clock {
  now(): number;
  setTimeout(callback: () => void, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}
