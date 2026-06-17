import { describe, it, expect } from 'vitest';
import { initialTranscript, applyDeepgramMessage } from './deepgram';

function results(transcript: string, isFinal: boolean, speechFinal = false) {
  return {
    type: 'Results',
    is_final: isFinal,
    speech_final: speechFinal,
    channel: { alternatives: [{ transcript }] },
  };
}

describe('applyDeepgramMessage', () => {
  it('puts an interim result in interimText, leaving finalText empty', () => {
    const next = applyDeepgramMessage(initialTranscript, results('next ste', false));
    expect(next).toEqual({ finalText: '', interimText: 'next ste', finished: false });
  });

  it('moves a final result into finalText and clears the interim', () => {
    const afterInterim = applyDeepgramMessage(initialTranscript, results('next', false));
    const afterFinal = applyDeepgramMessage(afterInterim, results('next', true));
    expect(afterFinal).toEqual({ finalText: 'next', interimText: '', finished: false });
  });

  it('accumulates successive finals separated by spaces', () => {
    let s = applyDeepgramMessage(initialTranscript, results('next', true));
    s = applyDeepgramMessage(s, results('repeat', true));
    expect(s.finalText).toBe('next repeat');
  });

  it('marks finished when speech_final is set on a final result', () => {
    const s = applyDeepgramMessage(initialTranscript, results('done', true, true));
    expect(s.finished).toBe(true);
  });

  it('ignores results with an empty transcript', () => {
    const s = applyDeepgramMessage(initialTranscript, results('', false));
    expect(s).toEqual(initialTranscript);
  });

  it('ignores non-Results messages (e.g. Metadata)', () => {
    const s = applyDeepgramMessage(initialTranscript, { type: 'Metadata', duration: 1.2 });
    expect(s).toEqual(initialTranscript);
  });

  it('ignores malformed messages with no alternatives', () => {
    const s = applyDeepgramMessage(initialTranscript, { type: 'Results', channel: {} });
    expect(s).toEqual(initialTranscript);
  });
});
