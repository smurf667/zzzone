import {Step} from "../Step";

export class Finalizer implements Step {

  private readonly callback: () => void;

  constructor(callback: () => void) {
    this.callback = callback;
  }

  /**
   * {@inheritDoc
   */
  public perform(): Step {
    this.callback.apply(this);
    return undefined;
  }

}
