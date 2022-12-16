import "planck-js";
import {Collector} from "./LevelData";
import {KinematicsData} from "./LevelData";
import {Landscape} from "./LevelData";
import {ModelType} from "./LevelData";
import {Pod} from "./LevelData";
import {StationData} from "./LevelData";
import {Model} from "./Model";

/**
 * Level processing interface.
 * There is a duality between the planck world model and the SVG
 * representation, and with slight deviations operations on both
 * are required.
 * After initialization/setup, the processors perform per-frame
 * operations (in a "step").
 */
export interface LevelProcessor<T> {

  /**
   * Performs a single frame step.
   */
  step(): void;

  /**
   * Fires a bullet
   *
   * @returns depending on the processor, the shooting result
   */
  shoot(): T;

  /**
   * Processes the gravity information of a level.
   *
   * @param gravity the gravity information
   */
  processGravity(gravity: planck.Vec2): void;

  /**
   * Processes the landscape information of a level.
   *
   * @param data the landscape information
   * @returns the processing result
   */
  processLandscape(data: Landscape): T[];

  /**
   * Process the shuttle information.
   *
   * @param data the shuttle information
   * @returns the processing result
   */
  processShuttle(data: planck.BodyDef): T;

  /**
   * Process the rocket information.
   *
   * @param data the rocket information
   * @returns the processing result
   */
  processRocket(data: planck.BodyDef): T;

  /**
   * Process the collector.
   *
   * @param data information on the collector
   */
  processCollector(data: Collector): T;

  /**
   * Process the fuel pods of the level.
   *
   * @returns the processing result
   */
  processFuelPods(data: Pod[]): T[];

  /**
   * Processes the refuel/repair stations of the level.
   *
   * @param data a list of the stations.
   * @returns the processing result
   */
  processStations(data: StationData[]): T[];

  /**
   * Processes a time limit on the level.
   *
   * @param limit the time limit, if any
   */
  processTimeLimit(limit: number): void;

  /**
   * Processes the kinematics data of the level.
   * This sets up the relevant information and
   * prepares for handling the kinematics when the
   * level runs.
   *
   * @param data the (static) data
   * @returns the processing result
   */
  processKinematics(data: KinematicsData): T[];

  /**
   * Processes boxes of the level.
   *
   * @param data the box list
   */
  processBoxes(data: number[][]): T[];

  /**
   * Explodes the given model. The original information
   * is expected to be removed, and replaced with the
   * fragments returned by the explosion.
   *
   * @param model the model
   * @param modelType the model type
   */
  explode(model: Model, modelType: ModelType): T[];

  /**
   * Creates a new meteorite in the level.
   *
   * @param radius the size of the meteorite
   */
  createMeteorite(radius: number): T;

  /**
   * Creates a new missile in the level.
   */
  createMissile(): T;

}
