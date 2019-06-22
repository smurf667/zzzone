import "planck-js";
import advancedTraining from "./level/advancedTraining.json";
import antipodal from "./level/antipodal.json";
import bootCamp from "./level/bootCamp.json";
import denOfFuel from "./level/denOfFuel.json";
import descent from "./level/descent.json";
import goodthings from "./level/goodthings.json";
import hilbert from "./level/hilbert.json";
import influence from "./level/influence.json";
import khitomer from "./level/khitomer.json";
import mountDoom from "./level/mtdoom.json";
import primordial from "./level/primordial.json";
import reactorBreach from "./level/reactorBreach.json";
import rock from "./level/rock.json";
import stampede from "./level/stampede.json";
import tunnel from "./level/tunnel.json";
import zero from "./level/zero.json";

export enum DataType {
  LANDSCAPE_PATH = "path",
  LANDSCAPE_POLYGON = "polygon",
  KINEMATIC_BOX = "box",
  KINEMATIC_LOCK = "lock",
}

export enum StepperType {
  GRAVITY = "gravityShift",
  METEORITES = "meteorites",
  MISSILES = "missiles",
  DYSTOPIA = "dystopia",
}

// enums for model type (bit mask)
export enum ModelType {
  FRAGMENT  = 0b000000000000, // not handled!
  BOX       = 0b000000000001,
  BULLET    = 0b000000000010,
  COLLECTOR = 0b000000000100,
  FUEL_POD  = 0b000000001000,
  LANDSCAPE = 0b000000010000,
  METEORITE = 0b000000100000,
  MISSILE   = 0b000001000000,
  ROCKET    = 0b000010000000,
  ROPE      = 0b000100000000,
  SENSOR    = 0b001000000000,
  SHUTTLE   = 0b010000000000,
  STATION   = 0b100000000000,
}

export interface Dimension {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface LandscapeData {
  type: DataType;
  data: number[][];
  svgProperties?: any;
}

export interface StepperData {
  type: StepperType;
  data?: number[];
}

export interface Instructions {
  welcome: string[];
  success: string;
  nextCode?: string;
}

export interface Landscape {
  dimension: Dimension;
  properties: planck.FixtureOpt;
  data: LandscapeData[];
}

export interface Collector {
  frame: number[][];
  sensor: Dimension;
  position: planck.Vec2;
  angle?: number;
}

export interface Pod {
  position: planck.Vec2;
  fuel?: number;
  density?: number;
  id?: string;
}

export interface StationData {
  frame: number[][];
  position: planck.Vec2;
}

export interface SensorData {
  id: string;
  enabled?: boolean;
  position: planck.Vec2;
}

export interface KinematicBody {
  id: string;
  type: DataType;
  properties?: planck.BodyDef;
  data: number[];
}

export interface ActorData {
  on: string;
  phases: string[];
  repeatCount?: number;
}

export interface KinematicsData {
  sensors: SensorData[];
  bodies: KinematicBody[];
  actors: ActorData[];
}

/**
 * Definition of a level.
 */
export class LevelData {

  public static init() {
    LevelData.COLLECTOR = {
      frame: [
        [ -40, 0 - 20 ],
        [ -20, 20 - 20 ],
        [ -20, 50 - 20 ],
        [ 20, 50 - 20 ],
        [ 20, 20 - 20 ],
        [ 40, 0 - 20 ],
        [ 40, 50 - 20 ],
        [ -40, 50 - 20 ],
      ],
      position: planck.Vec2.zero(),
      sensor: {
        height: 10,
        width: 20,
        x: 0,
        y: 0,
      },
    };
    LevelData.STATION = [
      [ -20, 10 ],
      [ 20, 10 ],
      [ 25, 0 ],
      [ -25, 0 ],
    ];
    LevelData.add(new LevelData(bootCamp));
    LevelData.add(new LevelData(advancedTraining));
    LevelData.add(new LevelData(descent));
    LevelData.add(new LevelData(mountDoom));
    LevelData.add(new LevelData(denOfFuel));
    LevelData.add(new LevelData(stampede));
    LevelData.add(new LevelData(primordial));
    LevelData.add(new LevelData(antipodal));
    LevelData.add(new LevelData(zero));
    LevelData.add(new LevelData(reactorBreach));
    LevelData.add(new LevelData(tunnel));
    LevelData.add(new LevelData(hilbert));
    LevelData.add(new LevelData(rock));
    LevelData.add(new LevelData(influence));
    LevelData.add(new LevelData(khitomer));
    LevelData.add(new LevelData(goodthings));
  }

  /**
   * Returns the level for the given code, if any.
   * @param code the code of a level
   * @returns the level for the given code, if any.
   */
  public static level(code: string): LevelData {
    return LevelData.levelData.get(code);
  }

  /**
   * Returns the first known level.
   * @returns the first known level.
   */
  public static first(): LevelData {
    return LevelData.levelList[0];
  }

  /**
   * Returns a list of available levels, up to the level
   * identified by the given code.
   * @param code the code of a level
   * @returns a list of available levels, up to the level identified by the given code.
   */
  public static available(code: string): LevelData[] {
    const result = [];
    if (LevelData.levelData.has(code)) {
      for (const candidate of LevelData.levelList) {
        result.push(candidate);
        if (code === candidate.code()) {
          break;
        }
      }
    }
    return result;
  }

