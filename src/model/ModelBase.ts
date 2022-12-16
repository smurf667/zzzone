import "planck-js";
import {ModelType} from "../LevelData";
import {Model, ModelInfo} from "../Model";
import { PlanckProcessor } from "../PlanckProcessor";
import {SVGSupport} from "../SVGSupport";

/**
 * Base implementation for models.
 */
export abstract class ModelBase implements Model {

  protected readonly body: planck.Body;
  protected readonly svg: SVGElement;

  /**
   * Creates the model instance.
   *
   * @param body the planck representation
   * @param svg the SVG representation
   * @param type the model type
   */
  constructor(body: planck.Body, svg: SVGElement, type: ModelType) {
    this.body = body;
    this.svg = svg;
    body.setUserData({
      model: this,
      modelType: type,
    });
  }

  /**
   * @inheritdoc
   */
  public abstract step(frame: number): void;

  /**
   * @inheritdoc
   */
  public abstract terminated(): boolean;

  /**
   * Removes the model from the planck world
   * and its graphical representation.
   *
   * @param world the current world
   * @param processor the current processor
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public destroy(world: planck.World, processor: PlanckProcessor): void {
    SVGSupport.removeElement(this.svg);
    world.destroyBody(this.body);
  }

  /**
   * Returns the model elements.
   *
   * @returns the planck body and its graphical representation.
   */
  public elements(): ModelInfo {
    return {
      body: this.body,
      svg: this.svg,
    };
  }

}
