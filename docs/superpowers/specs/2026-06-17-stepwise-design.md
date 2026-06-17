# StepWise — Design

**Date:** 2026-06-17
**Status:** Approved (approach A)
**Context:** Entry for the Even Realities #CodeInTheWild competition (~2-day build).

## Summary

StepWise is a hands-free, step-by-step cooking guide for Even Realities G2 smart glasses.
The user advances through a recipe with voice keywords ("next", "back", "repeat"), with
live, glanceable timers shown in their eyeline. Cooking-first framing, but the data model
is a generic procedure so repair/assembly guides fit later with no schema change.

## Platform constraints

- **Display:** 576×288 px, 4-bit greyscale (16 shades of green), 27.5° FOV, 60 Hz. Glanceable HUD.
- **No camera, no speaker** on the glasses — completion cues are **visual** (full-screen invert/flash), never audio.
- **Input:** glasses mic → bring-your-own STT (PCM s16le 16 kHz mono via `bridge.audioControl`), R1 ring, temple touch.
- **SDK:** `@evenrealities/even_hub_sdk` (`waitForEvenAppBridge`, `TextContainerProperty`,
  `createStartUpPageContainer`, `textContainerUpgrade`, `onEvenHubEvent`, `shutDownPageContainer`).
  Vite + TypeScript; `evenhub-simulator` for local testing; `evenhub pack` → `.ehpk`.

## Decisions

- **Content source:** bundled JSON recipes **+** AI-generate from a dish name (LLM), with bundled as the reliable demo fallback.
- **Voice control:** always-listening keyword spotting (`next / back / repeat / start / pause / timer / ingredients`), with ring/touch fallback.
- **Hero feature:** live glanceable per-step timers with a visual "done" alert.
- **Framing:** cooking-first, generic step schema.

## Approach

**Approach A (chosen):** pure-logic core + thin SDK adapters; AI generation isolated host-side.
Navigation, timers, and command matching are plain TypeScript with no SDK/DOM dependency, so
they're fully unit-testable. The SDK layer only paints state and forwards raw input. Rejected:
leaning on the third-party `even-toolkit` (extra dep under time pressure) and a one-file
prototype (fragile, fights the TDD workflow).

## Architecture

```
ASR keywords ┐
R1 ring      ├─► CommandSource ─► Command ─► NavigationController ─┬─► StepView ─► Renderer ─► G2 display
temple touch ┘                                  TimerEngine ───────┘
```

Dependencies point inward; the core never imports the SDK, DOM, network, or a real clock.

- **Core (`src/core/`)** — `NavigationController` (current step, history, phase), `TimerEngine`
  (per-step countdowns against an injected `Clock`), keyword→`Command` matching, and the
  `Recipe`/`Step` schema + validation (zod). Pure, deterministic.
- **Adapters (`src/adapters/`)** — content: bundled JSON loading + validation, and
  `generateRecipe(dishName)` (LLM, schema-validated, with timeout + fallback).
- **SDK glue (`src/sdk/`)** — `Renderer` painting `StepView` to text containers, event→`Command`
  translation (tap = next, scroll-up = back, double-tap = exit), and the `SttClient`.
- **Shell (`src/main.ts`)** — composition root: builds the real clock + SDK bindings, wires
  sources → controller/timer → renderer.

## Data model

```ts
Recipe { id; title; servings?; ingredients: string[]; steps: Step[] }
Step   { index; text; durationSec?; note? }
```

Generic enough that a repair/assembly procedure is just steps with optional durations.

## Screens (monochrome, glanceable)

- **Step view:** `title  N / total` header, large step text, active timer line at the bottom (`⏲ Simmer 7:42`).
- **Timer alert:** full-screen invert/flash "STEP DONE" (visual, since there's no speaker).

## Error handling

- **AI generate:** validate JSON, time out the call; on any failure surface a brief notice and keep bundled recipes fully usable.
- **ASR:** confidence threshold + ignore unknown words; briefly highlight the recognized command so a misfire is visible and correctable.
- **Offline:** bundled recipes work; AI path disabled with a one-line notice.

## Testing (pure TDD)

- **Unit (the bulk):** `NavigationController` bounds/next/back/repeat/jump; `TimerEngine`
  start/tick/complete/pause with a fake clock; keyword matching incl. false-trigger rejection;
  recipe schema validation (good / bad / AI-shaped JSON).
- **Integration (some):** scripted commands + fake clock cook a recipe end to end through
  CommandSource → Controller → TimerEngine → StepView; one **gated** live-API test for `generateRecipe`.
- **Manual:** renderer paint, live mic, gestures — verified in the simulator / on glasses.
- **Coverage:** >80% lines/statements, >60% branches (Vitest thresholds; core near 100%).

## MVP scope (2 days)

**In:** bundled recipes, always-listening `next/back/repeat`, one live timer + visual done alert,
step renderer, AI-generate path.
**Deferred (YAGNI):** multi-timer, voice Q&A, full ingredient-checklist screen, shipped
repair/assembly content, settings.
