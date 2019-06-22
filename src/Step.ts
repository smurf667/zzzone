/**
 * Action to be performed for a single frame step.
 */
export interface Step {

  /**
   * Performs the action.
   * @returns the step for the next frame, or undefined if there is none.
   */
  perform(): Step;

}
