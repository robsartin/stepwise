import { describe, it, expect } from 'vitest';
import { StepWiseSession } from './session';
import { FakeClock } from '../../test/support/fake-clock';
import type { Recipe } from './recipe';
import type { StepView } from './ports';

const recipe: Recipe = {
  id: 'r1',
  title: 'Test',
  ingredients: [],
  steps: [
    { index: 0, text: 'one' },
    { index: 1, text: 'simmer', durationSec: 3, note: 'Simmer' },
  ],
};

function setup() {
  const clock = new FakeClock();
  const views: StepView[] = [];
  const session = new StepWiseSession(recipe, clock, (v) => views.push(v));
  session.start();
  return { clock, views, session, last: () => views[views.length - 1] };
}

describe('StepWiseSession', () => {
  it('emits the first step on start, with no timer', () => {
    const { last } = setup();
    expect(last()).toMatchObject({
      recipeTitle: 'Test',
      phase: 'cooking',
      stepNumber: 1,
      stepCount: 2,
      text: 'one',
      timer: null,
    });
  });

  it('auto-starts a timer when entering a timed step', () => {
    const { session, last } = setup();
    session.handle('next');
    expect(last()).toMatchObject({
      stepNumber: 2,
      text: 'simmer',
      timer: { label: 'Simmer', remainingSec: 3 },
    });
  });

  it('counts the timer down and shows a DONE alert at zero', () => {
    const { session, clock, last } = setup();
    session.handle('next');
    clock.advance(1000);
    expect(last().timer).toEqual({ label: 'Simmer', remainingSec: 2 });
    clock.advance(2000);
    expect(last().timer).toEqual({ label: 'DONE', remainingSec: 0 });
  });

  it('cancels the timer and clears it when moving back', () => {
    const { session, last } = setup();
    session.handle('next');
    session.handle('back');
    expect(last()).toMatchObject({ stepNumber: 1, text: 'one', timer: null });
  });

  it('reaches the done phase after the last step', () => {
    const { session, last } = setup();
    session.handle('next');
    session.handle('next');
    expect(last().phase).toBe('done');
  });

  it('repeat re-emits the current step view without advancing', () => {
    const { session, views, last } = setup();
    const before = views.length;
    session.handle('repeat');
    expect(views.length).toBe(before + 1);
    expect(last()).toMatchObject({ stepNumber: 1, text: 'one', timer: null });
  });

  it('startTimer on an untimed step emits a view with no timer', () => {
    const { session, last } = setup();
    session.handle('startTimer');
    expect(last().timer).toBeNull();
  });

  it('pauseTimer halts the countdown so time stops elapsing', () => {
    const { session, clock, last } = setup();
    session.handle('next'); // enter the timed step; timer auto-starts at 3
    session.handle('pauseTimer');
    clock.advance(2000);
    expect(last().timer).toEqual({ label: 'Simmer', remainingSec: 3 });
  });

  it('ingredients is a no-op and emits nothing', () => {
    const { session, views } = setup();
    const before = views.length;
    session.handle('ingredients');
    expect(views.length).toBe(before);
  });

  it('stop() halts the timer so no further views are emitted', () => {
    const { session, clock, views } = setup();
    session.handle('next'); // enter the timed step; timer is running
    const before = views.length;
    session.stop();
    clock.advance(5000);
    expect(views.length).toBe(before);
  });
});
