import "planck-js";
import {Step} from "../Step";

/**
 * Puts a kinematic body into rest.
 */
export class Stopper implements Step {

  private readonly body: planck.Body;

  /**
   * Creates the stopper for the given body.
   * @param body the body to put into rest.
   */
  constructor(body: planck.Body) {
    this.body = body;
  }

  /**
   * Sets the linear velocity to zero.
   * @returns undefined
   */
  public perform(): Step {
    this.body.setLinearVelocity(planck.Vec2.zero());
    const data = this.body.getUserData() as any;
    if (data.sound) {
      data.sound.pause();
      delete data.sound;
    }
    return undefined;
  }

}