  /**
   * Returns all know levels
   * @returns all know levels
   */
  public static all(): LevelData[] {
    return LevelData.levelList;
  }

  private static readonly levelData: Map<string, LevelData> = new Map();
  private static readonly levelList: LevelData[] = [];

  private static COLLECTOR: Collector;
  private static STATION: number[][];

  private static add(data: LevelData): void {
    LevelData.levelData.set(data.code(), data);
    if (LevelData.levelList.length > 0) {
      LevelData.levelList[LevelData.levelList.length - 1].instructions().nextCode = data.code();
    }
    LevelData.levelList.push(data);
  }

  private readonly json: any;

  /**
   * Creates the level data based on the raw JSON input.
   * @param raw the raw JSON level information.
   */
  constructor(raw: any) {
    this.json = raw;
    if (this.json.stations) {
      for (const station of this.json.stations) {
        station.frame = LevelData.STATION;
      }
    }
  }

  /**
   * Returns the name of the level.
   * @return the name of the level.
   */
  public name(): string {
    return this.json.name;
  }

  /**
   * Returns the code of the level.
   * @return the code of the level.
   */
  public code(): string {
    if (!this.json.code) {
      let hc = 0;
      for (const c of this.name()) {
        hc = (hc << 3) ^ c.charCodeAt(0);
        hc &= hc;
      }
      hc = Math.abs(hc % 100000);
      let str = hc.toString(10);
      while (str.length < 5) {
        str = `0${str}`;
      }
      this.json.code = str;
    }
    return this.json.code;
  }

  /**
   * Returns the zoom of the level.
   * @returns the zoom of the level.
   */
  public zoom(): number {
    return this.json.zoom;
  }

  /**
   * Returns the time limit, if defined.
   * @returns the time limit, if required
   */
  public timeLimit(): number {
    return this.json.timeLimit;
  }

  /**
   * Returns the gravity information.
   * @returns the gravity information.
   */
  public gravity(): planck.Vec2 {
    return planck.Vec2(this.json.gravity.x, this.json.gravity.y);
  }

  /**
   * Returns the static landscape information.
   * @returns the static landscape information.
   */
  public landscape(): Landscape {
    return this.json.landscape;
  }

  /**
   * Returns instructions for the level.
   * @returns instructions for the level.
   */
  public instructions(): Instructions {
    return this.json.instructions || { instructions: [], success: "Well done!" };
  }

  /**
   * Returns the shuttle definition.
   * @returns the shuttle definition.
   */
  public shuttle(): planck.BodyDef {
    return this.json.shuttle;
  }

  /**
   * Returns the rocket for our escape.
   * @returns the rocket definition.
   */
  public rocket(): planck.BodyDef {
    return this.json.rocket;
  }

  /**
   * Returns information for the fuel collector.
   * @returns the fuel collector information.
   */
  public collector(): Collector {
    const result = JSON.parse(JSON.stringify(LevelData.COLLECTOR)) as Collector;
    result.position = this.json.collector as planck.Vec2;
    result.angle = this.json.collector ? this.json.collector.angle : 0;
    return result;
  }

  /**
   * Returns the fuel pods of the level.
   * @returns the fuel pods of the level.
   */
  public fuelPods(): Pod[] {
    return this.json.fuelPods;
  }

  /**
   * Returns the refuel/repair stations.
   * @returns the refuel/repair stations.
   */
  public stations(): StationData[] {
    return this.json.stations || [];
  }

  /**
   * Returns the steppers of the level, if any.
   * @return the steppers of the level, if any.
   */
  public steppers(): StepperData[] {
    return this.json.steppers || [];
  }

  /**
   * Returns data on the kinematic bodies, sensors and actions.
   * @returns kinematics data.
   */
  public kinematics(): KinematicsData {
    return this.json.kinematics;
  }

  /**
   * Returns the boxes of the level.
   * @returns a list of positions
   */
  public boxes(): number[][] {
    return this.json.boxes || [];
  }

 /*
  * Modifiers for editor...
  */

  /**
   * Returns the raw JSON for the level data.
   * @returns the raw JSON for the level data.
   */
  public raw(): any {
    return this.json;
  }

  /**
   * Sets the shuttle data.
   * @param data the shuttle data.
   */
  public setShuttle(data: planck.BodyDef): void {
    this.json.shuttle = data;
  }

  /**
   * Sets the rocket data.
   * @param data the rocket data.
   */
  public setRocket(data: planck.BodyDef): void {
    this.json.rocket = data;
  }

  /**
   * Sets the collector data.
   * @param data the collector data.
   */
  public setCollector(data: planck.Vec2): void {
    this.json.collector = data;
  }

  /**
   * Adds a refuel station.
   * @param data the station data.
   */
  public addStation(data: planck.Vec2): void {
    if (!this.json.stations) {
      this.json.stations = [];
    }
    this.json.stations.push({
      frame: LevelData.STATION,
      position: data,
    });
  }

}
