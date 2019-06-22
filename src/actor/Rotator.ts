import "planck-js";
import {PlanckProcessor} from "../PlanckProcessor";
import {Step} from "../Step";

/**
 * Rotates a kinematic body.
 */
export class Rotator implements Step {

  private readonly body: planck.Body;
  private startAngle: number;
  private angle: number;
  private frames: number;
  private remain: number;

  /**
   * Creates the rotator instance.
   * @param body the body to rotate
   * @param angle the rotation in degrees
   * @param frames the number of frames for the rotation
   */
  constructor(body: planck.Body, angle: number, frames: number) {
    this.body = body;
    this.startAngle = body.getAngle();
    this.angle = PlanckProcessor.deg2rad(angle);
    this.frames = frames;
    this.remain = frames;
  }

  /**
   * Performs a single frame step of the rotation.
   * @returns the rotator, if rotation needs to continue, or undefined if done
   */
  public perform(): Step {
    if (this.remain > 0) {
      this.body.setAngle(this.startAngle + this.angle * (1 - this.remain / this.frames));
      this.remain--;
      return this;
    } else {
      this.body.setAngle(this.startAngle + this.angle);
      const data = this.body.getUserData() as any;
      if (data.sound) {
        data.sound.pause();
        delete data.sound;
      }
      return undefined;
    }
  }

}
