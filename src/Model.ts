import "planck-js";
import {PlanckProcessor} from "./PlanckProcessor";

export interface ModelInfo {
  body: planck.Body;
  svg: SVGElement;
}

/**
 * Model interface for active elements in a level.
 */
export interface Model {

  /**
   * Performs a single frame step.
   */
  step(frame: number): void;

  /**
   * Removes the model from the planck world
   * and its graphical representation.
   *
   * @param world the current world
   * @param processor the planck processor
   */
  destroy(world: planck.World, processor: PlanckProcessor): void;

  /**
   * Returns the model elements.
   *
   * @returns the planck body and its graphical representation.
   */
  elements(): ModelInfo;

  /**
   * Indicates the model is terminated and should be removed
   * from the world.
   *
   * @returns true if the model should be removed from the world
   */
  terminated(): boolean;
}
