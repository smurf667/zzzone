import "planck-js";
import {SVGSupport} from "./SVGSupport";

/**
 * A gauge to display a value.
 */
export class Gauge {

  public static init() {
    Gauge.COLORS.push(...Gauge.interpolate("c81212", "f8f812", 30));
    Gauge.COLORS.push(...Gauge.interpolate("f8f812", "12c812", 50));
    Gauge.COLORS.push(...Gauge.interpolate("12c812", "12f812", 21));
  }

  private static readonly RADIUS: number = 35;
  private static readonly COLORS: string[] = [];

  private static interpolate(from: string, to: string, steps: number): string[] {
    const result = [];
    const start = to.match(/(.{2})/g).map((str) => parseInt(str, 16));
    const end = from.match(/(.{2})/g).map((str) => parseInt(str, 16));
    let a = 0.0;
    const hex = (index, alpha, factor) => {
      const str = Math.round(start[index] * alpha + factor * end[index]).toString(16);
      if (str.length === 2) {
        return str;
      } else {
        return "0" + str;
      }
    };
    for (let i = 0; i < steps; i++) {
      const f = 1 - a;
      result.push(`#${hex(0, a, f)}${hex(1, a, f)}${hex(2, a, f)}`);
      a += 1.0 / steps;
    }
    return result;
  }

  private readonly group: SVGElement;
  private readonly band: SVGElement;
  private readonly max: number;
  private readonly len: number;
  private current: number;
  private target: number;

  /**
   * Creates the gauge.
   * @param x position
   * @param y position
   * @param title display title
   * @param max maximum value
   * @param initial initial value
   */
  constructor(x: number, y: number, title: string, max: number, initial: number) {
    this.max = max;
    this.current = 0;
    this.target = Math.round(100 * initial / max);
    this.len = Math.round(Math.PI * Gauge.RADIUS);
    this.group = SVGSupport.createElement("g", {
      "fill": "#12c812",
      "font-family": "Roboto Mono, Sans-Serif",
      "font-size": "12px",
      "transform": `translate(${x} ${y})`,
    });
    this.group.appendChild(SVGSupport.createElement("circle", {
      "cx": 0,
      "cy": 0,
      "fill": "none",
      "opacity": 0.7,
      "r": Gauge.RADIUS,
      "stroke": "#027402",
      "stroke-dasharray": `${this.len}, ${2 * this.len}`,
      "stroke-width": 15,
      "transform": "rotate(180)",
    }));
    this.band = SVGSupport.createElement("circle", {
      "cx": 0,
      "cy": 0,
      "fill": "transparent",
      "opacity": 0.7,
      "r": Gauge.RADIUS,
      "stroke": "#027402",
      "stroke-dasharray": `0, ${2 * this.len}`,
      "stroke-width": 16,
      "transform": "rotate(180)",
    });
    this.group.appendChild(this.band);
    const info = SVGSupport.createElement("text", {
      "text-anchor": "middle",
      "x": 0,
      "y": -2,
    });
    info.textContent = title;
    this.group.append(info);
  }

  /**
   * Performs a single frame step
   */
  public step(): void {
    if (this.current !== this.target) {
      this.current += Math.sign(this.target - this.current);
      this.band.setAttributeNS(
        null,
        "stroke-dasharray",
        `${Math.round(this.len * this.current / 100)}, ${2 * this.len}`);
      this.band.setAttributeNS(null, "stroke", Gauge.COLORS[this.current]);
    }
  }

  /**
   * Sets the value of the gauge.
   * @param update the value to display
   */
  public setValue(update: number): void {
    this.target = Math.min(Math.round(Math.max(0, update) * 100 / this.max), 100);
  }

  /**
   * Returns the root SVG element of the gauge.
   * @returns the root SVG element of the gauge.
   */
  public root(): SVGElement {
    return this.group;
  }

}
