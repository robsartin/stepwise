import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
} from '@evenrealities/even_hub_sdk';
import { loadBundledRecipes } from './adapters/content/bundled';
import { StepWiseSession } from './core/session';
import { MenuController } from './core/menu';
import { SdkRenderer } from './sdk/renderer';
import { AsrCommandSource } from './sdk/asr-source';
import { eventToCommand, eventToMenuCommand } from './sdk/events';

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

// Two modes share the same three containers: the picker (choose a recipe) and a
// cooking session (step through the chosen one). The shell owns which is active;
// each controller owns the decisions within its mode.
const entries = recipes.map((recipe) => ({ label: recipe.title, recipe }));
const menu = new MenuController(entries, (view) => renderer.renderMenu(view));
let session: StepWiseSession | null = null;

function showPicker(): void {
  session?.stop();
  session = null;
  menu.start();
}

function startCooking(): void {
  session = new StepWiseSession(menu.selected().recipe, realClock(), (view) =>
    renderer.render(view),
  );
  session.start();
}

showPicker();

const sttKey = import.meta.env.VITE_STT_API_KEY ?? '';
const asr = new AsrCommandSource(sttKey, (err) => console.error('ASR error:', err));

// Gesture/event input is wired FIRST and synchronously. Navigation must never
// depend on microphone or STT setup — those can fail or hang where there's no
// mic (e.g. the simulator), and must not take the tap/scroll handlers down with
// them.
const unsubscribe = bridge.onEvenHubEvent((event) => {
  const pcm = event.audioEvent?.audioPcm;
  if (pcm) asr.sendPcm(pcm);

  if (session) {
    // Cooking: double-tap drops back to the picker; everything else steps.
    if (eventToMenuCommand(event) === 'exit') {
      showPicker();
      return;
    }
    const command = eventToCommand(event);
    if (command) session.handle(command);
    return;
  }

  // Picker: scroll moves the highlight, click selects, double-tap exits the app.
  const menuCommand = eventToMenuCommand(event);
  if (menuCommand === 'select') {
    startCooking();
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
