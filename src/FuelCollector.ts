import "planck-js";
import {Collector} from "./LevelData";
import {PlanckProcessor} from "./PlanckProcessor";
import {SVGSupport} from "./SVGSupport";

/**
 * The fuel collector. The player can dump fuel
 * pods into it to fuel the rocket for launch.
 */
export class FuelCollector {

  private readonly container: SVGElement;
  private readonly waves: SVGElement[];
  private fuelCount: number;

  /**
   * Creates the collector.
   */
  constructor(data: Collector, landscape: SVGElement) {
    const angle = data.angle ? data.angle : 0;
    this.container = SVGSupport.createElement("g", {
      fill: "url(#collectorGradient)",
      id: "collector",
      stroke: "transparent",
      transform: `translate(${data.position.x}, ${data.position.y}) rotate(${angle})`,
    });
    this.fuelCount = 0;
    this.waves = [];
    for (let i = 0; i < 2; i++) {
      const path = SVGSupport.createElement("path", { d: "", opacity: "0.7" });
      this.waves.push(path);
      this.container.appendChild(path);
    }
    landscape.appendChild(this.container);
    this.step(0);
  }

  /**
   * Returns the root SVG element of the collector.
   *
   * @returns the root SVG element of the collector.
   */
  public root(): SVGElement {
    return this.container;
  }

  /**
   * Performs a single frame step
   *
   * @param frame the frame number
   */
  public step(frame: number): void {
    const angle = PlanckProcessor.deg2rad(frame);
    for (let i = 0; i < this.waves.length; i++) {
      const amplitude = 8 * Math.sin(angle + i);
      SVGSupport.setAttributes(this.waves[i], { d: `M -20 0 Q -10 ${amplitude}, 0 0 T 20 0 L 20 30 L -20 30 Z`});
    }
  }

}
