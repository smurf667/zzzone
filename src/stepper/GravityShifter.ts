import {PlanckProcessor} from "../PlanckProcessor";
import {Screen} from "../Screen";
import {Step} from "../Step";

export class GravityShifter implements Step {

  private readonly world: planck.World;
  private readonly gravity: planck.Vec2;
  private readonly screen: Screen;
  private readonly range: number;
  private readonly gap: number;
  private readonly spread: number;
  private frame: number;
  private event: number;

  constructor(processor: PlanckProcessor, screen: Screen, range: number, gap: number, spread: number) {
    this.world = processor.world;
    this.screen = screen;
    this.gap = gap;
    this.spread = spread;
    this.gravity = this.world.getGravity();
    this.range = range;
    this.reset();
  }

  /**
   * {@inheritDoc
   */
  public perform(): Step {
    this.frame++;
    const gap = this.frame - this.event; // positive if inside the event;
    if (gap >= 0) {
      if (gap === 0) {
        const free = this.screen.findFreeLine(18, -1);
        if (free) {
          this.screen.animateFadeText(free, "\u26a0 Gravity anomaly detected");
        }
      }
      if (gap > 200) {
        this.reset();
      } else {
        const a = PlanckProcessor.deg2rad(this.range * (gap - 100));
        const cs = 1.75 * Math.cos(a);
        const sn = 1.75 * Math.sin(a);
        this.world.setGravity(planck.Vec2(
          this.gravity.x * cs - this.gravity.y * sn,
          this.gravity.x * sn + this.gravity.y * cs).mul(1.5));
      }
    }
    return this;
  }

  private reset(): void {
    this.frame = 0;
    this.event = 300 + this.gap * Math.floor(Math.random() * this.spread);
    this.world.setGravity(this.gravity);
  }

}
