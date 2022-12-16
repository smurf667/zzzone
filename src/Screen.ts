import "planck-js";
import {Gauge} from "./Gauge";
import {AnimatedText} from "./screen/AnimatedText";
import {BackgroundText} from "./screen/BackgroundText";
import {CountDown} from "./screen/CountDown";
import {Finalizer} from "./screen/Finalizer";
import {LineFader} from "./screen/LineFader";
import {Step} from "./Step";
import {SVGProcessor} from "./SVGProcessor";
import {SVGSupport} from "./SVGSupport";

/**
 * Non-moving display SVG, to be overlaid with the game display and
 * used for displaying text.
 */
export class Screen {

  private readonly svg: SVGElement;
  private readonly backgroundLayer: SVGElement;
  private readonly helpLayer: SVGElement;
  private readonly textLayer: SVGElement;
  private readonly gaugeLayer: SVGElement;
  private readonly lines: SVGElement[];
  private steps: Step[];
  private gauges: Gauge[];
  private time: SVGElement;
  private help: SVGElement;

  /**
   * Creates the screen.
   */
  constructor() {
    this.svg = SVGSupport.createElement("svg", {
      height: SVGProcessor.HEIGHT,
      style: "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 24; cursor: none;",
      viewBox: "0 0 768 576",
      width: SVGProcessor.WIDTH,
    });
    this.lines = [];
    this.steps = [];
    this.initDefs();
    this.backgroundLayer = this.initTextLayer({
      "fill": "#00a000",
      "font-family": "Roboto Mono, Sans-Serif",
      "font-size": "20px",
      "stroke": "transparent",
    });
    this.svg.appendChild(this.backgroundLayer);
    this.textLayer = this.initTextLayer({
      "fill": "#12c812",
      "font-family": "Roboto Mono, Sans-Serif",
      "font-size": "24px",
      "stroke": "transparent",
    }, true);
    this.svg.appendChild(this.textLayer);
    this.gaugeLayer = SVGSupport.createElement("g");
    this.svg.appendChild(this.gaugeLayer);
    this.helpLayer = this.initTextLayer({
      "fill": "#fff",
      "font-family": "Roboto Mono, Sans-Serif",
      "font-size": "14px",
      "opacity": 0,
      "stroke": "transparent",
    }, false);
    let y = SVGProcessor.HEIGHT - 256;
    for (const text of [
      "turn ........... \u25c0\u25b6 ",
      "accelerate ..... \u25b2",
      "tractor beam ... \u2423",
      "remove rope .... \u24e1",
      "shoot .......... ctrl",
      "self-destruct .. \u241b/\u24e0 ",
      "toggle sound ... \u24dc ",
    ]) {
      const textSvg = SVGSupport.createElement("text", { x: SVGProcessor.WIDTH - 380, y });
      textSvg.textContent = text;
      this.helpLayer.appendChild(textSvg);
      y += 14;
    }
    this.svg.appendChild(this.helpLayer);
  }

  /**
   * Returns the screen SVG root element.
   *
   * @returns the screen SVG root element.
   */
  public root(): SVGElement {
    return this.svg;
  }

  /**
   * Steps a single frame for the screen.
   */
  public step(): void {
    const next: Step[] = [];
    for (const step of this.steps) {
      const result = step.perform();
      if (result) {
        next.push(result);
      }
    }
    this.steps = next;
    if (this.gauges) {
      for (const gauge of this.gauges) {
        gauge.step();
      }
    }
  }

  /**
   * Underlines a text line.
   *
   * @param line the index of the text line
   * @param flag whether to underline or not
   */
  public underline(line: number, flag: boolean): void {
    this.lines[line].setAttributeNS(null, "text-decoration", flag ? "underline" : "inherit");
  }

  /**
   * Shows a flash on the given line.
   *
   * @param start the index of the text line
   */
  public flash(start: number): void {
    const line = this.lines[start];
    if (line) {
      const anim = SVGSupport.createElement("animate", {
        attributeName: "fill",
        dur: "0.3s",
        fill: "freeze",
        repeatCount: 1,
        values: "white;#12c812",
      });
      line.appendChild(anim);
      SVGSupport.startAnimation(anim);
    }
  }

