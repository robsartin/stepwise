import type { Command } from './command';

// Order matters: the first matching phrase wins. More specific timer phrases
// come before the bare 'next'/'back' so "start timer" can't be shadowed.
const KEYWORDS: Array<{ command: Command; phrases: string[] }> = [
  { command: 'startTimer', phrases: ['start timer', 'start the timer', 'start'] },
  { command: 'pauseTimer', phrases: ['pause', 'stop timer', 'stop'] },
  { command: 'ingredients', phrases: ['ingredients'] },
  { command: 'repeat', phrases: ['repeat', 'again'] },
  { command: 'back', phrases: ['back', 'previous'] },
  { command: 'next', phrases: ['next', 'forward', 'continue'] },
];

function hasPhrase(text: string, phrase: string): boolean {
  const pattern = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'i');
  return pattern.test(text);
}

export function matchKeyword(text: string): Command | null {
  for (const { command, phrases } of KEYWORDS) {
    if (phrases.some((phrase) => hasPhrase(text, phrase))) {
      return command;
    }
  }
  return null;
}
