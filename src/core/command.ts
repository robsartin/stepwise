// The normalized vocabulary every input source (voice, ring, touch) maps to.
// Core logic only ever sees a Command — never a raw gesture or transcript.
export type Command = 'next' | 'back' | 'repeat' | 'startTimer' | 'pauseTimer' | 'ingredients';

// The recipe picker's vocabulary. 'up'/'down' move the highlight; 'select' and
// 'exit' are owned by the shell (which controller is active), so the
// MenuController ignores them.
export type MenuCommand = 'up' | 'down' | 'select' | 'exit';
