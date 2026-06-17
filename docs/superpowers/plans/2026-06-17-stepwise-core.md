# StepWise Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, test-driven core of StepWise — recipe validation, step navigation, voice-keyword matching, per-step countdown timers — and wire it through the Even Hub SDK so a bundled recipe can be cooked hands-free in the simulator.

**Architecture:** Dependencies point inward. `src/core/` is pure TypeScript (no SDK/DOM/IO), fully unit-tested with an injected `Clock`. `src/adapters/` holds content sources behind core interfaces. `src/sdk/` is thin Even Hub glue (excluded from coverage, verified in the simulator). `src/main.ts` is the composition root.

**Tech Stack:** TypeScript, Vite, `@evenrealities/even_hub_sdk`, `@evenrealities/pretext`, zod, Vitest.

**Workflow:** Pure TDD (red → green → refactor → commit). All work happens on branch `feat/stepwise-core`; a single PR squash-merges to `main`. Run a single test file with `npx vitest run <path>`.

**Type contracts (defined once, reused everywhere):**

- `Step { index: number; text: string; durationSec?: number; note?: string }` — `src/core/recipe.ts` (exists)
- `Recipe { id; title; servings?; ingredients: string[]; steps: Step[] }` — `src/core/recipe.ts` (exists)
- `Command = 'next' | 'back' | 'repeat' | 'startTimer' | 'pauseTimer' | 'ingredients'` — `src/core/command.ts` (exists)
- `Clock { now(): number; setTimeout(cb, ms): TimerHandle; clearTimeout(handle): void }` — `src/core/clock.ts` (exists)
- `Phase = 'cooking' | 'done'` — `src/core/ports.ts` (Task 4 narrows this from the scaffold's placeholder)
- `StepView { recipeTitle; phase: Phase; stepNumber; stepCount; text; timer: { label: string; remainingSec: number } | null }` — `src/core/ports.ts` (exists)

---

## File structure

| File                               | Responsibility                                               | Layer / coverage                       |
| ---------------------------------- | ------------------------------------------------------------ | -------------------------------------- |
| `src/core/recipe-schema.ts`        | zod schema + `parseRecipe(unknown): Recipe`                  | core (covered)                         |
| `src/core/format.ts`               | `formatDuration(sec): "m:ss"`                                | core (covered)                         |
| `src/core/keywords.ts`             | `matchKeyword(text): Command \| null`                        | core (covered)                         |
| `src/core/navigation.ts`           | `NavigationController`                                       | core (covered)                         |
| `src/core/timer.ts`                | `TimerEngine` (injected `Clock`)                             | core (covered)                         |
| `src/core/session.ts`              | `StepWiseSession` — orchestrates nav+timer, emits `StepView` | core (covered)                         |
| `src/adapters/content/bundled.ts`  | `loadBundledRecipes(): Recipe[]`                             | adapters (covered)                     |
| `src/adapters/content/generate.ts` | `generateRecipe(dishName, client): Promise<Recipe>`          | adapters (covered)                     |
| `src/sdk/events.ts`                | `eventToCommand(event): Command \| null`                     | sdk (tested, excluded from thresholds) |
| `src/sdk/renderer.ts`              | `SdkRenderer` paints `StepView` via the bridge               | sdk (manual)                           |
| `src/sdk/asr-source.ts`            | `AsrCommandSource` — STT snapshots → `Command`               | sdk (manual)                           |
| `src/main.ts`                      | composition root (rewrite of scaffold)                       | shell (manual)                         |
| `test/support/fake-clock.ts`       | `FakeClock` test double                                      | test support                           |

---

## Task 1: Recipe schema validation

**Files:**

- Create: `src/core/recipe-schema.ts`
- Test: `src/core/recipe-schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/recipe-schema.test.ts
import { describe, it, expect } from 'vitest';
import { parseRecipe } from './recipe-schema';

const valid = {
  id: 'r1',
  title: 'Test',
  ingredients: ['water'],
  steps: [
    { index: 0, text: 'Boil water', durationSec: 60 },
    { index: 1, text: 'Serve' },
  ],
};

describe('parseRecipe', () => {
  it('accepts a valid recipe', () => {
    expect(parseRecipe(valid)).toEqual(valid);
  });

  it('rejects a recipe with no steps', () => {
    expect(() => parseRecipe({ ...valid, steps: [] })).toThrow();
  });

  it('rejects a missing title', () => {
    const { title: _title, ...noTitle } = valid;
    expect(() => parseRecipe(noTitle)).toThrow();
  });

  it('rejects out-of-order step indices', () => {
    const bad = { ...valid, steps: [{ index: 5, text: 'x' }] };
    expect(() => parseRecipe(bad)).toThrow();
  });

  it('rejects a non-positive durationSec', () => {
    const bad = { ...valid, steps: [{ index: 0, text: 'x', durationSec: 0 }] };
    expect(() => parseRecipe(bad)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/recipe-schema.test.ts`
Expected: FAIL — cannot find module `./recipe-schema`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/recipe-schema.ts
import { z } from 'zod';
import type { Recipe } from './recipe';

const stepSchema = z.object({
  index: z.number().int().nonnegative(),
  text: z.string().min(1),
  durationSec: z.number().int().positive().optional(),
  note: z.string().min(1).optional(),
});

export const recipeSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    servings: z.number().int().positive().optional(),
    ingredients: z.array(z.string().min(1)),
    steps: z.array(stepSchema).min(1),
  })
  .superRefine((recipe, ctx) => {
    recipe.steps.forEach((step, i) => {
      if (step.index !== i) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `step at position ${i} has index ${step.index}`,
          path: ['steps', i, 'index'],
        });
      }
    });
  });

