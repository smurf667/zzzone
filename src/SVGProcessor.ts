import {FuelCollector} from "./FuelCollector";
import {Collector} from "./LevelData";
import {DataType} from "./LevelData";
import {KinematicBody, KinematicsData} from "./LevelData";
import {Landscape} from "./LevelData";
import {LandscapeData} from "./LevelData";
import {StationData} from "./LevelData";
import {StepperData} from "./LevelData";
import {StepperType} from "./LevelData";
import {ModelType} from "./LevelData";
import {Pod} from "./LevelData";
import {LevelProcessor} from "./LevelProcessor";
import {Model} from "./Model";
import {FuelPod} from "./model/FuelPod";
import {Meteorite} from "./model/Meteorite";
import {PlanckProcessor} from "./PlanckProcessor";
import {SVGSupport} from "./SVGSupport";

type BodyFactory = (body: KinematicBody) => SVGElement;

/**
 * Level processor taking care of SVG representation of the world.
 */
export class SVGProcessor implements LevelProcessor<SVGElement> {

  /** The planck world is scaled to a tenth of the SVG representation. */
  public static readonly SCALE: number = 10;

  public static readonly WIDTH = 960;
  public static readonly HEIGHT = 720;

  public static init() {
    SVGProcessor.CREATORS.set(DataType.KINEMATIC_BOX, (body) => {
      const angle = body.properties ? body.properties.angle || 0 : 0;
      const group = SVGSupport.createElement("g", {
        id: body.id,
        transform: `translate(${body.data[0]}, ${body.data[1]}) rotate(${-angle})` });
      group.appendChild(
        SVGSupport.createElement("rect", {
          fill: `url(#${SVGProcessor.ID_HATCH_PATTERN})`,
          height: 2 * body.data[3],
          stroke: "transparent",
          width: 2 * body.data[2],
          x: -body.data[2],
          y: -body.data[3],
        }));
      return group;
    });
    SVGProcessor.CREATORS.set(DataType.KINEMATIC_LOCK, (body) => {
      const group = SVGSupport.createElement("g", {
        id: body.id,
        transform: `translate(${body.data[0]}, ${body.data[1]}) rotate(${-body.data[3]})` });
      const radius = body.data[2];
      const upper = [];
      const lower = [];
      const step = 2 * (90 - body.data[4]) / 10;
      for (let a = -90 + body.data[4]; a <= 90 - body.data[4]; a += step) {
        const angle = PlanckProcessor.deg2rad(a);
        const x = Math.round(100 * radius * Math.sin(angle)) / 100;
        const y = Math.round(100 * radius * Math.cos(angle)) / 100;
        upper.push([ x, y]);
        lower.push([ x, -y]);
      }
      SVGSupport.polygon(group, upper, {
        fill: `url(#${SVGProcessor.ID_HATCH_PATTERN})`,
        stroke: "transparent",
      });
      SVGSupport.polygon(group, lower, {
        fill: `url(#${SVGProcessor.ID_HATCH_PATTERN})`,
        stroke: "transparent",
      });
      return group;
    });
    SVGProcessor.BOX_COLORS.set(-1, "#666");
    SVGProcessor.BOX_COLORS.set(1, "#999");
    SVGProcessor.BOX_COLORS.set(2, "#944");
    SVGProcessor.BOX_COLORS.set(3, "#a22");
    SVGProcessor.BOX_COLORS.set(4, "#b00");
    SVGProcessor.POD_COLORS.push("#3a3");
    SVGProcessor.POD_COLORS.push("#aa0");
    SVGProcessor.POD_COLORS.push("#a70");
    SVGProcessor.POD_COLORS.push("#b33");
  }

  private static readonly ID_HATCH_PATTERN = "hatch";
  private static readonly ID_BEAM_GRADIENT = "beamGradient";
  private static readonly ID_GROUND_BLUE = "ground-blue";
  private static readonly ID_GROUND_RED = "ground-red";
  private static readonly ID_GROUND_GREY = "ground-grey";
  private static readonly ID_ROCKET = "rocket";
  private static readonly ID_ROCKET_DEFINITION = "rocketDef";
  private static readonly ID_SHUTTLE = "shuttle";
  private static readonly ID_SHUTTLE_DEFINITION = "shuttleDef";
  private static readonly ID_TWINKLE_DEFINITION = "twinkleDef";

  private static readonly WITH_BOUNDS = false;

