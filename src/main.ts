import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
} from '@evenrealities/even_hub_sdk';
import { loadBundledRecipes } from './adapters/content/bundled';
import { generateRecipe } from './adapters/content/generate';
import type { Recipe } from './core/recipe';
import { StepWiseSession } from './core/session';
import { MenuController } from './core/menu';
import { buildPickerEntries } from './core/picker';
import { SdkRenderer } from './sdk/renderer';
import { AsrCommandSource } from './sdk/asr-source';
import { createAnthropicGenerator } from './sdk/anthropic-generator';
import { eventToCommand, eventToMenuCommand } from './sdk/events';

// A few dishes the AI can generate on demand, shown as "AI: <dish>" entries.
const AI_DISHES = ['Shakshuka', 'Pad Thai'];

const recipes = loadBundledRecipes();
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
      container(1, 'header', 0, 40, 'StepWise', 0),
      container(2, 'body', 48, 200, 'Loading...', 1),
      container(3, 'footer', 252, 36, '', 0),
    ],
  }),
);

const renderer = new SdkRenderer(bridge);

// AI generation is best-effort: only offered when a client key is configured.
const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY ?? '';
const generator = anthropicKey ? createAnthropicGenerator(anthropicKey) : null;

const sttKey = import.meta.env.VITE_STT_API_KEY ?? '';
const asr = new AsrCommandSource(sttKey, (err) => console.error('ASR error:', err));

// "Ask for a dish" needs both a mic (STT) to hear the name and a generator to
// build the recipe from it.
const voiceCapable = Boolean(sttKey) && Boolean(generator);

// The picker mixes bundled recipes with AI generate entries. The shell owns
// which mode is active (picker / cooking / a transient message); each
// controller owns the decisions within its mode.
const entries = buildPickerEntries(recipes, generator ? AI_DISHES : [], voiceCapable);
const menu = new MenuController(entries, (view) => renderer.renderMenu(view));

type Mode = 'picker' | 'cooking' | 'message';
let mode: Mode = 'picker';
let session: StepWiseSession | null = null;

function showPicker(): void {
  session?.stop();
  session = null;
  asr.cancelDishCapture();
  mode = 'picker';
  menu.start();
}

function cook(recipe: Recipe): void {
  mode = 'cooking';
  session = new StepWiseSession(recipe, realClock(), (view) => renderer.render(view));
  session.start();
}

async function generate(dishName: string): Promise<void> {
  if (!generator) return;
  mode = 'message';
  renderer.renderMessage('StepWise', `Generating\n${dishName}...`, 'one moment');
  try {
    cook(await generateRecipe(dishName, generator));
  } catch (err) {
    // Still in 'message' mode (cook() only runs on success), so just repaint.
    console.error('recipe generation failed:', err);
    renderer.renderMessage('StepWise', `Could not make\n${dishName}`, 'double-tap for menu');
  }
}

// Listen for a spoken dish name, then generate it. Needs the cooking mic, so
// the STT stream is feeding snapshots already (subscribed below).
function askForDish(): void {
  mode = 'message';
  renderer.renderMessage('StepWise', 'Say a dish name...', 'listening');
  asr.startDishCapture((dish) => void generate(dish));
}

function selectEntry(): void {
  const entry = menu.selected();
  if (entry.kind === 'recipe') {
    cook(entry.recipe);
  } else if (entry.kind === 'generate') {
    void generate(entry.dishName);
  } else if (entry.kind === 'voice') {
    askForDish();
  }
}

showPicker();

// Gesture/event input is wired FIRST and synchronously. Navigation must never
// depend on microphone or STT setup — those can fail or hang where there's no
// mic (e.g. the simulator), and must not take the tap/scroll handlers down with
// them.
const unsubscribe = bridge.onEvenHubEvent((event) => {
  const pcm = event.audioEvent?.audioPcm;
  if (pcm) asr.sendPcm(pcm);

  if (mode === 'cooking' && session) {
    // Cooking: double-tap drops back to the picker; everything else steps.
    if (eventToMenuCommand(event) === 'exit') {
      showPicker();
      return;
    }
    const command = eventToCommand(event);
    if (command) session.handle(command);
    return;
  }

  if (mode === 'message') {
    // A transient screen (generating / error): only a double-tap escapes it.
    if (eventToMenuCommand(event) === 'exit') showPicker();
    return;
  }

  // Picker: scroll moves the highlight, click selects, double-tap exits the app.
  const menuCommand = eventToMenuCommand(event);
  if (menuCommand === 'select') {
    selectEntry();
  } else if (menuCommand === 'exit') {
    bridge.shutDownPageContainer(1);
  } else if (menuCommand) {
    menu.handle(menuCommand);
  }
});

// Voice control is best-effort: skip it entirely without a key (an empty key
// builds an invalid WebSocket), and never await mic setup on the critical path.
// Voice drives the active cooking session; the picker is gesture-only.
let unsubscribeAsr = () => {};
if (sttKey) {
  unsubscribeAsr = asr.subscribe((command) => session?.handle(command));
  void bridge.audioControl(true).catch((err) => console.error('audioControl failed:', err));
}

window.addEventListener('beforeunload', () => {
  void bridge.audioControl(false);
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