  /**
   * Clears all animation steps.
   */
  public clearSteps(): void {
    this.steps = [];
    SVGSupport.removeChildren(this.backgroundLayer);
  }

  /**
   * Clears all text.
   */
  public clearText(): void {
    for (const line of this.lines) {
      line.setAttributeNS(null, "text-decoration", "inherit");
      SVGSupport.removeChildren(line);
    }
  }

  /**
   * Clears time countdown display.
   */
  public clearTime(): void {
    if (this.time) {
      SVGSupport.removeElement(this.time);
      this.time = undefined;
    }
  }

  /**
   * Clears the screen.
   */
  public clearAll(): void {
    this.clearGauges();
    this.clearSteps();
    this.clearText();
    this.clearTime();
  }

  /**
   * Clears the gauges.
   */
  public clearGauges(): void {
    SVGSupport.removeChildren(this.gaugeLayer);
    this.gauges = undefined;
  }

  /**
   * Adds gauges to the screen
   *
   * @param gauges the gauges to add.
   */
  public addGauges(gauges: Gauge[]): void {
    for (const gauge of gauges) {
      this.gaugeLayer.appendChild(gauge.root());
    }
    this.gauges = gauges;
  }

  /**
   * Sets a time countdown display
   *
   * @param time the time to display
   * @param warn whether to highlight the time
   */
  public setTime(time: string, warn?: boolean): void {
    if (!this.time) {
      this.time = SVGSupport.createElement("text", {
        "font-family": "Roboto Mono, Sans-Serif",
        "font-size": "11px",
        "stroke": "transparent",
        "text-anchor": "end",
        "x": 752,
        "y": 24,
      });
      this.svg.appendChild(this.time);
    }
    this.time.textContent = time;
    this.time.setAttributeNS(null, "fill", warn ? "#f28822" : "#12c812");
  }

  /**
   * Sets text on the screen
   *
   * @param start the index of the line where the text is to be placed
   * @param text the text to show
   * @param underline whether to underline the text or not
   */
  public setText(start: number, text: string, underline?: boolean): void {
    const line = this.lines[start];
    if (line) {
      SVGSupport.removeChildren(line);
      const textSvg = SVGSupport.createElement("text", { x: 20, y: 20 });
      textSvg.textContent = text;
      line.appendChild(textSvg);
      this.underline(start, underline);
    }
  }

  /**
   * Animates the given texts.
   *
   * @param start the index of the starting line
   * @param delay the duration the text should be shown
   * @param texts the texts to show
   */
  public animateTexts(start: number, delay: number, ...texts: string[]): void {
    this.animateTextsAndThen(undefined, start, delay, ...texts);
  }

  /**
   * Animates the given texts and performs some action afterwards.
   *
   * @param onEnd an action to perform after the texts were shown
   * @param start the index of the starting line
   * @param delay the duration the text should be shown
   * @param texts the texts to show
   */
  public animateTextsAndThen(onEnd: () => void, start: number, delay: number, ...texts: string[]): void {
    let last = onEnd ? new Finalizer(onEnd) : undefined;
    let first;
    for (let i = texts.length; --i >= 0; ) {
      const line = this.lines[start + i];
      if (line) {
        first = new AnimatedText(this.lines[start + i], texts[i], delay, last);
        last = first;
      }
    }
    this.steps.push(first);
  }

  /**
   * Places the given background text
   *
   * @param text the text to show
   * @param onEnd the action to perform afterwards
   */
  public backgroundText(text: string, onEnd?: () => void): void {
    this.steps.push(new BackgroundText(text, this.backgroundLayer, onEnd));
  }

  /**
   * Animates a fading text
   *
   * @param start the index of the starting line
   * @param text the text to show
   * @param delay the duration the text should be shown
   */
  public animateFadeText(start: number, text: string, delay?: number): void {
    this.animateFadeTextAndThen(undefined, start, text, delay);
  }