  private static readonly CREATORS: Map<string, BodyFactory> = new Map();
  private static readonly BOX_COLORS: Map<number, string> = new Map();
  private static readonly POD_COLORS: string[] = [];

  private readonly svg: SVGElement;
  private readonly layerLandscape: SVGElement;
  private readonly layerKinematic: SVGElement;
  private readonly layerDynamic: SVGElement;
  private frame: number;
  private collector: FuelCollector;
  private ropeSvg: SVGElement;
  private beamSvg: SVGElement;

  /**
   * Creates the processor.
   */
  public constructor() {
    const debug = document.getElementsByTagName("canvas");
    if (debug.length > 0) {
      debug[0].setAttribute("style", debug[0].style + "; z-index: 1;");
    }
    this.svg = SVGSupport.createElement("svg", {
      height: SVGProcessor.HEIGHT,
      style: "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 20; cursor: none;",
      viewBox: "-384 -288 768 576",
      width: SVGProcessor.WIDTH,
    });
    this.frame = 0;
    this.svg.appendChild(this.initDefinitions());
    this.layerLandscape = SVGSupport.createElement("g", {
      "fill": "transparent",
      "stroke": "#fff",
      "stroke-width": 1.5,
    });
    this.svg.appendChild(this.layerLandscape);
    this.layerKinematic = SVGSupport.createElement("g", { });
    this.svg.appendChild(this.layerKinematic);
    this.layerDynamic = SVGSupport.createElement("g");
    this.ropeSvg = SVGSupport.createElement("path", {
      "fill": "transparent",
      "stroke": "#777",
      "stroke-width": 3,
    });
    this.layerDynamic.appendChild(this.ropeSvg);
    this.svg.appendChild(this.layerDynamic);
  }

  /**
   * Returns the root SVG element
   * @returns the root SVG element
   */
  public root(): SVGElement {
    return this.svg;
  }

  /**
   * Returns the rope SVG element
   * @returns the rope SVG element
   */
  public rope(): SVGElement {
    return this.ropeSvg;
  }

  /**
   * Returns the tractor beam SVG element
   * @returns the tractor beam SVG element
   */
  public beam(): SVGElement {
    return this.beamSvg;
  }

  /**
   * @inheritdoc
   */
  public step(): void {
    this.frame++;
    if (this.collector) {
      this.collector.step(this.frame);
    }
  }

  /**
   * @inheritdoc
   */
  public shoot(): SVGElement {
    const result = SVGSupport.createElement("use", { href: "#" + SVGProcessor.ID_TWINKLE_DEFINITION });
    this.layerDynamic.appendChild(result);
    return result;
  }

  /**
   * @inheritdoc
   */
  public processGravity(gravity: planck.Vec2): void {
    // do nothing
  }

  /**
   * @inheritdoc
   */
  public processLandscape(landscape: Landscape): SVGElement[] {
    if (SVGProcessor.WITH_BOUNDS) {
      this.svg.appendChild(SVGSupport.createElement("rect", {
        "fill": "transparent",
        "height": landscape.dimension.height + 4,
        "stroke": "#505",
        "stroke-dasharray": 4,
        "stroke-width": 1,
        "width": landscape.dimension.width + 4,
        "x": landscape.dimension.x - 2,
        "y": landscape.dimension.y - 2,
      }));
    }
    const result = [];
    for (const data of landscape.data) {
      switch (data.type) {
      case DataType.LANDSCAPE_PATH:
        result.push(SVGSupport.path(this.layerLandscape, data.data, data.svgProperties));
        break;
      case DataType.LANDSCAPE_POLYGON:
        result.push(SVGSupport.polygon(this.layerLandscape, data.data, data.svgProperties));
        break;
      default:
        break;
      }
    }
    return result;
  }

  /**
   * @inheritdoc
   */
  public processRocket(data: planck.BodyDef): SVGElement {
    if (!data) {
      return undefined;
    }
    const rocket = SVGSupport.createElement("g", {
      id: SVGProcessor.ID_ROCKET,
      transform: `translate(${data.position.x} ${data.position.y}) rotate(${-data.angle})`,
    });
    rocket.appendChild(SVGSupport.createElement("use", { href: "#" + SVGProcessor.ID_ROCKET_DEFINITION }));
    this.layerDynamic.appendChild(rocket);
    return rocket;
  }

  /**
   * @inheritdoc
   */
  public processCollector(data: Collector): SVGElement {
    if (!data || !data.position) {
      return undefined;
    }
    this.collector = new FuelCollector(data, this.layerLandscape);
    SVGSupport.polygon(this.collector.root(), data.frame, {
      "fill": "transparent",
      "stroke": "#fd0",
      "stroke-width": 1.5,
    });
    return this.collector.root();
  }

