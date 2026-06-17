# StepWise

Hands-free, step-by-step cooking guide for Even Realities G2 smart glasses. The user
advances through a recipe with voice keywords ("next", "back", "repeat"), with live
glanceable timers rendered in their eyeline. Built as an Even Hub plugin
(Vite + TypeScript + `@evenrealities/even_hub_sdk`).

Display target: 576×288 px, 4-bit greyscale (16 shades of green). No camera, no speaker
on the glasses — completion cues are **visual**, never audio.

## Development workflow: pure TDD

We practice **pure TDD**. No production code is written without a failing test driving it.

1. **Red** — write the smallest failing test for the next behavior. Run it; confirm it
   fails for the right reason.
2. **Green** — write the minimum code to make it pass.
3. **Refactor** — clean up with tests green.
4. **Commit** — commit the red→green→refactor increment.

The failing test runs _before_ the implementation exists. Do not write a batch of code
and backfill tests.

## Git workflow

issue → branch → commits → PR to `main` → **squash merge**. Never commit directly to
`main`. Branch names: `feat/<short-desc>`, `fix/<short-desc>`, `test/<short-desc>`.

## Architecture layers

Dependencies point **inward only**. The core never imports the SDK, the DOM, the network,
or any clock/timer global.

```
Shell (composition root)   ── wires everything together
  └─ Adapters              ── even_hub_sdk input/render, recipe loading, AI generation
       └─ Core (domain)    ── pure logic: navigation, timers, command matching, schema
```

1. **Core (`src/core/`)** — pure TypeScript. `NavigationController`, `TimerEngine`,
   command matching, the `Recipe`/`Step` schema and validation. No SDK, no DOM, no IO.
   All time comes from an **injected clock**; all input arrives as a plain `Command`.
2. **Adapters (`src/adapters/`)** — implement core-defined interfaces against the outside
   world: `CommandSource` impls (ASR keyword spotter, R1 ring, temple touch), the
   `Renderer` (paints core state to the SDK), and content (`src/content/`: bundled JSON
   loading + `generateRecipe` LLM call). Adapters are thin — they translate, they don't
   decide.
3. **Shell (`src/main.ts`)** — the composition root. Constructs the real clock, SDK
   bindings, and content sources, then wires sources → controller/timer → renderer.

When a file starts making decisions _and_ talking to the SDK, split it: push the decision
into Core, leave a thin adapter.

## Testing strategy

Focus is **unit tests** on Core, with **some integration tests** for the wired flow and
content boundary. What can't be unit-tested (real SDK paint, live mic) is verified in the
simulator / on-device.

| Layer                                                         | How to test                                                                                                                       | Type            |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Core domain (navigation, timers, matching, schema)            | Pure functions/classes. Inject a **fake clock**; feed scripted `Command`s. Deterministic, no mocks of the SDK needed.             | Unit (the bulk) |
| Adapters — input mapping (ASR/ring/touch → `Command`)         | Drive with fake transcripts / synthetic ring+touch events; assert the emitted `Command`. SDK faked at the boundary.               | Unit            |
| Adapters — content (schema validation, AI parse)              | Validate bundled fixtures and good/bad/AI-shaped JSON. `generateRecipe` runs against a **mocked** LLM client in unit tests.       | Unit            |
| Wired flow (CommandSource → Controller → TimerEngine → state) | Integration test: scripted commands + fake clock cook a recipe end to end; assert resulting state. Stops at state, not SDK paint. | Integration     |
| AI generation against the real API                            | One **gated** test (`RUN_LIVE_API=1`), skipped by default in CI.                                                                  | Integration     |
| Renderer paint, live ASR mic, gestures                        | Simulator (`npm run sim`) and on-glasses.                                                                                         | Manual          |

Rules:

- Core tests never touch `Date.now()`, `setTimeout`, the SDK, or the network — inject them.
- Prefer fakes (hand-written test doubles implementing the core interface) over mocking
  libraries. Mock only at true IO edges (LLM client).
- An integration test asserts collaboration between layers; a unit test asserts one unit
  with its collaborators faked.

## Coverage

Enforced via Vitest thresholds (`vitest.config.ts`); CI fails below them.

- **Lines/statements: > 80%**
- **Branches: > 60%**

Core should sit near 100% — it's pure and fully testable. The thin SDK-binding glue in the
shell and the simulator entrypoint are excluded from coverage (they're verified manually).

## Code format & lint

- **Prettier** for formatting: 2-space indent, single quotes, semicolons, trailing commas,
  100-char print width.
- **ESLint** with `@typescript-eslint`, `eslint-config-prettier` (Prettier owns layout).
- Run `npm run format` and `npm run lint` before every commit; both run in CI.

## Commands

```
npm run dev        # Vite dev server
npm run sim        # evenhub simulator against the dev server
npm test           # vitest run (unit + integration)
npm run test:watch # vitest watch (TDD loop)
npm run coverage   # vitest run --coverage (enforces thresholds)
npm run lint       # eslint
npm run format     # prettier --write
npm run qr         # evenhub qr --url  (pair to real glasses)
npm run pack       # evenhub pack  (build .ehpk)
```