export function parseRecipe(data: unknown): Recipe {
  return recipeSchema.parse(data) as Recipe;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/recipe-schema.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/recipe-schema.ts src/core/recipe-schema.test.ts
git commit -m "feat: validate recipes with a zod schema"
```

---

## Task 2: Duration formatting

**Files:**

- Create: `src/core/format.ts`
- Test: `src/core/format.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatDuration } from './format';

describe('formatDuration', () => {
  it('formats minutes and seconds with a zero-padded seconds field', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(7)).toBe('0:07');
    expect(formatDuration(75)).toBe('1:15');
    expect(formatDuration(600)).toBe('10:00');
  });

  it('clamps negative input to zero', () => {
    expect(formatDuration(-5)).toBe('0:00');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/format.test.ts`
Expected: FAIL — cannot find module `./format`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/format.ts
export function formatDuration(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/format.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/format.ts src/core/format.test.ts
git commit -m "feat: add m:ss duration formatting"
```

---

## Task 3: Keyword matching

**Files:**

- Create: `src/core/keywords.ts`
- Test: `src/core/keywords.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/keywords.test.ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/keywords.test.ts`
Expected: FAIL — cannot find module `./keywords`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/keywords.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/keywords.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/keywords.ts src/core/keywords.test.ts
git commit -m "feat: match spoken keywords to commands"
```

---

## Task 4: NavigationController

**Files:**

- Modify: `src/core/ports.ts` (narrow `Phase` to `'cooking' | 'done'`)
- Create: `src/core/navigation.ts`
- Test: `src/core/navigation.test.ts`

- [ ] **Step 1: Narrow the Phase type**

In `src/core/ports.ts`, change:

```ts
export type Phase = 'browsing' | 'cooking' | 'done';
```

to:

```ts
export type Phase = 'cooking' | 'done';
```

- [ ] **Step 2: Write the failing test**

```ts
// src/core/navigation.test.ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/core/navigation.test.ts`
Expected: FAIL — cannot find module `./navigation`.

- [ ] **Step 4: Write minimal implementation**

```ts
// src/core/navigation.ts
import type { Recipe, Step } from './recipe';
import type { Phase } from './ports';

export class NavigationController {
  private index = 0;
  private finished = false;

  constructor(private readonly recipe: Recipe) {
    if (recipe.steps.length === 0) {
      throw new Error('recipe has no steps');
    }
  }

  get stepCount(): number {
    return this.recipe.steps.length;
  }

  get currentIndex(): number {
    return this.index;
  }

  get currentStep(): Step {
    return this.recipe.steps[this.index];
  }

  get phase(): Phase {
    return this.finished ? 'done' : 'cooking';
  }

  next(): void {
    if (this.index < this.stepCount - 1) {
      this.index += 1;
    } else {
      this.finished = true;
    }
  }

  back(): void {
    if (this.finished) {
      this.finished = false;
      return;
    }
    if (this.index > 0) {
      this.index -= 1;
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/core/navigation.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/core/ports.ts src/core/navigation.ts src/core/navigation.test.ts
git commit -m "feat: step navigation with cooking/done phases"
```

---

## Task 5: TimerEngine

**Files:**

- Create: `test/support/fake-clock.ts`
- Create: `src/core/timer.ts`
- Test: `src/core/timer.test.ts`

- [ ] **Step 1: Write the FakeClock test double**

```ts
// test/support/fake-clock.ts
import type { Clock, TimerHandle } from '../../src/core/clock';

interface Scheduled {
  fireAt: number;
  callback: () => void;
}

export class FakeClock implements Clock {
  private time = 0;
  private nextHandle = 1;
  private timers = new Map<TimerHandle, Scheduled>();

  now(): number {
    return this.time;
  }

  setTimeout(callback: () => void, ms: number): TimerHandle {
    const handle = this.nextHandle++;
    this.timers.set(handle, { fireAt: this.time + ms, callback });
    return handle;
  }

  clearTimeout(handle: TimerHandle): void {
    this.timers.delete(handle);
  }

  /** Advance time, firing due timers in order (including ones they schedule). */
  advance(ms: number): void {
    const target = this.time + ms;
    for (;;) {
      let next: [TimerHandle, Scheduled] | null = null;
      for (const entry of this.timers) {
        if (entry[1].fireAt <= target && (next === null || entry[1].fireAt < next[1].fireAt)) {
          next = entry;
        }
      }
      if (next === null) break;
      this.timers.delete(next[0]);
      this.time = next[1].fireAt;
      next[1].callback();
    }
    this.time = target;
  }
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/core/timer.test.ts
import { describe, it, expect, vi } from 'vitest';
import { TimerEngine } from './timer';
import { FakeClock } from '../../test/support/fake-clock';

describe('TimerEngine', () => {
  it('ticks down once per second and reports remaining time', () => {
    const clock = new FakeClock();
    const onTick = vi.fn();
    const onComplete = vi.fn();
    const timer = new TimerEngine(clock, onTick, onComplete);

    timer.start(3);
    expect(timer.remainingSec).toBe(3);

    clock.advance(1000);
    expect(onTick).toHaveBeenLastCalledWith(2);
    expect(timer.remainingSec).toBe(2);
  });

  it('fires onComplete when it reaches zero and stops running', () => {
    const clock = new FakeClock();
    const onComplete = vi.fn();
    const timer = new TimerEngine(clock, vi.fn(), onComplete);

    timer.start(2);
    clock.advance(2000);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(timer.remainingSec).toBe(0);
    expect(timer.isRunning).toBe(false);
  });

  it('pause stops ticking; resume continues', () => {
    const clock = new FakeClock();
    const onTick = vi.fn();
    const timer = new TimerEngine(clock, onTick, vi.fn());

    timer.start(5);
    clock.advance(1000); // -> 4
    timer.pause();
    clock.advance(5000); // no ticks while paused
    expect(timer.remainingSec).toBe(4);

    timer.resume();
    clock.advance(1000); // -> 3
    expect(timer.remainingSec).toBe(3);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/core/timer.test.ts`
Expected: FAIL — cannot find module `./timer`.

- [ ] **Step 4: Write minimal implementation**

```ts
// src/core/timer.ts
import type { Clock, TimerHandle } from './clock';

export class TimerEngine {
  private remaining = 0;
  private running = false;
  private handle: TimerHandle | null = null;

  constructor(
    private readonly clock: Clock,
    private readonly onTick: (remainingSec: number) => void,
    private readonly onComplete: () => void,
  ) {}

  get remainingSec(): number {
    return this.remaining;
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(durationSec: number): void {
    this.cancel();
    this.remaining = Math.max(0, Math.floor(durationSec));
    this.running = true;
    this.scheduleTick();
  }

  pause(): void {
    this.running = false;
    this.cancel();
  }

  resume(): void {
    if (!this.running && this.remaining > 0) {
      this.running = true;
      this.scheduleTick();
    }
  }

  private scheduleTick(): void {
    this.handle = this.clock.setTimeout(() => this.tick(), 1000);
  }

  private cancel(): void {
    if (this.handle !== null) {
      this.clock.clearTimeout(this.handle);
      this.handle = null;
    }
  }

  private tick(): void {
    if (!this.running) return;
    this.remaining -= 1;
    if (this.remaining <= 0) {
      this.remaining = 0;
      this.running = false;
      this.onComplete();
      return;
    }
    this.onTick(this.remaining);
    this.scheduleTick();
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/core/timer.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add test/support/fake-clock.ts src/core/timer.ts src/core/timer.test.ts
git commit -m "feat: per-step countdown timer with injected clock"
```

---

## Task 6: StepWiseSession (core orchestration)

**Files:**

- Create: `src/core/session.ts`
- Test: `src/core/session.test.ts`

This is the integration point of the core: it owns a `NavigationController` and a `TimerEngine`, applies `Command`s, and emits a fresh `StepView` on every state change. A step with `durationSec` auto-starts its timer on entry. `next`/`back` cancel any running timer.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/session.test.ts
import { describe, it, expect } from 'vitest';
import { StepWiseSession } from './session';
import { FakeClock } from '../../test/support/fake-clock';
import type { Recipe } from './recipe';
import type { StepView } from './ports';

const recipe: Recipe = {
  id: 'r1',
  title: 'Test',
  ingredients: [],
  steps: [
    { index: 0, text: 'one' },
    { index: 1, text: 'simmer', durationSec: 3, note: 'Simmer' },
  ],
};

function setup() {
  const clock = new FakeClock();
  const views: StepView[] = [];
  const session = new StepWiseSession(recipe, clock, (v) => views.push(v));
  session.start();
  return { clock, views, session, last: () => views[views.length - 1] };
}

describe('StepWiseSession', () => {
  it('emits the first step on start, with no timer', () => {
    const { last } = setup();
    expect(last()).toMatchObject({
      recipeTitle: 'Test',
      phase: 'cooking',
      stepNumber: 1,
      stepCount: 2,
      text: 'one',
      timer: null,
    });
  });

  it('auto-starts a timer when entering a timed step', () => {
    const { session, last } = setup();
    session.handle('next');
    expect(last()).toMatchObject({
      stepNumber: 2,
      text: 'simmer',
      timer: { label: 'Simmer', remainingSec: 3 },
    });
  });

  it('counts the timer down and shows a DONE alert at zero', () => {
    const { session, clock, last } = setup();
    session.handle('next');
    clock.advance(1000);
    expect(last().timer).toEqual({ label: 'Simmer', remainingSec: 2 });
    clock.advance(2000);
    expect(last().timer).toEqual({ label: 'DONE', remainingSec: 0 });
  });

  it('cancels the timer and clears it when moving back', () => {
    const { session, last } = setup();
    session.handle('next');
    session.handle('back');
    expect(last()).toMatchObject({ stepNumber: 1, text: 'one', timer: null });
  });

  it('reaches the done phase after the last step', () => {
    const { session, last } = setup();
    session.handle('next');
    session.handle('next');
    expect(last().phase).toBe('done');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/session.test.ts`
Expected: FAIL — cannot find module `./session`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/session.ts
import type { Recipe } from './recipe';
import type { Command } from './command';
import type { Clock } from './clock';
import type { StepView } from './ports';
import { NavigationController } from './navigation';
import { TimerEngine } from './timer';

export class StepWiseSession {
  private readonly nav: NavigationController;
  private readonly timer: TimerEngine;
  private remaining: number | null = null;
  private alert = false;

  constructor(
    private readonly recipe: Recipe,
    clock: Clock,
    private readonly emit: (view: StepView) => void,
  ) {
    this.nav = new NavigationController(recipe);
    this.timer = new TimerEngine(
      clock,
      (remaining) => {
        this.remaining = remaining;
        this.render();
      },
      () => {
        this.remaining = 0;
        this.alert = true;
        this.render();
      },
    );
  }

  start(): void {
    this.enterStep();
  }

  handle(command: Command): void {
    switch (command) {
      case 'next':
        this.clearTimer();
        this.nav.next();
        this.enterStep();
        return;
      case 'back':
        this.clearTimer();
        this.nav.back();
        this.enterStep();
        return;
      case 'repeat':
        this.render();
        return;
      case 'startTimer':
        this.startStepTimer();
        return;
      case 'pauseTimer':
        this.timer.pause();
        this.render();
        return;
      case 'ingredients':
        // Deferred (YAGNI): ingredient overview screen. No-op for MVP.
        return;
    }
  }

  private enterStep(): void {
    this.clearTimer();
    this.startStepTimer();
    this.render();
  }

  private startStepTimer(): void {
    const step = this.nav.currentStep;
    if (step.durationSec !== undefined && this.nav.phase === 'cooking') {
      this.alert = false;
      this.remaining = step.durationSec;
      this.timer.start(step.durationSec);
    }
  }

  private clearTimer(): void {
    this.timer.pause();
    this.remaining = null;
    this.alert = false;
  }

  private render(): void {
    this.emit(this.buildView());
  }

  private buildView(): StepView {
    const step = this.nav.currentStep;
    const timer =
      this.remaining !== null
        ? { label: this.alert ? 'DONE' : (step.note ?? 'Timer'), remainingSec: this.remaining }
        : null;
    return {
      recipeTitle: this.recipe.title,
      phase: this.nav.phase,
      stepNumber: this.nav.currentIndex + 1,
      stepCount: this.nav.stepCount,
      text: step.text,
      timer,
    };
  }
}
```

> Note: `enterStep` calls `startStepTimer` which sets `remaining` _before_ `timer.start`, so the auto-start view shows the full duration. `clearTimer` runs first to reset state from the prior step.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/session.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/session.ts src/core/session.test.ts
git commit -m "feat: orchestrate navigation and timers into StepView"
```

---

## Task 7: Bundled recipe loader

**Files:**

- Create: `src/adapters/content/bundled.ts`
- Test: `src/adapters/content/bundled.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/adapters/content/bundled.test.ts
import { describe, it, expect } from 'vitest';
import { loadBundledRecipes } from './bundled';

describe('loadBundledRecipes', () => {
  it('returns at least one valid recipe', () => {
    const recipes = loadBundledRecipes();
    expect(recipes.length).toBeGreaterThan(0);
  });

  it('returns recipes that pass schema validation (sequential indices, non-empty steps)', () => {
    for (const recipe of loadBundledRecipes()) {
      expect(recipe.steps.length).toBeGreaterThan(0);
      recipe.steps.forEach((step, i) => expect(step.index).toBe(i));
    }
  });

  it('includes the carbonara recipe', () => {
    expect(loadBundledRecipes().some((r) => r.id === 'carbonara')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/adapters/content/bundled.test.ts`
Expected: FAIL — cannot find module `./bundled`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/adapters/content/bundled.ts
import type { Recipe } from '../../core/recipe';
import { parseRecipe } from '../../core/recipe-schema';
import carbonara from '../../content/recipes/carbonara.json';

const RAW: unknown[] = [carbonara];

export function loadBundledRecipes(): Recipe[] {
  return RAW.map(parseRecipe);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/adapters/content/bundled.test.ts`
Expected: PASS (3 tests). If validation throws, the bundled JSON is malformed — fix the data, not the test.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/content/bundled.ts src/adapters/content/bundled.test.ts
git commit -m "feat: load and validate bundled recipes"
```

---

## Task 8: AI recipe generation

**Files:**

- Create: `src/adapters/content/generate.ts`
- Test: `src/adapters/content/generate.test.ts`

The LLM call is injected as a `RecipeGenerator` function so unit tests never hit the network. `generateRecipe` builds the prompt, calls the generator, strips any markdown fences, parses JSON, and validates with `parseRecipe`. A separate gated test exercises the real Anthropic API.

- [ ] **Step 1: Write the failing test**

````ts
// src/adapters/content/generate.test.ts
import { describe, it, expect, vi } from 'vitest';
import { generateRecipe } from './generate';

const validJson = JSON.stringify({
  id: 'omelette',
  title: 'Omelette',
  ingredients: ['2 eggs', 'butter'],
  steps: [
    { index: 0, text: 'Beat the eggs.' },
    { index: 1, text: 'Cook in butter.', durationSec: 120 },
  ],
});

describe('generateRecipe', () => {
  it('calls the generator with the dish name and returns a validated recipe', async () => {
    const generator = vi.fn().mockResolvedValue(validJson);
    const recipe = await generateRecipe('omelette', generator);
    expect(generator).toHaveBeenCalledWith(expect.stringContaining('omelette'));
    expect(recipe.title).toBe('Omelette');
    expect(recipe.steps).toHaveLength(2);
  });

  it('strips markdown code fences before parsing', async () => {
    const generator = vi.fn().mockResolvedValue('```json\n' + validJson + '\n```');
    const recipe = await generateRecipe('omelette', generator);
    expect(recipe.id).toBe('omelette');
  });

  it('throws when the model returns invalid JSON', async () => {
    const generator = vi.fn().mockResolvedValue('not json');
    await expect(generateRecipe('omelette', generator)).rejects.toThrow();
  });

  it('throws when the model returns a schema-invalid recipe', async () => {
    const generator = vi.fn().mockResolvedValue(JSON.stringify({ id: 'x', title: 'x' }));
    await expect(generateRecipe('omelette', generator)).rejects.toThrow();
  });
});
````

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/adapters/content/generate.test.ts`
Expected: FAIL — cannot find module `./generate`.

- [ ] **Step 3: Write minimal implementation**

````ts
// src/adapters/content/generate.ts
import type { Recipe } from '../../core/recipe';
import { parseRecipe } from '../../core/recipe-schema';

export type RecipeGenerator = (prompt: string) => Promise<string>;

function buildPrompt(dishName: string): string {
  return [
    `Create a cooking recipe for "${dishName}".`,
    'Respond with ONLY a JSON object, no prose, matching this shape:',
    '{ "id": string, "title": string, "servings"?: number, "ingredients": string[],',
    '  "steps": [{ "index": number, "text": string, "durationSec"?: number, "note"?: string }] }',
    'Steps must be ordered with index starting at 0 and incrementing by 1.',
    'Set durationSec (in seconds) only on steps that involve waiting (boil, simmer, bake).',
  ].join('\n');
}

function stripFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

export async function generateRecipe(
  dishName: string,
  generator: RecipeGenerator,
): Promise<Recipe> {
  const raw = await generator(buildPrompt(dishName));
  const parsed = JSON.parse(stripFences(raw));
  return parseRecipe(parsed);
}
````

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/adapters/content/generate.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add the gated live-API test**

```ts
// src/adapters/content/generate.live.test.ts
import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { generateRecipe } from './generate';

const run = process.env.RUN_LIVE_API === '1';

describe.runIf(run)('generateRecipe (live Anthropic)', () => {
  it('generates a real recipe from a dish name', async () => {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const recipe = await generateRecipe('grilled cheese sandwich', async (prompt) => {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      const block = msg.content[0];
      return block.type === 'text' ? block.text : '';
    });
    expect(recipe.steps.length).toBeGreaterThan(1);
  }, 30_000);
});
```

- [ ] **Step 6: Add the Anthropic SDK dependency**

Run: `npm install @anthropic-ai/sdk@^0.30.0`

- [ ] **Step 7: Verify**

Run: `npx vitest run src/adapters/content/generate.test.ts` → PASS (live test skipped without `RUN_LIVE_API=1`).

- [ ] **Step 8: Commit**

```bash
git add src/adapters/content/generate.ts src/adapters/content/generate.test.ts src/adapters/content/generate.live.test.ts package.json package-lock.json
git commit -m "feat: AI recipe generation with injected generator"
```

---

## Task 9: SDK event → command mapping

**Files:**

- Create: `src/sdk/events.ts`
- Test: `src/sdk/events.test.ts`

Translates raw `onEvenHubEvent` payloads into `Command`s. Protobuf omits zero-value fields, so `CLICK_EVENT` (0) arrives as `undefined` — coalesce with `?? null`. Tap → next, scroll-up → back, scroll-down → next. Double-tap is handled separately in `main.ts` (exit), so it returns `null` here.

- [ ] **Step 1: Write the failing test**

```ts
// src/sdk/events.test.ts
import { describe, it, expect } from 'vitest';
import { OsEventTypeList } from '@evenrealities/even_hub_sdk';
import { eventToCommand } from './events';

describe('eventToCommand', () => {
  it('maps a tap (sys click) to next', () => {
    expect(eventToCommand({ sysEvent: { eventType: OsEventTypeList.CLICK_EVENT } })).toBe('next');
  });

  it('maps scroll up to back', () => {
    expect(eventToCommand({ textEvent: { eventType: OsEventTypeList.SCROLL_TOP_EVENT } })).toBe(
      'back',
    );
  });

  it('maps scroll down to next', () => {
    expect(eventToCommand({ textEvent: { eventType: OsEventTypeList.SCROLL_BOTTOM_EVENT } })).toBe(
      'next',
    );
  });

  it('returns null for a double-tap (handled as exit elsewhere)', () => {
    expect(
      eventToCommand({ sysEvent: { eventType: OsEventTypeList.DOUBLE_CLICK_EVENT } }),
    ).toBeNull();
  });

  it('treats an undefined sys eventType as a click (next)', () => {
    expect(eventToCommand({ sysEvent: {} })).toBe('next');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/sdk/events.test.ts`
Expected: FAIL — cannot find module `./events`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/sdk/events.ts
import { OsEventTypeList } from '@evenrealities/even_hub_sdk';
import type { Command } from '../core/command';

interface EvenHubEventLike {
  sysEvent?: { eventType?: number };
  textEvent?: { eventType?: number };
}

export function eventToCommand(event: EvenHubEventLike): Command | null {
  const sysType = event.sysEvent ? (event.sysEvent.eventType ?? OsEventTypeList.CLICK_EVENT) : null;
  const textType = event.textEvent?.eventType ?? null;

  if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT) return null;
  if (textType === OsEventTypeList.SCROLL_TOP_EVENT) return 'back';
  if (textType === OsEventTypeList.SCROLL_BOTTOM_EVENT) return 'next';
  if (sysType === OsEventTypeList.CLICK_EVENT) return 'next';
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/sdk/events.test.ts`
Expected: PASS (5 tests).

> If a `SCROLL_*` or `CLICK` enum name differs in the installed SDK version, read `node_modules/@evenrealities/even_hub_sdk` for the actual `OsEventTypeList` members and adjust both test and impl.

- [ ] **Step 5: Commit**

```bash
git add src/sdk/events.ts src/sdk/events.test.ts
git commit -m "feat: map SDK input events to commands"
```

---

## Task 10: SDK renderer, ASR source, and composition root

**Files:**

- Create: `src/sdk/renderer.ts`
- Create: `src/sdk/asr-source.ts`
- Modify: `src/main.ts` (full rewrite)

This task is SDK glue — excluded from coverage thresholds and verified in the simulator, not by unit tests. Build it, then run `npm run dev` + `npm run sim` and cook the bundled recipe end to end.

- [ ] **Step 1: Write the renderer**

```ts
// src/sdk/renderer.ts
import { TextContainerUpgrade, type EvenAppBridge } from '@evenrealities/even_hub_sdk';
import type { Renderer, StepView } from '../core/ports';
import { formatDuration } from '../core/format';

const HEADER_ID = 1;
const BODY_ID = 2;
const FOOTER_ID = 3;

export class SdkRenderer implements Renderer {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly bridge: EvenAppBridge) {}

  render(view: StepView): void {
    const header = `${view.recipeTitle}    ${view.stepNumber} / ${view.stepCount}`;
    const body = view.phase === 'done' ? `All done!\n\n${view.text}` : view.text;
    const footer = view.timer
      ? `${view.timer.label === 'DONE' ? '✔ ' : '⏲ '}${view.timer.label}  ${formatDuration(view.timer.remainingSec)}`
      : 'say "next" · "back" · "repeat"';

    this.queue = this.queue
      .then(() => this.write(HEADER_ID, 'header', header))
      .then(() => this.write(BODY_ID, 'body', body))
      .then(() => this.write(FOOTER_ID, 'footer', footer));
  }

  private write(containerID: number, containerName: string, content: string): Promise<unknown> {
    return this.bridge.textContainerUpgrade(
      new TextContainerUpgrade({ containerID, containerName, content }),
    );
  }
}
```

- [ ] **Step 2: Write the ASR command source**

```ts
// src/sdk/asr-source.ts
import type { Command } from '../core/command';
import { matchKeyword } from '../core/keywords';
import { startSttStream, type SttClient } from './stt';

// Wraps the STT stream: every snapshot's newest words are matched to a Command.
// Debounced so one spoken word fires a command once, not on every interim frame.
export class AsrCommandSource {
  private client: SttClient | null = null;
  private lastFired = '';

  constructor(
    private readonly apiKey: string,
    private readonly onError?: (err: unknown) => void,
  ) {}

  subscribe(handler: (command: Command) => void): () => void {
    this.client = startSttStream(
      this.apiKey,
      (snap) => {
        const tail = (snap.finalText + ' ' + snap.interimText).trim().slice(-40);
        const command = matchKeyword(tail);
        if (command && tail !== this.lastFired) {
          this.lastFired = tail;
          handler(command);
        }
        if (snap.finished) this.lastFired = '';
      },
      this.onError,
    );
    return () => this.client?.close();
  }

  sendPcm(chunk: Uint8Array): void {
    this.client?.sendPcm(chunk);
  }
}
```

- [ ] **Step 3: Rewrite the composition root**

```ts
// src/main.ts
import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk';
import { loadBundledRecipes } from './adapters/content/bundled';
import { StepWiseSession } from './core/session';
import { SdkRenderer } from './sdk/renderer';
import { AsrCommandSource } from './sdk/asr-source';
import { eventToCommand } from './sdk/events';

const recipe = loadBundledRecipes()[0];
const bridge = await waitForEvenAppBridge();

function container(
  containerID: number,
  containerName: string,
  yPosition: number,
  height: number,
  content: string,
  isEventCapture: 0 | 1,
) {
  return new TextContainerProperty({
    xPosition: 0,
    yPosition,
    width: 576,
    height,
    borderWidth: 0,
    borderColor: 5,
    paddingLength: 4,
    containerID,
    containerName,
    content,
    isEventCapture,
  });
}

await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({
    containerTotalNum: 3,
    textObject: [
      container(1, 'header', 0, 40, recipe.title, 0),
      container(2, 'body', 48, 200, recipe.steps[0].text, 1),
      container(3, 'footer', 252, 36, 'say "next" to begin', 0),
    ],
  }),
);

const renderer = new SdkRenderer(bridge);
const session = new StepWiseSession(recipe, realClock(), (view) => renderer.render(view));
session.start();

const asr = new AsrCommandSource(import.meta.env.VITE_STT_API_KEY ?? '', (err) =>
  console.error('ASR error:', err),
);
const unsubscribeAsr = asr.subscribe((command) => session.handle(command));
await bridge.audioControl(true);

const unsubscribe = bridge.onEvenHubEvent((event) => {
  const pcm = event.audioEvent?.audioPcm;
  if (pcm) asr.sendPcm(pcm);

  const sysType = event.sysEvent?.eventType ?? null;
  const textType = event.textEvent?.eventType ?? null;
  if (
    sysType === OsEventTypeList.DOUBLE_CLICK_EVENT ||
    textType === OsEventTypeList.DOUBLE_CLICK_EVENT
  ) {
    bridge.shutDownPageContainer(1);
    return;
  }
  const command = eventToCommand(event);
  if (command) session.handle(command);
});

window.addEventListener('beforeunload', () => {
  bridge.audioControl(false);
  unsubscribeAsr();
  unsubscribe();
});

function realClock() {
  return {
    now: () => Date.now(),
    setTimeout: (cb: () => void, ms: number) => window.setTimeout(cb, ms),
    clearTimeout: (handle: number) => window.clearTimeout(handle),
  };
}
```

- [ ] **Step 4: Typecheck, lint, and build**

Run: `npm run build && npm run lint`
Expected: both pass. Fix any SDK type mismatches by reading the installed `@evenrealities/even_hub_sdk` types (e.g. the exported bridge type name, container property fields).

- [ ] **Step 5: Verify in the simulator**

Run (two terminals): `npm run dev`, then `npm run sim`.
Expected: the header shows the recipe title + step count; tapping advances steps; entering the boil/simmer steps starts a visible countdown; reaching zero flips the footer to a DONE marker; double-tap exits. Voice nav requires a wired STT provider in `src/sdk/stt.ts` (see note below).

- [ ] **Step 6: Commit**

```bash
git add src/sdk/renderer.ts src/sdk/asr-source.ts src/main.ts
git commit -m "feat: wire core through SDK renderer, ASR, and input events"
```

> **STT provider:** `src/sdk/stt.ts` still throws until a provider is wired. For the demo, implement `startSttStream` against a streaming PCM provider (e.g. Deepgram) that accepts s16le/16 kHz mono, and add its host to the `network` whitelist in `app.json`. Tap/scroll navigation works without it.

---

## Final verification

- [ ] **Full suite + coverage**

Run: `npm run coverage`
Expected: all tests pass; `src/core/**` and `src/adapters/**` meet thresholds (lines/statements ≥ 80%, branches ≥ 60%).

- [ ] **Format + lint**

Run: `npm run format && npm run lint`
Expected: clean.

- [ ] **Open the PR**

```bash
git push -u origin feat/stepwise-core
gh pr create --title "StepWise core: navigation, timers, voice nav" --body "Implements the test-driven core (recipe validation, navigation, timers, keyword matching, session orchestration), content adapters (bundled + AI generate), and SDK wiring per docs/superpowers/specs/2026-06-17-stepwise-design.md."
```

---

## Self-review notes

- **Spec coverage:** bundled recipes (Task 7) + AI generate (Task 8); always-listening keywords (Tasks 3, 10); live timers + visual DONE alert (Tasks 5, 6, 10); cooking-first generic schema (Task 1); navigation (Task 4); SDK input incl. ring/touch via events (Task 9). Deferred-per-spec items (multi-timer, voice Q&A, ingredient screen) are intentionally absent.
- **Coverage exclusions:** `src/sdk/**` is excluded from thresholds (per `vitest.config.ts`); Task 9's `events.ts` still has unit tests, and Task 10's renderer/asr/main are verified in the simulator.
- **Type consistency:** `Phase` narrowed in Task 4 and consumed by `navigation.ts`/`session.ts`; `StepView.timer.label` uses the literal `'DONE'` in both `session.ts` (Task 6) and `renderer.ts` (Task 10).
