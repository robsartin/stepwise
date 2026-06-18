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

// A spoken command is a short, deliberate utterance ("next", "go back"), not a
// trigger word buried in narration ("continue to simmer until it thickens").
// Verbose recipe text and ambient speech are full of command words, so we only
// act when the whole utterance is command-length.
const MAX_COMMAND_WORDS = 4;

function hasPhrase(text: string, phrase: string): boolean {
  const pattern = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'i');
  return pattern.test(text);
}

export function matchKeyword(text: string): Command | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > MAX_COMMAND_WORDS) {
    return null;
  }
  for (const { command, phrases } of KEYWORDS) {
    if (phrases.some((phrase) => hasPhrase(text, phrase))) {
      return command;
    }
  }
  return null;
}
