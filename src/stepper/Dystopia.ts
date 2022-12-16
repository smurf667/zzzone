import {PlanckProcessor} from "../PlanckProcessor";
import {Step} from "../Step";

export class Dystopia implements Step {

  private readonly processor: PlanckProcessor;
  private readonly amplitude: number;
  private readonly frequency: number;
  private readonly bottom: number;
  private frame: number;

  constructor(processor: PlanckProcessor, amplitude: number, frequency: number, bottom?: number) {
    this.processor = processor;
    this.amplitude = amplitude / 2;
    this.frequency = frequency;
    this.frame = 0;
    this.bottom = processor.zoom(bottom || 1) / 2;
  }

  /**
   * {@inheritDoc
   */
  public perform(): Step {
    this.processor.zoom(this.bottom + this.amplitude * (1 + Math.sin(this.frame++ * this.frequency)));
    return this;
  }

}
