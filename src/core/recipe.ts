// Generic procedure model. Framed for cooking, but a Step is just text with an
// optional duration, so repair/assembly guides drop in with no schema change.

export interface Step {
  /** Zero-based position within the recipe. */
  index: number;
  /** What the user does in this step. */
  text: string;
  /** If set, this step has a timer of this many seconds (e.g. "simmer 8:00"). */
  durationSec?: number;
  /** Optional short aside (tip, doneness cue). */
  note?: string;
}

export interface Recipe {
  id: string;
  title: string;
  servings?: number;
  ingredients: string[];
  steps: Step[];
}