  /**
   * Animates a fading text and performs some action afterwards.
   *
   * @param onEnd an action to perform after the text was shown
   * @param start the index of the starting line
   * @param text the text to show
   * @param delay the duration the text should be shown
   */
  public animateFadeTextAndThen(onEnd: () => void, start: number, text: string, delay?: number): void {
    const line = this.lines[this.findFreeLine(start)];
    if (text && line) {
      this.steps.push(new AnimatedText(
        line,
        text,
        delay,
        new LineFader(line, 0, onEnd ? new Finalizer(onEnd) : undefined)));
    }
  }

  /**
   * Fades the given lines and then performs some action
   *
   * @param onEnd the action to perform afterwards
   * @param lines the line indices to fade
   */
  public fadeLinesAndThen(onEnd: () => void, lines: number[]): void {
    for (const start of lines) {
      if (this.lines[start].hasChildNodes()) {
        if (onEnd) {
          this.steps.push(new LineFader(this.lines[start], 0, new Finalizer(onEnd)));
          onEnd = undefined;
        } else {
          this.steps.push(new LineFader(this.lines[start], 0));
        }
      }
    }
  }

  /**
   * Displays a 3..2..1 countdown and performs some action afterwards.
   *
   * @param start the number for the countdown start
   * @param onEnd the action to perform afterwards
   */
  public countDown(start: number, onEnd?: () => void): void {
    let last = onEnd ? new Finalizer(onEnd) : undefined;
    let first;
    for (let i = 1; i <= start; i++) {
      first = new CountDown(this.textLayer, i, last);
      last = first;
    }
    this.steps.push(first);
  }

  /**
   * Finds a free line to display text on
   *
   * @param start the starting index
   * @param direction the direction to look for a free line (1/-1)
   * @return a free line index, if any
   */
  public findFreeLine(start: number, direction?: number): number {
    const d = direction || 1;
    let result = start;
    while (this.lines[result]) {
      if (!this.lines[result].hasChildNodes()) {
        return result;
      }
      result += d;
    }
    return undefined;
  }

  /**
   * Shows the in-level help.
   */
  public showHelp(): void {
    if (!this.help) {
      this.help = SVGSupport.createElement("animate", {
        attributeName: "opacity",
        dur: "6s",
        fill: "freeze",
        values: "0;0;1;1;1;1;1;1;1;1;1;0;0;",
      });
      this.helpLayer.appendChild(this.help);
    }
    SVGSupport.startAnimation(this.help);
  }

  private initDefs(): void {
    const defs = SVGSupport.createElement("defs");

    const style = SVGSupport.createElement("style");
    style.textContent = "@import url(\"https://fonts.googleapis.com/css?family=Roboto+Mono:bold\");";
    defs.appendChild(style);

    const glow = SVGSupport.createElement("filter", {
      height: "200%",
      id: "glow",
      width: "200%",
      x: "-50%",
      y: "-50%",
    });
    glow.appendChild(SVGSupport.createElement("filter", {
      edgeMode: "none",
      in: "SourceGraphic",
      result: "blurred",
      stdDeviation: "2",
    }));

    const merge = SVGSupport.createElement("feMerge");
    merge.appendChild(SVGSupport.createElement("feMergeNode", { in: "blurred" }));
    merge.appendChild(SVGSupport.createElement("feMergeNode", { in: "blurred" }));
    glow.appendChild(merge);
    defs.appendChild(glow);

    const flashBar = SVGSupport.createElement("g", {
      fill: "#bfc",
      id: "flashBar",
      opacity: 1,
      stroke: "transparent",
    });
    flashBar.appendChild(SVGSupport.createElement("path", { d: "M 32 6 L 256 6 L 736 12 L 256 18 L 32 18 Z" }));
    defs.appendChild(flashBar);
    this.svg.appendChild(defs);
  }

  private initTextLayer(atts: any, lines?: boolean): SVGElement {
    const result = SVGSupport.createElement("g", atts);
    if (lines) {
      for (let i = 0; i < 20; i++) {
        this.lines.push(SVGSupport.createElement("g", { id: `l${i}`, transform: `translate(0 ${(i + 1) * 24})` }));
        result.appendChild(this.lines[i]);
      }
    }
    return result;
  }

}
