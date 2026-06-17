// The normalized vocabulary every input source (voice, ring, touch) maps to.
// Core logic only ever sees a Command — never a raw gesture or transcript.
export type Command = 'next' | 'back' | 'repeat' | 'startTimer' | 'pauseTimer' | 'ingredients';
