import "planck-js";
import {PlanckProcessor} from "./PlanckProcessor";
import {SVGProcessor} from "./SVGProcessor";

/**
 * Utility for creation and manipulation of SVG elements.
 * This also establishes the different layers on the root SVG element
 * the game uses for rendering.
 */
export class SVGSupport {

  /**
   * Creates an SVG element with the given name.
   *
   * @param name the name of the SVG element
   * @param attrs attributes of the element, optional
   */
  public static createElement(name: string, attrs?: object): SVGElement {
    const result = document.createElementNS(SVGSupport.SVG_NS, name);
    if (attrs) {
      this.setAttributes(result, attrs);
    }
    return result;
  }

  /**
   * Removes the given element from its parent.
   *
   * @param element the element to remove
   */
  public static removeElement(element: SVGElement): void {
    if (element.parentElement) {
      element.parentElement.removeChild(element);
    }
  }

  /**
   * Deletes all children for the given element.
   *
   * @param element the element whose children to delete
   */
  public static removeChildren(element: SVGElement): void {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  /**
   * Sets attributes for the given SVG element
   *
   * @param element the element to set the attributes on
   * @param attrs the attributes to set
   */
  public static setAttributes(element: SVGElement, attrs: object): void {
    for (const v in attrs) {
      if (attrs.hasOwnProperty(v)) {
        element.setAttributeNS(null, v, attrs[v] as string);
      }
    }
  }

  /**
   * Updates the SVG representation of a planck body.
   *
   * @param element the representation to update
   * @param body the body supplying the data
   */
  public static updatePosition(element: SVGElement, body: planck.Body): void {
    const position = body.getPosition();
    element.setAttributeNS(null, "transform",
      // eslint-disable-next-line max-len
      `translate(${position.x * SVGProcessor.SCALE}, ${position.y * -SVGProcessor.SCALE}) rotate(${-PlanckProcessor.rad2deg(body.getAngle())})`);
  }

  /**
   * Creates an SVG path element
   *
   * @param group the group to append to
   * @param coordinates the coordinates of the path
   * @param attributes path attributes, if any
   */
  public static path(group: SVGElement, coordinates: number[][], attributes?: any): SVGElement {
    const d = coordinates.reduce((acc, coordinate, i) => i === 0
      ? `M ${coordinate[0]},${coordinate[1]}`
      : `${acc} L ${coordinate[0]},${coordinate[1]}`,
    "");
    const result = SVGSupport.createElement("path", { d });
    if (attributes) {
      SVGSupport.setAttributes(result, attributes);
    }
    if (group) {
      group.appendChild(result);
    }
    return result;
  }

  /**
   * Creates a closed SVG path element.
   *
   * @param group the group to append to
   * @param coordinates the coordinates of the polygon
   * @param attributes path attributes, if any
   */
  public static polygon(group: SVGElement, coordinates: number[][], attributes?: any): SVGElement {
    const d = coordinates.reduce((acc, coordinate, i) => i === 0 ?
      `M ${coordinate[0]},${coordinate[1]}` :
      `${acc} L ${coordinate[0]},${coordinate[1]}${i === coordinates.length - 1 ? " Z" : ""}`,
    "");
    const result = SVGSupport.createElement("path", { d });
    if (attributes) {
      SVGSupport.setAttributes(result, attributes);
    }
    if (group) {
      group.appendChild(result);
    }
    return result;
  }

  /**
   * Creates a bezier path (for the rope).
   *
   * @param points the control points
   */
  public static bezierPath(points: planck.Vec2[]): string {
    // inspired by https://medium.com/@francoisromain/smooth-a-svg-path-with-cubic-bezier-curves-e37b49d46c74
    const controlPoint = (current: planck.Vec2, previous: planck.Vec2, next: planck.Vec2, reverse?: boolean) => {
      const prv = previous || current;
      const nxt = next || current;
      const line = planck.Vec2(nxt).sub(prv);
      const angle = Math.atan2(line.y, line.x) + (reverse ? Math.PI : 0);
      const length = line.length() * 0.2; // 0.2 smoothing
      return [current.x + Math.cos(angle) * length, current.y + Math.sin(angle) * length];
    };
    const bezierCommand = (point, i, a) => {
      const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point);
      const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
      return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point.x},${point.y}`;
    };
    const svgPath = (all: planck.Vec2[], command): string =>
      all.reduce((acc, point, i, a) => i === 0
        ? `M ${point.x},${point.y}`
        : `${acc} ${command(point, i, a)}`
      , "");
    return svgPath(points, bezierCommand);
  }

  /**
   * Starts an animation.
   *
   * @param element the animation element to start.
   */
  public static startAnimation(element: any): void {
    element.beginElement(); // not so sure why 'any' is required here...
  }

  private static readonly SVG_NS = "http://www.w3.org/2000/svg";

}
