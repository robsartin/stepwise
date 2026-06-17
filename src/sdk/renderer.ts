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
      ? `${view.timer.label === 'DONE' ? '** DONE **' : view.timer.label}  ${formatDuration(view.timer.remainingSec)}`
      : 'say: next / back / repeat';

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
