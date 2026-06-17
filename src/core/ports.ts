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

/** One row in the recipe picker. */
export interface MenuItem {
  label: string;
  selected: boolean;
}

/** Everything the renderer needs to paint the recipe picker. */
export interface MenuView {
  title: string;
  items: MenuItem[];
  hint: string;
}

export interface Renderer {
  render(view: StepView): void | Promise<void>;
}
