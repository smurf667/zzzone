import {Step} from "../Step";

/**
 * No pun intended ;-) waits a given number of frames
 * and then hands over to the next step.
 */
export class Waiter implements Step {

  private remain: number;
  private readonly next: Step;

  /**
   * Creates the waiter for the given number of frames.
   *
   * @param frames the number of frames to wait
   * @param next the next step to execute afterwards
   */
  constructor(frames: number, next?: Step) {
    this.remain = frames;
    this.next = next;
  }

  /**
   * Returns this waiter if wait needs to continue,
   * or the next step.
   *
   * @returns this waiter or the next step
   */
  public perform(): Step {
    return this.remain-- > 0 ? this : this.next;
  }

}
