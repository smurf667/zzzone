import "planck-js";
import {ModelType} from "../LevelData";
import {SVGSupport} from "../SVGSupport";
import {ModelBase} from "./ModelBase";

/**
 * A station. The shuttle gets refuel and repaired here.
 */
export class Station extends ModelBase {

  private animation: SVGElement;

  /**
   * Creates the station.
   *
   * @param svg the SVG representation
   * @param body the planck representation
   */
  constructor(svg: SVGElement, body: planck.Body) {
    super(body, svg, ModelType.STATION);
  }

  /**
   * @inheritdoc
   */
  public step(): void {
    // no action required
  }

  /**
   * @inheritdoc
   */
  public terminated(): boolean {
    return false;
  }

  /**
   * Flashes the station.
   */
  public flash(): void {
    if (!this.animation) {
      this.animation = SVGSupport.createElement("animate", {
        attributeName: "stroke",
        dur: "0.5s",
        fill: "freeze",
        repeatCount: "1",
        values: "white;#22e",
      });
      this.svg.appendChild(this.animation);
    }
    SVGSupport.startAnimation(this.animation);
  }

}
