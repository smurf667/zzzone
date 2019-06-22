import "planck-js";
import {ModelType} from "../LevelData";
import {PlanckProcessor} from "../PlanckProcessor";
import {SVGProcessor} from "../SVGProcessor";
import {SVGSupport} from "../SVGSupport";
import {ModelBase} from "./ModelBase";

export enum MissileState {
  ALIVE,
  EXPLODING,
  DESTROYED,
}

/**
 * Greetings from Kong Jong Un.
 */
export class Missile extends ModelBase {

  private phase: MissileState;

  /**
   * Creates the missile.
   * @param svg the SVG representation
   * @param body the planck representation
   */
  constructor(svg: SVGElement, body: planck.Body) {
    super(body, svg, ModelType.MISSILE);
    this.phase = MissileState.ALIVE;
  }

  /**
   * @inheritdoc
   */
  public step(frame: number): void {
    SVGSupport.updatePosition(this.svg, this.body);
  }

  /**
   * @inheritdoc
   */
  public destroy(world: planck.World, processor: PlanckProcessor): void {
    processor.explode(this, ModelType.MISSILE);
    super.destroy(world, processor);
  }

  /**
   * @inheritdoc
   */
  public terminated(): boolean {
    return this.phase !== MissileState.ALIVE;
  }

  /**
   * Records a collision.
   * @param byBullet flag to indicate whether missile was hit by bullet or not
   */
  public hit(byBullet?: boolean) {
    this.phase = byBullet === true ? MissileState.DESTROYED : MissileState.EXPLODING;
  }

  /**
   * Returns the missile state.
   * @returns the missile state.
   */
  public state(): MissileState {
    return this.phase;
  }

}
