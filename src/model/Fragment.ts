import "planck-js";
import {ModelType} from "../LevelData";
import {SVGProcessor} from "../SVGProcessor";
import {SVGSupport} from "../SVGSupport";
import {ModelBase} from "./ModelBase";

/**
 * An explosion fragment.
 */
export class Fragment extends ModelBase {

  private timer: number;

  /**
   * Creates the fragment.
   * @param svg the SVG representation
   * @param body the planck representation
   */
  constructor(svg: SVGElement, body: planck.Body) {
    super(body, svg, ModelType.FRAGMENT);
    this.timer = 115;
  }

  /**
   * @inheritdoc
   */
  public step(frame: number): void {
    SVGSupport.updatePosition(this.svg, this.body);
    this.timer--;
  }

  /**
   * @inheritdoc
   */
  public terminated(): boolean {
    return this.timer === 0;
  }

}