  /**
   * @inheritdoc
   */
  public processShuttle(data: planck.BodyDef): SVGElement {
    if (!data) {
      return undefined;
    }
    const transform = `translate(${data.position.x} ${data.position.y}) rotate(${-data.angle})`;
    const shuttle = SVGSupport.createElement("g", { id: SVGProcessor.ID_SHUTTLE, transform });
    shuttle.appendChild(SVGSupport.createElement("use", { href: "#" + SVGProcessor.ID_SHUTTLE_DEFINITION }));
    this.layerDynamic.appendChild(shuttle);
    return shuttle;
  }

  /**
   * @inheritdoc
   */
  public processStations(stations: StationData[]): SVGElement[] {
    const layer = this.layerKinematic;
    return stations.map((data) => {
      const group = SVGSupport.createElement("g", {
        "fill": "#0008a8",
        "stroke": "#1122d8",
        "stroke-width": 1.5,
        "transform": `translate(${data.position.x} ${data.position.y})`,
      });
      const d = data.frame.reduce((a, point, i) => i === 0 ?
        `M ${point[0]},${point[1]}` :
        `${a} L ${point[0]},${point[1]}${i === data.frame.length - 1 ? " Z" : ""}`,
        "");
      group.append(SVGSupport.createElement("path", { d }));

      group.append(SVGSupport.createElement("path", {
        d: "M 2,8 L 2.5,6 L 14,5.5 L -2,2 L -2.5,4 L -14,4.5 Z",
        fill: "#ff0",
        stroke: "transparent",
      }));

      const animations = [];
      let id = Math.floor(Math.abs(data.position.x * data.position.y));
      for (const pos of [
        [ -24.5, -2.5 ],
        [ 24.5, -2.5 ],
      ]) {
        const circle = SVGSupport.createElement("circle", {
          cx: pos[0],
          cy: pos[1],
          fill: "#1122d8",
          r: 1.5,
          stroke: "transparent",
        });
        const start = SVGSupport.createElement("animate", {
          attributeName: "fill",
          attributeType: "XML",
          begin: `hi${id}.end`,
          dur: "0.85s",
          from: "#1122d8",
          id: `lo${id}`,
          to: "#1122d8",
        });
        animations.push(start);
        circle.appendChild(start);
        circle.appendChild(SVGSupport.createElement("animate", {
          attributeName: "fill",
          attributeType: "XML",
          begin: `lo${id}.end`,
          dur: "0.15s",
          from: "#1122d8",
          id: `hi${id}`,
          to: "#fff",
        }));
        group.appendChild(circle);
        id++;
      }
      layer.appendChild(group);
      animations.forEach((a) => SVGSupport.startAnimation(a));
      return group;
    });
  }

  /**
   * @inheritdoc
   */
  public processTimeLimit(limit: number) {
    // do nothing
  }

  /**
   * @inheritdoc
   */
  public processFuelPods(pods: Pod[]): SVGElement[] {
    const layer = this.layerDynamic;
    const max =  2 * Math.round(100 * Math.PI * 5.5) / 100;
    return pods.map((pod) => {
      const result = SVGSupport.createElement("g", {
        "data-type": ModelType.FUEL_POD.toString(10),
        "transform": `translate(${pod.position.x} ${pod.position.y})`,
      });
      const color = SVGProcessor.POD_COLORS[
        Math.floor(Math.min(1, pod.density) * (SVGProcessor.POD_COLORS.length - 1))];
      result.appendChild(SVGSupport.createElement("circle", {
        "cx": 0,
        "cy": 0,
        "fill": "transparent",
        "r": 7.5,
        "stroke": color,
        "stroke-width": 1.5,
      }));
      const len = Math.round(100 * Math.min(17, 7 + pod.density * pod.density * 10)) / 100;
      const angle = 90 * (17 - len) / 17;
      result.appendChild(SVGSupport.createElement("circle", {
        "cx": 0,
        "cy": 0,
        "fill": "transparent",
        "r": 5.5,
        "stroke": color,
        "stroke-dasharray": `${len},${max}`,
        "stroke-width": 5,
        "transform": `rotate(${angle})`,
      }));
      layer.appendChild(result);
      return result;
    });
  }

