import type { Recipe } from './recipe';
import type { MenuCommand } from './command';
import type { MenuView } from './ports';

// Pure recipe picker. Holds the list and a wrapping cursor; 'up'/'down' move
// the highlight and re-emit. 'select'/'exit' belong to the shell, so they're
// ignored here. No SDK, no IO.
export class MenuController {
  private cursor = 0;

  constructor(
    private readonly recipes: Recipe[],
    private readonly emit: (view: MenuView) => void,
  ) {}

  start(): void {
    this.render();
  }

  handle(command: MenuCommand): void {
    const count = this.recipes.length;
    if (command === 'down') {
      this.cursor = (this.cursor + 1) % count;
    } else if (command === 'up') {
      this.cursor = (this.cursor - 1 + count) % count;
    } else {
      return;
    }
    this.render();
  }

  selected(): Recipe {
    return this.recipes[this.cursor];
  }

  private render(): void {
    this.emit({
      title: 'Choose a recipe',
      items: this.recipes.map((recipe, i) => ({
        label: recipe.title,
        selected: i === this.cursor,
      })),
      hint: 'scroll: move   click: start',
    });
  }
}
