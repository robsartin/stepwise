import { describe, it, expect } from 'vitest';
import { matchKeyword } from './keywords';

describe('matchKeyword', () => {
  it('maps direct command words', () => {
    expect(matchKeyword('next')).toBe('next');
    expect(matchKeyword('go back please')).toBe('back');
    expect(matchKeyword('repeat that')).toBe('repeat');
    expect(matchKeyword('start the timer')).toBe('startTimer');
    expect(matchKeyword('pause')).toBe('pauseTimer');
    expect(matchKeyword('show ingredients')).toBe('ingredients');
  });

  it('is case-insensitive', () => {
    expect(matchKeyword('NEXT')).toBe('next');
  });

  it('returns null when no keyword is present', () => {
    expect(matchKeyword('the sauce looks great')).toBeNull();
  });

  it('does not match a keyword embedded in another word', () => {
    expect(matchKeyword('the background is noisy')).toBeNull();
  });

  it('ignores a keyword buried in a longer narrated sentence', () => {
    // Verbose recipe text and ambient speech naturally contain command words;
    // only a short, deliberate utterance should drive navigation.
    expect(matchKeyword('continue to simmer the curry until it thickens')).toBeNull();
    expect(matchKeyword('bring the mixture back to a rolling boil')).toBeNull();
    expect(matchKeyword('start by heating the oil in a large pan')).toBeNull();
  });

  it('still matches a single trigger word spoken on its own', () => {
    expect(matchKeyword('continue')).toBe('next');
    expect(matchKeyword('back')).toBe('back');
  });
});
