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
