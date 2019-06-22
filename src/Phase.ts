import {Dimension} from "./LevelData";
import {Step} from "./Step";

export interface Instruction {
  target: object;
  method: string;
  parameters: number[];
}

/**
 * Representation of a phase with instructions for
 * actors (kinematic bodies, sensors) in a script.
 */
export class Phase implements Step {

  private readonly nextPhase: Step;
  private readonly instructions: Instruction[];
  private current: Step[];

  /**
   * Creates the phase based on the instructions.
   * The next phase is also built out of the instructions.
   * @param instructions the instructions of the phase(s)
   */
  constructor(instructions: Instruction[][]) {
    this.instructions = instructions.shift();
    this.nextPhase = instructions.length > 0 ? new Phase(instructions) : undefined;
  }

  /**
   * Performs all steps of the current phase.
   * @returns the current phase if steps remain, or the next phase, if any.
   */
  public perform(): Step {
    // execute all current steps
    if (!this.current) {
      this.init();
    }
    const next = [];
    for (const single of this.current) {
      const result = single.perform();
      if (result) {
        next.push(result);
      }
    }
    if (next.length > 0) {
      // still have to work in current phase
      this.current = next;
      return this;
    }
    // go to next phase
    this.current = undefined;
    return this.nextPhase;
  }

  private init(): Step[] {
    // calls the concurrent steps of this phase
    this.current = this.instructions.map((instr) =>
      instr.target[instr.method].apply(instr.target, instr.parameters) as Step)
      .filter((step) => step !== undefined);
    return this.current;
  }

}
