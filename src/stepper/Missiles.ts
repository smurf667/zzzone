import {PlanckProcessor} from "../PlanckProcessor";
import {Screen} from "../Screen";
import {Step} from "../Step";

import {DeathFromAbove} from "./DeathFromAbove";

export class Missiles extends DeathFromAbove {

  constructor(processor: PlanckProcessor, screen: Screen, gap: number, spread: number) {
    super("\u26a0 Incoming missile!", processor, screen, gap, spread);
  }

  protected launch(): boolean {
    if (super.launch()) {
      this.processor.createMissile();
    }
    return false;
  }

}
