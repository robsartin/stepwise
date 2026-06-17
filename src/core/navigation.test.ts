import { describe, it, expect } from 'vitest';
import { NavigationController } from './navigation';
import type { Recipe } from './recipe';

const recipe: Recipe = {
  id: 'r1',
  title: 'Test',
  ingredients: [],
  steps: [
    { index: 0, text: 'one' },
    { index: 1, text: 'two' },
    { index: 2, text: 'three' },
  ],
};

describe('NavigationController', () => {
  it('starts at the first step, cooking', () => {
    const nav = new NavigationController(recipe);
    expect(nav.currentIndex).toBe(0);
    expect(nav.stepCount).toBe(3);
    expect(nav.phase).toBe('cooking');
    expect(nav.currentStep.text).toBe('one');
  });

  it('advances with next', () => {
    const nav = new NavigationController(recipe);
    nav.next();
    expect(nav.currentIndex).toBe(1);
  });

  it('finishes when next is called on the last step', () => {
    const nav = new NavigationController(recipe);
    nav.next();
    nav.next();
    expect(nav.currentIndex).toBe(2);
    nav.next();
    expect(nav.currentIndex).toBe(2);
    expect(nav.phase).toBe('done');
  });

  it('back from done returns to the last step, cooking', () => {
    const nav = new NavigationController(recipe);
    nav.next();
    nav.next();
    nav.next();
    nav.back();
    expect(nav.phase).toBe('cooking');
    expect(nav.currentIndex).toBe(2);
  });

  it('does not go before the first step', () => {
    const nav = new NavigationController(recipe);
    nav.back();
    expect(nav.currentIndex).toBe(0);
  });

  it('throws on an empty recipe', () => {
    expect(() => new NavigationController({ ...recipe, steps: [] })).toThrow();
  });
});
