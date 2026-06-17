import type { Recipe, Step } from './recipe';
import type { Phase } from './ports';

export class NavigationController {
  private index = 0;
  private finished = false;

  constructor(private readonly recipe: Recipe) {
    if (recipe.steps.length === 0) {
      throw new Error('recipe has no steps');
    }
  }

  get stepCount(): number {
    return this.recipe.steps.length;
  }

  get currentIndex(): number {
    return this.index;
  }

  get currentStep(): Step {
    return this.recipe.steps[this.index];
  }

  get phase(): Phase {
    return this.finished ? 'done' : 'cooking';
  }

  next(): void {
    if (this.index < this.stepCount - 1) {
      this.index += 1;
    } else {
      this.finished = true;
    }
  }

  back(): void {
    if (this.finished) {
      this.finished = false;
      return;
    }
    if (this.index > 0) {
      this.index -= 1;
    }
  }
}
