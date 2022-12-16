import {Step} from "../Step";
import {SVGSupport} from "../SVGSupport";
import {Finalizer} from "./Finalizer";

export class BackgroundText implements Step {

  private readonly text: string;
  private readonly target: number[];
  private readonly codes: number[];
  private readonly next: Step;
  private parent: SVGElement;
  private group: SVGElement;
  private svgText: SVGElement;
  private fade: SVGElement;
  private frame: number;
  private delay: number;

  constructor(text: string, parent: SVGElement, next?: () => void) {
    this.text = text;
    this.next = next ? new Finalizer(next) : undefined;
    this.parent = parent;
    this.target = [];
    for (const c of text) {
      this.target.push(c.charCodeAt(0));
    }
    this.codes = [];
    while (this.codes.length < text.length) {
      this.codes.push(65 + Math.round(57 * Math.random()));
    }
    this.frame = - 50 * Math.round(Math.random() * 4);
    this.delay = 0;
    this.group = SVGSupport.createElement("g");
    this.parent.appendChild(this.group);
  }

  /**
   * {@inheritDoc}
   */
  public perform(): Step {
    this.frame++;
    if (this.frame < 1) {
      return this;
    }
    if (this.frame === 1) {
      this.init();
    }
    const str = this.codes.reduce((acc, c) => `${acc}${String.fromCharCode(c)}`, "");
    this.svgText.textContent = str;
    if (str === this.text) {
      if (this.delay > 0) {
        if (--this.delay === 0) {
          SVGSupport.removeElement(this.group);
          return this.next;
        } else if (this.delay === 100) {
          SVGSupport.removeElement(this.fade);
          this.fade = this.fader("0.5;0");
          this.group.appendChild(this.fade);
          SVGSupport.startAnimation(this.fade);
        }
      } else {
        this.delay = 250 + 3 * this.text.length;
      }
      return this;
    } else if (this.frame % 2 === 0) {
      for (let i = this.codes.length; --i >= 0; ) {
        const offset = Math.sign(this.target[i] - this.codes[i]);
        if (offset === 0 && this.frame < 80) {
          this.codes[i] = 65 + Math.round(57 * Math.random());
        } else {
          this.codes[i] += offset;
        }
      }
    }
    return this;
  }

  private init(): void {
    const direction = Math.sign(Math.random() - 0.5);
    this.svgText = SVGSupport.createElement("text", {
      x: Math.round(Math.random() * 384) - direction * this.target.length,
      y: Math.round(Math.random() * 576),
    });
    this.group.appendChild(this.svgText);
    const anim = SVGSupport.createElement("animateTransform", {
      attributeName: "transform",
      attributeType: "XML",
      by: `${(256 + Math.round(Math.random() * 128)) * direction} 0`,
      dur: "20s",
      repeatCount: "indefinite",
      type: "translate",
    });
    this.group.appendChild(anim);
    this.fade = this.fader("0;0.5");
    this.group.appendChild(this.fade);
    SVGSupport.startAnimation(this.fade);
    SVGSupport.startAnimation(anim);
  }

  private fader(values: string): SVGElement {
    return SVGSupport.createElement("animate", {
      attributeName: "opacity",
      dur: "1s",
      fill: "freeze",
      repeatCount: 1,
      values,
    });
  }
}
