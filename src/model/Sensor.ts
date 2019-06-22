import "planck-js";
import {ModelType} from "../LevelData";
import {Instruction, Phase} from "../Phase";
import {PlanckProcessor} from "../PlanckProcessor";
import {SVGSupport} from "../SVGSupport";
import {ModelBase} from "./ModelBase";

/**
 * A sensor which is activated by bullet contact.
 */
export class Sensor extends ModelBase {

  private readonly world: planck.World;
  private readonly actions: Instruction[][][];
  private readonly mapping: Map<string, any>;
  private isEnabled: boolean;
  private isUnlocked: boolean;
  private isDead: boolean;

  /**
   * Creates the sensor.
   * @param svg the representation of the sensor
   * @param body the model of the sensor
   * @param mapping ID mappings to actual instances of kinematic bodies and sensors
   * @param enabled initial state
   */
  constructor(svg: SVGElement, body: planck.Body, mapping: Map<string, any>, enabled?: boolean) {
    super(body, svg, ModelType.SENSOR);
    this.mapping = mapping;
    this.actions = [];
    if (enabled === undefined) {
      this.enable();
    } else {
      enabled ? this.enable() : this.disable();
    }
    this.isUnlocked = true;
    this.isDead = false;
  }

  /**
   * @inheritdoc
   */
  public step(frame: number): void {
    // dummy?
  }

  /**
   * Adds phases to the sensor.
   * @param phases the phases to add
   * @param repeatCount the number of times to repeat the phases
   */
  public addPhases(phases: string[], repeatCount?: number): void {
    if (repeatCount) {
      let repetitions: string[] = [];
      while (repeatCount-- > 0) {
        repetitions = repetitions.concat(phases);
      }
      phases = repetitions;
    }
    this.actions.push(phases.map((phase) => this.parse(phase)));
  }

  /**
   * Triggers the sensor.
   * @param processor the planck processor to use.
   */
  public trigger(processor: PlanckProcessor): void {
    if (this.isEnabled && this.isUnlocked) {
      for (const instructions of this.actions) {
        processor.addSteps(new Phase(instructions.slice()));
      }
      this.flash("#fe6", "#696");
    }
  }

  /**
   * Enables the sensor. Afterwards it can be triggered.
   */
  public enable(): void {
    this.isEnabled = true;
    SVGSupport.setAttributes(this.svg, { fill: "url(#sensorGradientOn)", stroke: "#696" });
    this.flash("#6e6", "#696");
  }

  /**
   * Disables the sensor. It cannot be triggered then.
   */
  public disable(): void {
    this.isEnabled = false;
    SVGSupport.setAttributes(this.svg, { fill: "url(#sensorGradientOff)", stroke: "#966" });
    this.flash("#f66", "#966");
  }

  /**
   * Unlocks the sensor such that sensor actions can be triggered again.
   */
  public unlock(): void {
    this.isUnlocked = true;
  }

  /**
   * Locks a sensor to prevent for triggering
   * of actions. After the actions have been
   * processed, the sensor is unlocked.
   */
  public lock(): void {
    this.isUnlocked = false;
  }

  /**
   * @inheritdoc
   */
  public terminated(): boolean {
    return this.isDead;
  }

  /**
   * Terminates the sensor.
   */
  public terminate(): void {
    this.isDead = true;
  }

  private flash(hi: string, lo: string) {
    SVGSupport.removeChildren(this.svg);
    const anim = SVGSupport.createElement("animate", {
      attributeName: "stroke",
      dur: "1s",
      fill: "freeze",
      repeatCount: "1",
      values: `${lo};${hi};${hi};${lo}`,
    });
    this.svg.appendChild(anim);
    SVGSupport.startAnimation(anim);
  }

  private parse(line: string): Instruction[] {
    const result: Instruction[] = [];
    for (const instruction of this.split(";", line)) {
      const raw = this.split(/[~,()]/, instruction);
      const id = raw.shift();
      const method = raw.shift();
      const parameters = raw.map((str) => parseFloat(str));
      result.push({
        method,
        parameters,
        target: this.mapping.get(id),
      });
    }
    return result;
  }

  private split(separator: any, line: string): string[] {
    return line
      .split(separator)
      .map((single) => single.trim())
      .filter((str) => str.length > 0);
  }

}
