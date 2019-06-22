import texts from "./level/gameOver.json";
import {Menu, MenuInfo} from "./Menu";
import {Screen} from "./Screen";
import {Sfx} from "./Sfx";
import {Step} from "./Step";
import {SVGProcessor} from "./SVGProcessor";
import {SVGSupport} from "./SVGSupport";

type TimedEvent = () => void;

interface Star {
  x: number;
  y: number;
  z: number;
  svg: SVGElement;
}

interface Text {
  frame: number;
  start: number;
  duration: number;
  lines: string[];
}

/**
 * The ending credits... Some 3D stars with text and music.
 */
export class Credits implements Step {

  private static readonly LOOP = 5250;
  private static readonly DEPTH = 48;
  private static readonly HALF_WIDTH = SVGProcessor.WIDTH / 2;
  private static readonly HALF_HEIGHT = SVGProcessor.HEIGHT / 2;
  private static readonly COLORS = [ "#a0a0ff", "#ffa0a0", "#f8f8ff", "#fff8c2", "#fff8c2", "#fff8c2" ];

  private readonly menu: Menu;
  private readonly screen: Screen;
  private readonly keys: Map<string, boolean>;
  private readonly events: Map<number, TimedEvent>;
  private readonly music: HTMLAudioElement;
  private readonly svg: SVGElement;
  private readonly stars: Star[];
  private field: SVGElement;
  private frame: number;
  private starOpacity: number;

  /**
   * Creates the credits.
   */
  constructor(menu: Menu) {
    this.menu = menu;
    Sfx.mute(true); // sfx off
    this.svg = this.createSVG();
    this.stars = this.createStars();
    document.querySelector("#panel").appendChild(this.svg);
    const config = menu.config();
    this.keys = config.keys;
    this.screen = config.screen;
    this.screen.clearAll();
    this.frame = 0;
    this.starOpacity = 0;
    this.music = Sfx.credits();
    this.events = new Map();
    for (const text of texts as Text[]) {
      this.events.set(text.frame, () => {
        let line = text.start;
        text.lines.forEach((str) => {
          this.screen.animateFadeText(line++, str, text.duration);
        });
      });
    }
    this.events.set(Credits.LOOP - 200,
      () => this.screen.animateFadeTextAndThen(
        () => this.frame = 0, 18, "A game by Jan Engehausen, made in MMXIX AD", 150));
  }

  /**
   * {@inheritDoc}
   */
  public perform(): Step {
    if (this.keys.get(" ")) {
      this.music.pause();
      Sfx.mute(false);
      SVGSupport.removeElement(this.svg);
      return this.menu.fromLevel();
    }
    this.screen.step();
    const evt = this.events.get(this.frame++);
    if (evt) {
      evt.apply(this);
    }
    // stars
    for (const star of this.stars) {
      star.z -= 0.075;
      if (star.z <= 0) {
        star.x = this.randomRange(-64, 64);
        star.y = this.randomRange(-64, 64);
        star.z = Credits.DEPTH;
      }
      const factor = 128 / star.z;
      const zoom = (1 - star.z / Credits.DEPTH);
      SVGSupport.setAttributes(star.svg, {
        cx: star.x * factor + Credits.HALF_WIDTH,
        cy: star.y * factor + Credits.HALF_HEIGHT,
        opacity: this.starOpacity * zoom,
        r: 3.5 * zoom,
      });
    }
    if (this.starOpacity < 1) {
      this.starOpacity += 0.005;
      if (this.starOpacity > 1) {
        this.starOpacity = 1;
      }
    }
    return this;
  }

  private createSVG(): SVGElement {
    const result = SVGSupport.createElement("svg", {
      height: SVGProcessor.HEIGHT,
      style: "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 20; cursor: none;",
      width: SVGProcessor.WIDTH,
    });
    this.field = SVGSupport.createElement("g", { stroke: "transparent" });
    const anim = SVGSupport.createElement("animateTransform", {
      attributeName: "transform",
      attributeType: "XML",
      dur: "45s",
      from: `360 ${Credits.HALF_WIDTH} ${Credits.HALF_HEIGHT}`,
      repeatCount: "indefinite",
      to: `0 ${Credits.HALF_WIDTH} ${Credits.HALF_HEIGHT}`,
      type: "rotate",
    });
    this.field.appendChild(anim);
    result.appendChild(this.field);
    return result;
  }

  private createStars(): Star[] {
    const creator = () => {
      const result: Star = {
        svg: undefined,
        x: this.randomRange(-64, 64),
        y: this.randomRange(-64, 64),
        z: this.randomRange(1, Credits.DEPTH),
      };
      const star = SVGSupport.createElement("circle", {
        cx: -10240,
        cy: -10240,
        fill: Credits.COLORS[Math.round(this.randomRange(0, Credits.COLORS.length))],
        r: 0,
      });
      this.field.appendChild(star);
      result.svg = star;
      return result;
    };
    const stars = [];
    for (let i = 0; i < 192; i++) {
      stars.push(creator());
    }
    return stars;
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min - 1);
  }

}