  /**
   * @inheritdoc
   */
  public processKinematics(data: KinematicsData): SVGElement[] {
    if (!data) {
      return [];
    }
    const layer = this.layerKinematic;
    const result: SVGElement[] = [];
    data.bodies.forEach((body) => {
      const creator = SVGProcessor.CREATORS.get(body.type);
      if (creator) {
        result.push(creator.call(undefined, body));
      }
    });
    data.sensors.forEach((sensor) => {
      result.push(
        SVGSupport.createElement("circle", {
          "cx": sensor.position.x,
          "cy": sensor.position.y,
          "data-type": ModelType.SENSOR.toString(10),
          "fill": "transparent",
          "id": sensor.id,
          "r": 7.5,
          "stroke": "white",
          "stroke-width": 1.5,
        }));
    });
    result.forEach((element) => layer.appendChild(element));
    return result;
  }

  /**
   * @inheritdoc
   */
  public processBoxes(data: number[][]): SVGElement[] {
    const result = [];
    for (const info of data) {
      const count = info.length > 2 ? info[2] : 1;
      const color = SVGProcessor.BOX_COLORS.get(count);
      const box = SVGSupport.createElement("rect", {
        fill: color || SVGProcessor.BOX_COLORS.get(1),
        height: 10,
        stroke: "transparent",
        width: 10,
        x: -5,
        y: -5,
      });
      this.layerDynamic.appendChild(box);
      result.push(box);
    }
    return result;
  }

  /**
   * @inheritdoc
   */
  public explode(model: Model, type: ModelType): SVGElement[] {
    switch (type) {
    case ModelType.BOX:
      return this.explodeBox();
      break;
    case ModelType.FUEL_POD:
      return this.explodeCircle(7.5);
      break;
    case ModelType.METEORITE:
      return this.explodeCircle((model as Meteorite).radius());
      break;
    case ModelType.MISSILE:
      return this.explodeCircle(10);
      break;
    case ModelType.SHUTTLE:
      return this.explodeShuttle();
      break;
    default:
      return undefined;
    }
  }

  /**
   * @inheritdoc
   */
  public createMeteorite(radius: number): SVGElement {
    const result = SVGSupport.createElement("g");
    const points: number[][] = [];
    const step = PlanckProcessor.deg2rad(12);
    const max = 2 * Math.PI - step;
    for (let a = 0; a < max; a += step) {
      const r = radius + Math.random() * 6 - 2;
      points.push([
        Math.round(r * Math.cos(a)),
        Math.round(r * Math.sin(a)),
      ]);
    }
    SVGSupport.polygon(result, points, {
      "fill": "transparent",
      "stroke": "#557",
      "stroke-width": 3,
    });
    this.layerDynamic.appendChild(result);
    return result;
  }

  /**
   * @inheritdoc
   */
  public createMissile(): SVGElement {
    const result = SVGSupport.createElement("g", {
      fill: "#575",
      stroke: "transparent",
    });
    result.appendChild(SVGSupport.createElement("circle", {
      cx: 0,
      cy: 0,
      r: 10,
    }));
    result.appendChild(SVGSupport.createElement("path", {
      d: "M 0 0 L -12 -20 L 0 -17 L 12 -20 Z",
    }));
    this.layerDynamic.appendChild(result);
    return result;
  }

