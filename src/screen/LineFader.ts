import {Step} from "../Step";
import {SVGSupport} from "../SVGSupport";

export class LineFader implements Step {

  private readonly line: SVGElement;
  private readonly delay: number;
  private readonly next: Step;
  private frame: number;

  constructor(line: SVGElement, frameDelay: number, next?: Step) {
    this.line = line;
    this.delay = frameDelay;
    this.next = next;
    this.frame = 0;
  }

  /**
   * {@inheritDoc
   */
  public perform(): Step {
    if (this.frame === this.delay) {
      const anim = SVGSupport.createElement("animate", {
        attributeName: "opacity",
        dur: "1s",
        fill: "freeze",
        repeatCount: 1,
        values: "1;0",
      });
      this.line.appendChild(anim);
      SVGSupport.startAnimation(anim);
    }
    if (++this.frame === 35 + this.delay) {
      SVGSupport.removeChildren(this.line);
      this.line.setAttributeNS(null, "opacity", "1");
      return this.next;
    }
    return this;
  }

}
