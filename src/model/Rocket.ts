import "planck-js";
import {Gauge} from "../Gauge";
import {ModelType} from "../LevelData";
import {PlanckProcessor} from "../PlanckProcessor";
import {Sfx, Sound} from "../Sfx";
import {SVGSupport} from "../SVGSupport";
import {ModelBase} from "./ModelBase";

enum FlightState {
  RESTING,
  COUNTDOWN,
  FLYING,
  FLAMEOUT,
}

/**
 * The rocket for escaping the zone.
 */
export class Rocket extends ModelBase {

  private readonly driveGauge: Gauge;
  private readonly torque: number;
  private readonly requiredFuel: number;
  private fuel: number;
  private state: FlightState;
  private flames: SVGElement[];
  private animation: SVGElement;
  private launchDirection: planck.Vec2;
  private launchForce: number;
  private sound: HTMLAudioElement;

  /**
   * Creates the rocket.
   *
   * @param svg the SVG representation
   * @param body the planck representation
   * @param requiredFuel the amount of fuel required for launch
   */
  constructor(svg: SVGElement, body: planck.Body, requiredFuel: number) {
    super(body, svg, ModelType.ROCKET);
    this.driveGauge = new Gauge(44, 144, "Drive", requiredFuel, Math.round(requiredFuel * 0.05));
    this.fuel = 0;
    this.state = FlightState.RESTING;
    this.requiredFuel = requiredFuel;
    this.torque = 512 * Math.sign(Math.random() - 0.5);
  }

  /**
   * @inheritdoc
   */
  public step(): void {
    SVGSupport.updatePosition(this.svg, this.body);
    if (this.state === FlightState.FLYING && this.fuel > 0) {
      if (this.requiredFuel - this.fuel < 40) {
        this.body.applyTorque(this.torque, true);
      }
      this.addFuel(-1);
      this.body.applyLinearImpulse(
        this.body.getWorldVector(this.launchDirection).mul(this.launchForce),
        this.body.getWorldPoint(planck.Vec2(this.launchDirection).mul(2)), true);
      const rot = 2 * Math.cos(PlanckProcessor.deg2rad(7 * this.fuel));
      let factor = 3;
      for (const flame of this.flames) {
        const angle = (factor--) * rot;
        SVGSupport.setAttributes(flame, { transform: `rotate(${angle})` });
      }
      if (this.fuel === 0) {
        SVGSupport.setAttributes(this.animation, { values: "0.7;0" });
        SVGSupport.startAnimation(this.animation);
        this.state = FlightState.FLAMEOUT;
        this.silence();
      }
    }
  }

  /**
   * Mutes any playing sound of the rocket.
   */
  public silence(): void {
    if (this.sound) {
      this.sound.pause();
      this.sound = undefined;
    }
  }

  /**
   * Returns the drive gauge.
   *
   * @returns the drive gauge.
   */
  public gauge(): Gauge {
    return this.driveGauge;
  }

  /**
   * Adds fuel to the rocket drive.
   *
   * @param amount the amount to add
   * @returns true if the rocket can launch
   */
  public addFuel(amount: number): boolean {
    if (this.state === FlightState.RESTING || amount < 0) {
      this.fuel = Math.min(this.requiredFuel, this.fuel + amount);
      this.driveGauge.setValue(this.fuel);
      return amount > 0 && this.fuel === this.requiredFuel;
    }
    return false;
  }

  /**
   * Checks if the given amount is enough to fuel the rocket.
   *
   * @param amount the amount to check
   * @returns true if the amount is enough to fuel the rocket.
   */
  public checkFuel(amount: number): boolean {
    if (this.state !== FlightState.RESTING) {
      return true;
    }
    return (amount + this.fuel - this.requiredFuel) >= 0;
  }

  /**
   * Starts the countdown.
   */
  public countdown(): void {
    this.state = FlightState.COUNTDOWN;
  }

  /**
   * Launches the rocket.
   *
   * @param gravity the current gravity
   */
  public liftOff(gravity: planck.Vec2): void {
    this.launchForce = gravity.length() * 4;
    this.launchDirection = planck.Vec2(gravity).mul(4 * Math.sign(gravity.y) / this.launchForce);
    this.state = FlightState.FLYING;
    const group = SVGSupport.createElement("g", { stroke: "transparent", opacity: 0.7 });
    const shapes = [ [ 5, 15, 40, "red" ], [ -5, 10, 30, "yellow" ], [ -15, 5, 20, "white "] ];
    this.flames = [];
    while (shapes.length > 0) {
      const info = shapes.shift();
      const flame = SVGSupport.createElement("ellipse", {
        cx: 0,
        cy: info[0],
        fill: info[3],
        rx: info[1],
        ry: info[2],
      });
      group.appendChild(flame);
      this.flames.push(flame);
    }
    this.animation = SVGSupport.createElement("animate", {
      attributeName: "opacity",
      dur: "1s",
      fill: "freeze",
      repeatCount: "1",
      values: "0;0.7",
    });
    group.appendChild(this.animation);
    this.elements().svg.appendChild(group);
    SVGSupport.startAnimation(this.animation);
    if (!this.sound) {
      this.sound = Sfx.play(Sound.ROCKET, true);
    }
  }

  /**
   * @inheritdoc
   */
  public terminated(): boolean {
    // this guy is immortal
    return false;
  }

}