  private initDefinitions(): SVGElement {
    const definitions = SVGSupport.createElement("defs");

    const collectorGradient = SVGSupport.createElement("linearGradient", {
      id: "collectorGradient",
      x1: "0",
      x2: "0",
      y1: "0",
      y2: "1",
    });
    collectorGradient.appendChild(SVGSupport.createElement("stop", {
      "offset": "0%",
      "stop-color": "#fd0",
      "stop-opacity": 1,
    }));
    collectorGradient.appendChild(SVGSupport.createElement("stop", {
      "offset": "100%",
      "stop-color": "#a50",
      "stop-opacity": 0.25,
    }));
    definitions.appendChild(collectorGradient);

    const beamGradient = SVGSupport.createElement("linearGradient", {
      id: SVGProcessor.ID_BEAM_GRADIENT,
      x1: "0",
      x2: "0",
      y1: "0",
      y2: "1",
    });
    beamGradient.appendChild(SVGSupport.createElement("stop", {
      "offset": "0%",
      "stop-color": "#004",
      "stop-opacity": "0.5",
    }));
    beamGradient.appendChild(SVGSupport.createElement("stop", {
      "offset": "100%",
      "stop-color": "#08c",
      "stop-opacity": "1",
    }));
    definitions.appendChild(beamGradient);

    const sensorGradientOn = SVGSupport.createElement("radialGradient", { id: "sensorGradientOn" });
    sensorGradientOn.appendChild(SVGSupport.createElement("stop", { "offset": "10%", "stop-color": "#2b2" }));
    sensorGradientOn.appendChild(SVGSupport.createElement("stop", { "offset": "90%", "stop-color": "#060" }));
    definitions.appendChild(sensorGradientOn);

    const sensorGradientOff = SVGSupport.createElement("radialGradient", { id: "sensorGradientOff" });
    sensorGradientOff.appendChild(SVGSupport.createElement("stop", { "offset": "10%", "stop-color": "#b22" }));
    sensorGradientOff.appendChild(SVGSupport.createElement("stop", { "offset": "90%", "stop-color": "#600" }));
    definitions.appendChild(sensorGradientOff);

    const hatchPattern = SVGSupport.createElement("pattern", {
      height: 10,
      id: SVGProcessor.ID_HATCH_PATTERN,
      patternTransform: "rotate(45 0 0)",
      patternUnits: "userSpaceOnUse",
      width: 10,
    });
    hatchPattern.appendChild(SVGSupport.createElement("rect", {
      fill: "#750",
      height: 10,
      stroke: "transparent",
      width: 10,
      x: 0,
      y: 0,
    }));
    hatchPattern.appendChild(SVGSupport.createElement("line", {
      style: "stroke:#dc0; stroke-width:10",
      x1: 0,
      x2: 0,
      y1: 0,
      y2: 10,
    }));
    definitions.appendChild(hatchPattern);
    definitions.appendChild(this.bluePattern());
    definitions.appendChild(this.redPattern());
    definitions.appendChild(this.greyPattern());

    const shuttle = SVGSupport.createElement("g", {
      "fill": "transparent",
      "id": SVGProcessor.ID_SHUTTLE_DEFINITION,
      "stroke": "#b30",
      "stroke-width": 1.5,
    });
    this.beamSvg = SVGSupport.createElement("path", {
      d: "M 0 -20 L 25 40 L -25 40 Z",
      fill: `url(#${SVGProcessor.ID_BEAM_GRADIENT})`,
      opacity: "0",
      stroke: "transparent",
    });
    shuttle.appendChild(this.beamSvg);
    shuttle.appendChild(SVGSupport.createElement("path", { d: "M -17.5 0 L 0 -40 L 17.5 0 L 0 -10 Z" }));
    definitions.appendChild(shuttle);

    const rocket = SVGSupport.createElement("g", {
      "fill": "transparent",
      "id": SVGProcessor.ID_ROCKET_DEFINITION,
      "stroke": "#4b4",
      "stroke-width": 1.5,
    });
    // tslint:disable-next-line:max-line-length
    rocket.appendChild(SVGSupport.createElement("path", { d: "M 0 -200 Q -30 -130 -35 -60 L -60 -40 L -20 0 Q -12 -30 0 -40 Q 12 -30 20 0 L 60 -40 L 35 -60 Q 30 -130 0 -200" }));
    rocket.appendChild(SVGSupport.createElement("path", { d: "M -35 -60 Q 0 -40 35 -60" }));
    rocket.appendChild(SVGSupport.createElement("circle", { cx: 0, cy: -130, r: 10 }));
    definitions.appendChild(rocket);

    const twinkle = SVGSupport.createElement("g", {
      "id": SVGProcessor.ID_TWINKLE_DEFINITION,
      "stroke": "#28c",
      "stroke-width": 0.25,
    });
    twinkle.appendChild(this.star("#6cf", 0.5, "0 0 0", "90 0 0", "0.81s"));
    twinkle.appendChild(this.star("#6df", 0.8, "33 0 0", "123 0 0", "0.27s"));
    definitions.appendChild(twinkle);

    return definitions;
  }

  private linePattern(id: string, bg: string, fg: string, rotation: number): SVGElement {
    const result = SVGSupport.createElement("pattern", {
      height: 8,
      id,
      patternTransform: `rotate(${rotation} 0 0)`,
      patternUnits: "userSpaceOnUse",
      width: 8,
    });
    result.appendChild(SVGSupport.createElement("rect", {
      fill: bg,
      height: 8,
      stroke: "transparent",
      width: 8,
      x: 0,
      y: 0,
    }));
    result.appendChild(SVGSupport.createElement("line", {
      style: `stroke:${fg}; stroke-width:8`,
      x1: 0,
      x2: 8,
      y1: 0,
      y2: 0,
    }));
    return result;
  }

