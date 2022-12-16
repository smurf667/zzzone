import "planck-js";
import {Camera} from "./Camera";
import {Menu} from "./Menu";
import {PlanckProcessor} from "./PlanckProcessor";
import {Sfx, Sound} from "./Sfx";
import {Step} from "./Step";
import {SVGProcessor} from "./SVGProcessor";
import {SVGSupport} from "./SVGSupport";

/**
 * Plays a single level.
 */
export class Level implements Step {

  private readonly menu: Menu;
  private readonly svg: SVGElement;
  private readonly processor: PlanckProcessor;
  private readonly keys: Map<string, boolean>;
  private readonly upKeys: Map<string, boolean>;
  private turnKey: number;
  private accelerateSound: HTMLAudioElement;

  /**
   * Creates the level.
   *
   * @param menu the menu used to run the level from.
   */
  constructor(menu: Menu) {
    this.menu = menu;
    const world = planck.World();
    const svgProcessor = new SVGProcessor();
    this.svg = svgProcessor.root();
    this.svg.style.display = "none";
    this.upKeys = new Map();
    this.upKeys.set("Control", true);
    this.upKeys.set("h", true);
    this.upKeys.set("d", true);
    // number of frames a left/right turn key is pressed
    this.turnKey = 0;
    document.querySelector("#panel").appendChild(this.svg);
    const config = menu.config();
    this.keys = config.keys;
    this.processor = new PlanckProcessor(world, svgProcessor, new Camera(this.svg, config.data.zoom()), config.screen);
    this.processor.initializeLevel(config.data);
    world.on("begin-contact", (contact) => this.processor.handleContact(contact));
    world.on("pre-solve", (contact) => this.processor.handleKinematicContact(contact));
    window.location.hash = `#${config.data.code()}`;
  }

  /**
   * {@inheritDoc}
   */
  public perform(): Step {
    if (this.keys.get("ArrowUp")) {
      if (this.processor.accelerate() && !this.accelerateSound) {
        this.accelerateSound = Sfx.play(Sound.THRUSTER, true);
      }
    } else if (this.accelerateSound) {
      this.accelerateSound.pause();
      this.accelerateSound = undefined;
    }
    if (this.keys.get("ArrowLeft")) {
      this.processor.turnLeft(Math.max(10, 30 - this.turnKey++) / 20);
    } else if (this.keys.get("ArrowRight")) {
      this.processor.turnRight(Math.max(10, 30 - this.turnKey++) / 20);
    } else {
      this.turnKey = 0;
    }
    if (this.keys.get(" ")) {
      this.processor.activateTractorBeam();
    }
    if (this.keyDown("Control")) {
      this.processor.shoot();
      this.upKeys.set("Control", false);
    }
    if (this.keys.get("r")) {
      this.processor.removeRope();
    }
    if (this.keys.get("Escape") || this.keys.get("q")) {
      this.processor.selfDestruct();
    }
    if (this.keyDown("h")) {
      this.menu.config().screen.showHelp();
    }
    if (this.keyDown("d")) {
      // eslint-disable-next-line no-console
      console.log("svg", new XMLSerializer().serializeToString(this.svg));
    }
    if (!this.processor.perform()) {
      SVGSupport.removeElement(this.svg);
      return this.processor.alive() ? this.menu.nextLevel() : this.menu.fromLevel();
    }
    if (this.svg.style.display === "none") {
      this.svg.style.display = "inherit";
    }
    return this;
  }

  private keyDown(key: string): boolean {
    const down = this.keys.get(key);
    if (this.upKeys.get(key) && down) {
      this.upKeys.set(key, false);
      return true;
    }
    this.upKeys.set(key, !down);
    return false;
  }

}
