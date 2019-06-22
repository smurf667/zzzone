import "planck-js";
import {Camera} from "./Camera";
import {Gauge} from "./Gauge";
import {LevelData} from "./LevelData";
import {ModelType} from "./LevelData";
import {Menu} from "./Menu";
import {Model} from "./Model";
import {Box} from "./model/Box";
import {Bullet} from "./model/Bullet";
import {Sensor} from "./model/Sensor";
import {PlanckProcessor} from "./PlanckProcessor";
import {Screen} from "./Screen";
import {Sfx} from "./Sfx";
import {Step} from "./Step";
import {SVGProcessor} from "./SVGProcessor";
import {SVGSupport} from "./SVGSupport";

/**
 * Main entry point into the game.
 * This bootstraps the required HTML DOM elements and SVG elements.
 * The current level code will be put into the browser address bar;
 * in debug mode prefixing the code with 'd' will allow to debug
 * the planck model of the level as well.
 */
export class Game {

  private time: number;
  private next: Step;

  /**
   * Creates the game in the given window.
   */
  constructor() {
    LevelData.init();
    SVGProcessor.init();
    Gauge.init();
    const keys: Map<string, boolean> = new Map();
    const screen = new Screen();
    const panel = document.querySelector("#panel") as HTMLElement;
    panel.appendChild(screen.root());
    const menu = new Menu(screen, keys);
    const game = this;
    const keyHandler = (event) => {
      const keyDown = event.type === "keydown";
      // see https://keycode.info/
      keys.set(event.key, keyDown);
      menu.keyEvent(event);
      if (!keyDown && event.key === "m") {
        Sfx.toggleMute();
      }
    };
    panel.onkeyup = keyHandler;
    panel.onkeydown = keyHandler;
    panel.focus();
    if (process.env.NODE_ENV !== "production") {
      // debug mode: #d<level-code>
      if (window.location.hash && window.location.hash.startsWith("d", 1)) {
        const list = LevelData.available(window.location.hash.substr(2));
        const testLevelData = list.length > 0 ? list[list.length - 1] : LevelData.first();
        const svgProcessor = new SVGProcessor();
        document.querySelector("#panel").appendChild(svgProcessor.root());

        planck.testbed((testbed) => {
          const world = planck.World();
          const pp = new PlanckProcessor(world, svgProcessor,
            new Camera(svgProcessor.root(), testLevelData.zoom()), screen);
          pp.initializeLevel(testLevelData);
          let shuttleBody = world.getBodyList();
          while (shuttleBody) {
            const data = shuttleBody.getUserData() as any;
            if (data && data.modelType === ModelType.SHUTTLE) {
              break;
            }
            shuttleBody = shuttleBody.getNext();
          }
          world.on("begin-contact", (contact) => pp.handleContact(contact));
          let destroyJoint = false;
          let showBeam = false;
          testbed.step = (dt: number, t: number) => {
            pp.step();
            if (destroyJoint) {
              destroyJoint = false;
              pp.removeRope();
            }
            if (showBeam) {
              pp.activateTractorBeam();
            }
            testbed.x = shuttleBody.getWorldCenter().x;
            testbed.y = -shuttleBody.getWorldCenter().y;
          };
          testbed.keyup = (code, char) => {
            showBeam = false;
          };
          testbed.keydown = (code, char) => {
            switch (code) {
            case 32: // space
              showBeam = true;
              break;
            case 37:
              pp.turnLeft(3);
              break;
            case 38: // up
              pp.accelerate();
              break;
            case 39: // right
              pp.turnRight(3);
              break;
            case 40: // down
              break;
            case 68: // d = erase svgs
              SVGSupport.removeElement(screen.root());
              SVGSupport.removeElement(svgProcessor.root());
              break;
            case 69: // e = erase testbed canvas
              const hide = document.querySelector("canvas") as HTMLElement;
              hide.parentElement.removeChild(hide);
              break;
            case 70: // 'f'
              pp.shoot();
              break;
            case 72: // 'h' - remove connection
              destroyJoint = true;
              break;
            case 81: // 'q' self-destruct
              pp.selfDestruct();
              break;
            default:
              break;
            }
          };
          return world;
        });
        return;
      }
    }
    this.run(menu);
  }

  private run(step: Step): void {
    this.next = step;
    const stepper = (timestamp: number) => {
      if (this.step(timestamp)) {
        window.requestAnimationFrame(stepper);
      }
    };
    window.requestAnimationFrame(stepper);
  }

  private step(timestamp?: number): Step {
    if (!this.time) {
      this.time = timestamp;
    }
    const delta = Math.min((timestamp - this.time), 250);
    // one step no shorter than 40ms
    if (delta >= 140) {
      this.next = this.next.perform();
    }
    return this.next;
  }

}
