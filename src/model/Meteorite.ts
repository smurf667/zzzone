import "planck-js";
import {ModelType} from "../LevelData";
import {PlanckProcessor} from "../PlanckProcessor";
import {SVGSupport} from "../SVGSupport";
import {ModelBase} from "./ModelBase";

/**
 * A dinosaur killer.
 */
export class Meteorite extends ModelBase {

  private readonly r: number;
  private count: number;
  private delta: number;

  /**
   * Creates the meteorite.
   *
   * @param svg the SVG representation
   * @param body the planck representation
   * @param radius the radius of the meteorite
   */
  constructor(svg: SVGElement, body: planck.Body, radius: number) {
    super(body, svg, ModelType.METEORITE);
    this.r = radius;
    this.count = 20;
    this.delta = 0;
  }

  /**
   * @inheritdoc
   */
  public step(): void {
    SVGSupport.updatePosition(this.svg, this.body);
    this.count -= this.delta;
    if (this.count === 0) {
      this.delta = 0;
    }
  }

  /**
   * @inheritdoc
   */
  public destroy(world: planck.World, processor: PlanckProcessor): void {
    processor.explode(this, ModelType.METEORITE);
    super.destroy(world, processor);
  }

  /**
   * @inheritdoc
   */
  public terminated(): boolean {
    return this.count === 0;
  }

  /**
   * Returns the radius of the meteorite.
   *
   * @returns the radius of the meteorite.
   */
  public radius(): number {
    return this.r;
  }

  /**
   * Records a collision.
   *
   * @param explode flag to indicate whether to explode right away
   */
  public hit(explode?: boolean) {
    if (explode) {
      this.count = 0;
      this.delta = 0;
    } else {
      this.delta = 1;
    }
  }

}
