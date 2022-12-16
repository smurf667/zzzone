import "planck-js";
import {Rotator} from "../actor/Rotator";
import {Stopper} from "../actor/Stopper";
import {Waiter} from "../actor/Waiter";
import {ModelType} from "../LevelData";
import {Sfx, Sound} from "../Sfx";
import {Step} from "../Step";
import {SVGSupport} from "../SVGSupport";
import {ModelBase} from "./ModelBase";

/**
 * Actor operating on a kinematic body.
 */
export class BodyActor extends ModelBase {

  /**
   * Creates the body actor.
   *
   * @param body the body to act on
   * @param svg the graphical representation
   */
  constructor(body: planck.Body, svg: SVGElement) {
    super(body, svg, ModelType.LANDSCAPE);
    let fixture = body.getFixtureList();
    while (fixture) {
      // to handle collision with kinematic body, which is not handled otherwise
      fixture.setUserData({ actor: true });
      fixture = fixture.getNext();
    }
    this.step();
  }

  /**
   * @inheritdoc
   */
  public step(): void {
    SVGSupport.updatePosition(this.svg, this.body);
  }

  /**
   * @inheritdoc
   */
  public terminated(): boolean {
    return false;
  }

  /**
   * Moves a body.
   *
   * @param duration the number of frames to move
   * @param vx the direction
   * @param vy the direction
   */
  public move(duration: number, vx: number, vy: number): Step {
    this.playSound();
    this.body.setLinearVelocity(planck.Vec2(vx, vy));
    return new Waiter(duration, new Stopper(this.body));
  }

  /**
   * Rotates a body
   *
   * @param duration the number of frames to rotate
   * @param degrees the number of degrees to rotate
   */
  public rotate(duration: number, degrees: number): Step {
    this.playSound();
    return new Rotator(this.body, degrees, duration);
  }

  /**
   * Waits (doing "nothing") for a given duration
   *
   * @param duration the wait duration
   */
  public wait(duration: number): Step {
    return new Waiter(duration);
  }

  /**
   * Sets the angular velocity of a kinematic body.
   *
   * @param velocity the angular velocity
   */
  public angularVelocity(velocity: number): Step {
    this.body.setAngularVelocity(velocity);
    return undefined;
  }

  private playSound(): void {
    const data = (this.body.getUserData() as any);
    if (data.sound) {
      data.sound.pause();
    }
    data.sound = Sfx.play(Sound.ACTOR, true);
  }
}