  private bluePattern(): SVGElement {
    return this.linePattern(SVGProcessor.ID_GROUND_BLUE, "#015", "#026", 5);
  }

  private redPattern(): SVGElement {
    const result = SVGSupport.createElement("pattern", {
      height: 32,
      id: SVGProcessor.ID_GROUND_RED,
      patternTransform: "rotate(-10 0 0)",
      patternUnits: "userSpaceOnUse",
      width: 32,
    });
    result.appendChild(SVGSupport.createElement("rect", {
      fill: "#420400",
      height: 32,
      stroke: "transparent",
      width: 32,
      x: 0,
      y: 0,
    }));
    result.appendChild(SVGSupport.createElement("path", {
      d: "M -2.5 19 Q 8 0, 16 16 T 34 13",
      style: "stroke:#480800; stroke-width:8; fill:transparent; stroke-linecap: square",
    }));
    return result;
  }

  private greyPattern(): SVGElement {
    return this.linePattern(SVGProcessor.ID_GROUND_GREY, "#50556e", "#4a5068", 17);
  }

  private explodeBox(): SVGElement[] {
    const result = [];
    const attributes = {
      fill: "transparent",
      height: 5,
      width: 5,
      x: -2.5,
      y: -2.5,
    };

    const color = SVGProcessor.BOX_COLORS.get(1);

    for (let i = 0; i < 4; i++) {
      const group = SVGSupport.createElement("g");
      const box = SVGSupport.createElement("rect", attributes);
      group.append(box);
      result.push(group);
      this.layerDynamic.append(group);
      this.explosionAnimation(box, color);
    }

    return result;
  }

  private explodeCircle(radius: number): SVGElement[] {
    const result = [];
    const angle = Math.PI / 3;
    for (let i = 0; i < 2 * Math.PI; i += angle) {
      const fragment = SVGSupport.createElement("g");
      const path = SVGSupport.polygon(fragment, [
        [ 0, 0 ],
        [ radius * Math.cos(i), - radius * Math.sin(i) ],
        [ radius * Math.cos(i + angle), - radius * Math.sin(i + angle) ],
      ], {
        fill: "transparent",
      });
      result.push(fragment);
      this.layerDynamic.append(fragment);
      this.explosionAnimation(path, "#bb0");
    }
    return result;
  }

  private explodeShuttle(): SVGElement[] {
    const result = [];
    const attributes = {
      d: "",
      fill: "transparent",
    };

    for (const triangle of [
      "M -17.5 0 L -9 -20 L 0 -10 Z",
      "M 17.5 0 L 9 -20 L 0 -10 Z",
      "M -9 -20 L 0 -40 L 9 -20 Z",
      "M -9 -20 L 9 -20 L 0 -10 Z",
    ]) {
      const group = SVGSupport.createElement("g");
      attributes.d = triangle;
      const path = SVGSupport.createElement("path", attributes);
      group.append(path);
      result.push(group);
      this.layerDynamic.append(group);
      this.explosionAnimation(path, "#f00");
    }
    return result;
  }

  private explosionAnimation(parent: SVGElement, color: string): void {
    const duration = (1.5 + Math.round(Math.random() * 10) / 40) + "s";
    let anim = SVGSupport.createElement("animate", {
      attributeName: "stroke",
      dur: duration,
      fill: "freeze",
      repeatCount: "1",
      values: `${color};#fff;#fe0;#a20`,
    });
    parent.appendChild(anim);
    SVGSupport.startAnimation(anim);
    anim = SVGSupport.createElement("animate", {
      attributeName: "opacity",
      dur: duration,
      fill: "freeze",
      repeatCount: "1",
      values: "1;1;0",
    });
    parent.appendChild(anim);
    SVGSupport.startAnimation(anim);
  }

  private star(color: string, opacity: number, from: string, to: string, dur: string): SVGElement {
    const path = SVGSupport.createElement("path", {
      d: "M-7,0 L-0.9,-0.9 L0,-7 L0.9,-0.9 L7,0 L0.9,0.9 L0,7 L-0.9,0.9Z",
      fill: color,
      opacity,
    });
    path.appendChild(SVGSupport.createElement("animateTransform", {
      attributeName: "transform",
      attributeType: "XML",
      dur,
      from,
      repeatCount: "indefinite",
      to,
      type: "rotate",
    }));
    return path;
  }

}
