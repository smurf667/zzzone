import "planck-js";
import {ModelType} from "../LevelData";
import {PlanckProcessor} from "../PlanckProcessor";
import {SVGSupport} from "../SVGSupport";
import {ModelBase} from "./ModelBase";

/**
 * A fuel pod.
 */
export class FuelPod extends ModelBase {

  private static readonly FADE_STEPS = 75;

  private fade: number;
  private fuel: number;
  private explode: boolean;

  /**
   * Creates the fuel pod.
   *
   * @param svg the SVG representation
   * @param body the planck representation
   * @param fuel the amount of fuel the pod holds
   */
  constructor(svg: SVGElement, body: planck.Body, fuel: number) {
    super(body, svg, ModelType.FUEL_POD);
    this.fade = -1;
    this.fuel = fuel;
    // because this is used in the raycasting, this property is stuck into the user data
    (body.getUserData() as any).pickable = true;
  }

  /**
   * @inheritdoc
   */
  public step(): void {
    this.body.setAwake(true); // need to make awake to interact with body actors
    SVGSupport.updatePosition(this.svg, this.body);
    if (this.fade > 0) {
      if (this.fade === FuelPod.FADE_STEPS) {
        const anim = SVGSupport.createElement("animate", {
          attributeName: "opacity",
          dur: "1s",
          fill: "freeze",
          repeatCount: "1",
          values: "1;0",
        });
        this.svg.appendChild(anim);
        SVGSupport.startAnimation(anim);
      }
      this.fade--;
    }
  }

  /**
   * Indicates that the fuel pod was placed into the fuel
   * collector.
   */
  public captured(): void {
    if (this.fade === -1) {
      this.fade = FuelPod.FADE_STEPS;
    }
  }

  /**
   * Records that the pod was hit.
   */
  public hit(): void {
    this.explode = true;
  }

  /**
   * @inheritdoc
   */
  public destroy(world: planck.World, processor: PlanckProcessor): void {
    if (this.explode) {
      processor.explode(this, ModelType.FUEL_POD);
    }
    super.destroy(world, processor);
  }

  /**
   * @inheritdoc
   */
  public terminated(): boolean {
    return this.fade === 0 || this.explode;
  }

  /**
   * Check if collision is catastrophic.
   *
   * @returns true if collision is fatal, false otherwise
   */
  public collide(): boolean {
    return this.body.getLinearVelocity().length() > 15 - 2 * this.body.getMass();
  }

  /**
   * Empties the fuel pod.
   *
   * @returns the fuel extracted
   */
  public empty(): number {
    const result = this.fuel;
    this.fuel = 0;
    return result;
  }

}
