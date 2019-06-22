import {PlanckProcessor} from "../PlanckProcessor";
import {Screen} from "../Screen";
import {Step} from "../Step";

export abstract class DeathFromAbove implements Step {

  protected readonly processor: PlanckProcessor;
  protected frame: number;

  private readonly warning: string;
  private readonly screen: Screen;
  private readonly gap: number;
  private readonly spread: number;
  private event: number;

  constructor(warning: string, processor: PlanckProcessor, screen: Screen, gap: number, spread: number) {
    this.warning = warning;
    this.processor = processor;
    this.screen = screen;
    this.gap = gap;
    this.spread = spread;
    this.reset();
  }

  /**
   * {@inheritDoc
   */
  public perform(): Step {
    this.frame++;
    if (this.frame - this.event === 0) {
      this.launch();
      this.reset();
    }
    return this;
  }

  protected launch(): boolean {
    const free = this.screen.findFreeLine(18, -1);
    if (free) {
      this.screen.animateFadeText(free, this.warning);
      return true;
    }
    return false;
  }

  protected reset(): void {
    this.frame = 0;
    this.event = Math.round(1.5 * this.gap + this.gap * Math.floor(Math.random() * this.spread));
  }

}
