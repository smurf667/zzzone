import "planck-js";
import {ModelType} from "../LevelData";
import {SVGProcessor} from "../SVGProcessor";
import {SVGSupport} from "../SVGSupport";
import {ModelBase} from "./ModelBase";

/**
 * A bullet. Some might call it a photon torpedo :-)
 */
export class Bullet extends ModelBase {

  private inactive: boolean;

  /**
   * Creates the photon torpedo.
   * @param svg the SVG representation
   * @param body the planck representation
   */
  constructor(svg: SVGElement, body: planck.Body) {
    super(body, svg, ModelType.BULLET);
    this.inactive = false;
  }

  /**
   * Records that the bullet hit something.
   */
  public hit(): void {
    this.inactive = true;
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
  public terminated(): boolean {
    return this.inactive;
  }

}
