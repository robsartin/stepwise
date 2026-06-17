# StepWise

A hands-free, step-by-step cooking guide for [Even Realities G2](https://www.evenrealities.com/g2)
smart glasses. Advance through a recipe with voice keywords — **"next"**, **"back"**,
**"repeat"** — while live timers count down in your eyeline. Built as an Even Hub plugin
(Vite + TypeScript + `@evenrealities/even_hub_sdk`).

Built for the Even Realities **#CodeInTheWild** competition (June 2026).

## Quick start

```bash
npm install
npm run dev          # Vite dev server on :5173
npm run sim          # evenhub simulator against the dev server
```

To run on real glasses: `npm run qr`, then scan with the Even Hub companion app.

## Scripts

| Command                           | Purpose                           |
| --------------------------------- | --------------------------------- |
| `npm run dev`                     | Vite dev server                   |
| `npm run sim`                     | Glasses simulator                 |
| `npm test`                        | Unit + integration tests (Vitest) |
| `npm run test:watch`              | TDD watch loop                    |
| `npm run coverage`                | Tests with coverage thresholds    |
| `npm run lint` / `npm run format` | ESLint / Prettier                 |
| `npm run pack`                    | Build the `.ehpk` package         |

## Architecture

Dependencies point inward. The core is pure TypeScript with no SDK/DOM/IO.

- `src/core/` — domain logic: navigation, timers, command matching, recipe schema (pure, unit-tested).
- `src/adapters/` — content sources (bundled recipes, AI generation) behind core interfaces.
- `src/sdk/` — Even Hub SDK glue: rendering, input events, the STT client.
- `src/main.ts` — composition root.

See [`CLAUDE.md`](CLAUDE.md) for the TDD workflow, testing strategy, and coverage targets,
and [`docs/superpowers/specs/`](docs/superpowers/specs/) for the design.
