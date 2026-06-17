import { describe, it, expect, vi } from 'vitest';
import { TimerEngine } from './timer';
import { FakeClock } from '../../test/support/fake-clock';

describe('TimerEngine', () => {
  it('ticks down once per second and reports remaining time', () => {
    const clock = new FakeClock();
    const onTick = vi.fn();
    const onComplete = vi.fn();
    const timer = new TimerEngine(clock, onTick, onComplete);

    timer.start(3);
    expect(timer.remainingSec).toBe(3);

    clock.advance(1000);
    expect(onTick).toHaveBeenLastCalledWith(2);
    expect(timer.remainingSec).toBe(2);
  });

  it('fires onComplete when it reaches zero and stops running', () => {
    const clock = new FakeClock();
    const onComplete = vi.fn();
    const timer = new TimerEngine(clock, vi.fn(), onComplete);

    timer.start(2);
    clock.advance(2000);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(timer.remainingSec).toBe(0);
    expect(timer.isRunning).toBe(false);
  });

  it('pause stops ticking; resume continues', () => {
    const clock = new FakeClock();
    const onTick = vi.fn();
    const timer = new TimerEngine(clock, onTick, vi.fn());

    timer.start(5);
    clock.advance(1000); // -> 4
    timer.pause();
    clock.advance(5000); // no ticks while paused
    expect(timer.remainingSec).toBe(4);

    timer.resume();
    clock.advance(1000); // -> 3
    expect(timer.remainingSec).toBe(3);
  });
});
