import "planck-js";
import {ModelType} from "../LevelData";
import {PlanckProcessor} from "../PlanckProcessor";
import {SVGProcessor} from "../SVGProcessor";
import {SVGSupport} from "../SVGSupport";
import {ModelBase} from "./ModelBase";

/**
 * A box.
 */
export class Box extends ModelBase {

  private count: number;

  /**
   * Creates the box.
   * @param hitCount the number of hits before the box is destroyed
   * @param svg the SVG representation
   * @param body the planck representation
   */
  constructor(hitCount: number, svg: SVGElement, body: planck.Body) {
    super(body, svg, ModelType.BOX);
    this.count = hitCount;
  }

  /**
   * @inheritdoc
   */
  public step(frame: number): void {
    SVGSupport.updatePosition(this.svg, this.body);
  }

  /**
   * @inheritdoc
   */
  public destroy(world: planck.World, processor: PlanckProcessor): void {
    processor.explode(this, ModelType.BOX);
    super.destroy(world, processor);
  }

  /**
   * @inheritdoc
   */
  public terminated(): boolean {
    return this.count === 0;
  }

  /**
   * Records a hit on the box. If the hit count is reached,
   * the box terminates.
   */
  public hit(): void {
    if (this.count > 0) {
      this.count--;
    }
  }

}
