import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk';
import type { Recipe } from './core/recipe';
import carbonara from './content/recipes/carbonara.json';

// Composition root. For now this boots the bridge and paints the first step of a
// bundled recipe so the scaffold runs in the simulator. The navigation /
// timer / voice-command wiring is built test-first in the core (see CLAUDE.md)
// and plugged in here once those units exist.

const recipe = carbonara as unknown as Recipe;

const bridge = await waitForEvenAppBridge();

const header = new TextContainerProperty({
  xPosition: 0,
  yPosition: 0,
  width: 576,
  height: 40,
  borderWidth: 0,
  borderColor: 5,
  paddingLength: 4,
  containerID: 1,
  containerName: 'header',
  content: `${recipe.title}    1 / ${recipe.steps.length}`,
  isEventCapture: 0,
});

const body = new TextContainerProperty({
  xPosition: 0,
  yPosition: 48,
  width: 576,
  height: 240,
  borderWidth: 0,
  borderColor: 5,
  paddingLength: 4,
  containerID: 2,
  containerName: 'body',
  content: recipe.steps[0]?.text ?? '(empty recipe)',
  isEventCapture: 1,
});

const created = await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({ containerTotalNum: 2, textObject: [header, body] }),
);
if (created !== 0) console.error('createStartUpPageContainer failed:', created);

const unsubscribe = bridge.onEvenHubEvent((event) => {
  const sysType = event.sysEvent?.eventType ?? null;
  const textType = event.textEvent?.eventType ?? null;
  if (
    sysType === OsEventTypeList.DOUBLE_CLICK_EVENT ||
    textType === OsEventTypeList.DOUBLE_CLICK_EVENT
  ) {
    bridge.shutDownPageContainer(1);
  }
});

window.addEventListener('beforeunload', () => unsubscribe());

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main style="margin:auto;padding:24px;max-width:680px;box-sizing:border-box;">
    <h1 style="font-size:18px;font-weight:600;margin:0 0 12px;">StepWise — ${recipe.title}</h1>
    <pre style="background:#2e2e2e;border:1px solid #3e3e3e;border-radius:12px;padding:20px;font-size:16px;line-height:1.5;white-space:pre-wrap;color:#e5e5e5;margin:0;">${recipe.steps[0]?.text ?? ''}</pre>
    <footer style="font-size:12px;color:#7b7b7b;text-align:center;margin-top:16px;">
      Scaffold preview · navigation, timers &amp; voice commands land next (TDD core) · double-tap to exit
    </footer>
  </main>
`;
