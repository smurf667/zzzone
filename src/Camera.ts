import "planck-js";
import {Dimension} from "./LevelData";
import {ModelInfo} from "./Model";
import {SVGProcessor} from "./SVGProcessor";
import {SVGSupport} from "./SVGSupport";

/**
 * Camera for the SVG element, focusing on one element.
 */
export class Camera {

  public static readonly VIEW_WIDTH = 768;
  public static readonly VIEW_HEIGHT = 576;

  /** the zoom level (1 == 100%, 2 == 200%, ...) */
  public zoom: number;

  private readonly svg: SVGElement;
  private readonly internalOffset: planck.Vec2;
  private body: planck.Body;
  private oldCenter: planck.Vec2;
  private transition: number;
  private forcedCenter: planck.Vec2;
  private topLeft: planck.Vec2;

  /**
   * Creates the camera.
   * @param svgRoot the SVG the camera operates on
   * @param zoom the initial zoom factor
   */
  constructor(svgRoot: SVGElement, zoom: number) {
    this.svg = svgRoot;
    this.internalOffset = planck.Vec2(Camera.VIEW_WIDTH, Camera.VIEW_HEIGHT).mul(0.5);
    this.zoom = zoom;
    this.forcedCenter = planck.Vec2.zero();
  }

  /**
   * Sets the body the camera should follow.
   * @param body the body to follow
   */
  public follow(body: planck.Body): void {
    if (this.body) {
      this.oldCenter = this.body.getWorldCenter();
      this.transition = 100;
    }
    this.body = body;
  }

  /**
   * Updates the camera.
   */
  public update(): void {
    let center = this.body ? this.body.getWorldCenter() : this.forcedCenter;
    if (this.oldCenter) {
      if (--this.transition > 0) {
        center = planck.Vec2(this.oldCenter)
          .add(planck.Vec2(center).sub(this.oldCenter).mul(1 - this.transition / 100));
      } else {
        this.oldCenter = undefined;
      }
    }
    this.topLeft = planck.Vec2(center).mul(SVGProcessor.SCALE * this.zoom);
    this.topLeft.y = -this.topLeft.y;
    this.topLeft.sub(this.internalOffset).mul(1 / this.zoom);
    const z = planck.Vec2(this.internalOffset).mul(2 / this.zoom);
    const viewBox = `${this.topLeft.x} ${this.topLeft.y} ${z.x} ${z.y}`;
    if (this.svg.getAttribute("viewBox") !== viewBox) {
      SVGSupport.setAttributes(this.svg, { viewBox });
    }
  }

  /**
   * Returns the forced camera position, i.e. the camera position
   * if it is not following a body.
   * @returns the forced position - this is a modifiable object!
   */
  public center(): planck.Vec2 {
    return this.forcedCenter;
  }

  /**
   * Returns the top left corner of the camera view port.
   * @returns the top left corner of the camera view port.
   */
  public offset(): planck.Vec2 {
    return this.topLeft;
  }

}
