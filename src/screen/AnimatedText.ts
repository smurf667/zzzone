import {Sfx, Sound} from "../Sfx";
import {Step} from "../Step";
import {SVGSupport} from "../SVGSupport";

export class AnimatedText implements Step {

  private static readonly ACTIVE = "text-animation";

  private readonly text: string;
  private readonly next: Step;
  private readonly line: SVGElement;
  private textSvg: SVGElement;
  private textSpan: SVGElement;
  private textPosition: number;
  private frame: number;
  private time: number;
  private frozen: boolean;

  constructor(line: SVGElement, text: string, time: number, next?: Step) {
    this.line = line;
    this.text = text;
    this.time = time;
    this.next = next;
    this.frame = 0;
    this.frozen = false;
  }

  /**
   * {@inheritDoc
   */
  public perform(): Step {
    if (this.textSvg) {
      if (this.textSvg.parentNode !== this.line) {
        // this is orphaned, drop everything
        return undefined;
      }
      this.frame++;
      if (this.frozen) {
        return this.frame < this.time ? this : this.next;
      }
      if (this.frame % 2 === 0) {
        if (this.textSpan) {
          if (this.text.charCodeAt(this.textPosition - 1) === 32) {
            this.textSpan.innerHTML = "&nbsp;";
          } else {
            this.textSpan.textContent = this.text.charAt(this.textPosition - 1);
          }
        }
        this.animateLetter(this.text.charAt(this.textPosition++));
        if (this.textPosition >= this.text.length) {
          SVGSupport.removeChildren(this.textSvg);
          this.textSvg.textContent = this.text;
          this.frozen = true;
          return this.frame < this.time ? this : this.next;
        }
      } else if (this.textSpan) {
        let code = this.text.charCodeAt(this.textPosition) + Math.round(10 * Math.random());
        if (code < 65) {
          code += 10;
        } else if (code > 122) {
          code -= 10;
        }
        this.textSpan.textContent = String.fromCharCode(code);
      }
      return this;
    }
    return this.init();
  }

  private init(): Step {
    // clean the line
    SVGSupport.removeChildren(this.line);
    const flash = SVGSupport.createElement("use", {
      filter: "url(#glow)",
      href: "#flashBar",
    });
    const fade = SVGSupport.createElement("animate", {
      attributeName: "opacity",
      dur: "0.5s",
      fill: "freeze",
      repeatCount: 1,
      values: "0;1;1;0",
    });
    flash.appendChild(fade);
    const scale = SVGSupport.createElement("animateTransform", {
      attributeName: "transform",
      attributeType: "XML",
      dur: "0.3s",
      fill: "freeze",
      from: "1 1",
      repeatCount: 1,
      to: "0 1",
      type: "scale",
    });
    flash.appendChild(scale);
    this.line.appendChild(flash);
    this.textSvg = SVGSupport.createElement("text", { x: 20, y: 20 });
    this.textPosition = 0;
    this.line.appendChild(this.textSvg);
    SVGSupport.startAnimation(fade);
    SVGSupport.startAnimation(scale);
    Sfx.play(Sound.TEXT);
    return this;
  }

  private animateLetter(letter: string): void {
    const span = SVGSupport.createElement("tspan");
    span.textContent = letter;
    const anim = SVGSupport.createElement("animate", {
      attributeName: "fill",
      dur: "1s",
      fill: "freeze",
      repeatCount: 1,
      values: "white;#12c812",
    });
    span.appendChild(anim);
    this.textSvg.appendChild(span);
    SVGSupport.startAnimation(anim);
    this.textSpan = span;
  }

}
