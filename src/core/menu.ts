import type { MenuCommand } from './command';
import type { MenuView } from './ports';

// Pure picker over any labeled entries. Holds the list and a wrapping cursor;
// 'up'/'down' move the highlight and re-emit. 'select'/'exit' belong to the
// shell, so they're ignored here. No SDK, no IO.
export class MenuController<T extends { label: string }> {
  private cursor = 0;

  constructor(
    private readonly entries: T[],
    private readonly emit: (view: MenuView) => void,
  ) {}

  start(): void {
    this.render();
  }

  handle(command: MenuCommand): void {
    const count = this.entries.length;
    if (command === 'down') {
      this.cursor = (this.cursor + 1) % count;
    } else if (command === 'up') {
      this.cursor = (this.cursor - 1 + count) % count;
    } else {
      return;
    }
    this.render();
  }

  selected(): T {
    return this.entries[this.cursor];
  }

  private render(): void {
    this.emit({
      title: 'Choose a recipe',
      items: this.entries.map((entry, i) => ({
        label: entry.label,
        selected: i === this.cursor,
      })),
      hint: 'scroll: move   click: start',
    });
  }
}
