import type { Recipe } from './recipe';
import type { Command } from './command';
import type { Clock } from './clock';
import type { StepView } from './ports';
import { NavigationController } from './navigation';
import { TimerEngine } from './timer';

export class StepWiseSession {
  private readonly nav: NavigationController;
  private readonly timer: TimerEngine;
  private remaining: number | null = null;
  private alert = false;

  constructor(
    private readonly recipe: Recipe,
    clock: Clock,
    private readonly emit: (view: StepView) => void,
  ) {
    this.nav = new NavigationController(recipe);
    this.timer = new TimerEngine(
      clock,
      (remaining) => {
        this.remaining = remaining;
        this.render();
      },
      () => {
        this.remaining = 0;
        this.alert = true;
        this.render();
      },
    );
  }

  start(): void {
    this.enterStep();
  }

  handle(command: Command): void {
    switch (command) {
      case 'next':
        this.clearTimer();
        this.nav.next();
        this.enterStep();
        return;
      case 'back':
        this.clearTimer();
        this.nav.back();
        this.enterStep();
        return;
      case 'repeat':
        this.render();
        return;
      case 'startTimer':
        this.startStepTimer();
        this.render();
        return;
      case 'pauseTimer':
        this.timer.pause();
        this.render();
        return;
      case 'ingredients':
        return;
    }
  }

  private enterStep(): void {
    this.clearTimer();
    this.startStepTimer();
    this.render();
  }

  private startStepTimer(): void {
    const step = this.nav.currentStep;
    if (step.durationSec !== undefined && this.nav.phase === 'cooking') {
      this.alert = false;
      this.remaining = step.durationSec;
      this.timer.start(step.durationSec);
    }
  }

  private clearTimer(): void {
    this.timer.pause();
    this.remaining = null;
    this.alert = false;
  }

  private render(): void {
    this.emit(this.buildView());
  }

  private buildView(): StepView {
    const step = this.nav.currentStep;
    const timer =
      this.remaining !== null
        ? { label: this.alert ? 'DONE' : (step.note ?? 'Timer'), remainingSec: this.remaining }
        : null;
    return {
      recipeTitle: this.recipe.title,
      phase: this.nav.phase,
      stepNumber: this.nav.currentIndex + 1,
      stepCount: this.nav.stepCount,
      text: step.text,
      timer,
    };
  }
}
