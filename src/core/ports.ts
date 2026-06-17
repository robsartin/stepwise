import type { Command } from './command';

// Boundaries between the pure core and the adapters. Adapters implement these;
// the core depends only on the interfaces, never on the SDK.

export interface CommandSource {
  /** Register a handler; returns an unsubscribe function. */
  subscribe(handler: (command: Command) => void): () => void;
}

export type Phase = 'cooking' | 'done';

/** Everything the renderer needs to paint one frame of the glasses HUD. */
export interface StepView {
  recipeTitle: string;
  phase: Phase;
  stepNumber: number;
  stepCount: number;
  text: string;
  timer: { label: string; remainingSec: number } | null;
}

export interface Renderer {
  render(view: StepView): void | Promise<void>;
}
