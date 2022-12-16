import {PlanckProcessor} from "../PlanckProcessor";
import {Screen} from "../Screen";
import {DeathFromAbove} from "./DeathFromAbove";

export class Meteorites extends DeathFromAbove {

  constructor(processor: PlanckProcessor, screen: Screen, gap: number, spread: number) {
    super("\u26a0 Meteorite strike!", processor, screen, gap, spread);
  }

  protected launch(): boolean {
    if (super.launch()) {
      this.processor.createMeteorite(15 + 15 * Math.random());
    }
    return false;
  }

}
