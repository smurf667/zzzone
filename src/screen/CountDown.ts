import {Sfx, Sound} from "../Sfx";
import {Step} from "../Step";
import {SVGSupport} from "../SVGSupport";

export class CountDown implements Step {

  private readonly next: Step;
  private readonly root: SVGElement;
  private readonly text: SVGElement;
  private readonly sound: Sound;
  private zoom: number;
  private fading: boolean;

  constructor(root: SVGElement, time: number, next?: Step) {
    this.next = next;
    this.zoom = 8;
    this.fading = false;
    this.root = root;
    this.text = SVGSupport.createElement("g", {
      "font-family": "Roboto Mono, Sans-Serif",
      "font-size": "128px",
      "transform": `translate(384 288) scale(${this.zoom} ${this.zoom})`,
    });
    const num = SVGSupport.createElement("text", {
      "fill": "#12c812",
      "text-anchor": "middle",
      "x": 0,
      "y": 48,
    });
    num.textContent = time.toString();
    switch (time) {
    case 1:
      this.sound = Sound.COUNT1;
      break;
    case 2:
      this.sound = Sound.COUNT2;
      break;
    case 3:
      this.sound = Sound.COUNT3;
      break;
    default:
      break;
    }
    const anim = SVGSupport.createElement("animate", {
      attributeName: "opacity",
      dur: "1s",
      fill: "freeze",
      repeatCount: 1,
      values: "1;1;0",
    });
    this.text.appendChild(num);
    this.text.appendChild(anim);
  }

  /**
   * {@inheritDoc
   */
  public perform(): Step {
    if (!this.fading) {
      this.fading = true;
      const anim = SVGSupport.createElement("animate", {
        attributeName: "opacity",
        dur: "1s",
        fill: "freeze",
        repeatCount: 1,
        values: "1;0",
      });
      this.text.appendChild(anim);
      this.root.appendChild(this.text);
      SVGSupport.startAnimation(anim);
      if (this.sound) {
        Sfx.play(this.sound);
      }
    }
    if (this.zoom > 0.5) {
      this.zoom -= 0.2;
      this.text.setAttributeNS(null, "transform", `translate(384 288) scale(${this.zoom} ${this.zoom})`);
      return this;
    }
    SVGSupport.removeElement(this.text);
    return this.next;
  }

}
