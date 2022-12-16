import "planck-js";
import {Camera} from "./Camera";
import {HTMLSupport} from "./HTMLSupport";
import {DataType, LevelData} from "./LevelData";
import {ModelType} from "./LevelData";
import {SVGProcessor} from "./SVGProcessor";
import {SVGSupport} from "./SVGSupport";

interface LevelObjects {
  kinematicBodies?: SVGElement[];
  boxes?: SVGElement[];
  collector?: SVGElement;
  landscapes?: SVGElement[];
  pods?: SVGElement[];
  rocket?: SVGElement;
  sensors?: SVGElement[];
  shuttle?: SVGElement;
  stations?: SVGElement[];
  vertices?: SVGElement[];
}

interface Selection {
  svg?: SVGElement;
  index?: number;
  position?: planck.Vec2;
  type?: ModelType;
  vertex?: number;
  target?: any; // for editing general properties
}

enum Direction {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}

type TransformGetter = (svg: SVGElement) => planck.Vec2;
type Visibility = () => string;
type PlaceAction = (position: planck.Vec2) => void;
type PropertyFilter = (name: string) => boolean;
type TargetGetter = () => any;

/**
 * Rudimentary editor for levels.
 * Features: "Better than nothing" to design levels, but partly very low-level.
 * I used it in combination with manual editing of the level configuration to
 * achieve what I needed...
 */
export class Editor {

  private static readonly TRANSLATE = /translate\((.+?)\)/;
  private static readonly ROTATE = /rotate\((.+?)\)/;

  private readonly panel: HTMLElement;
  private readonly menuPanel: HTMLElement;
  private readonly detailPanel: HTMLElement;
  private readonly clickActions: Map<ModelType, (e: MouseEvent) => void>;
  private readonly directions: Map<Direction, planck.Vec2>;
  private readonly actionVisibility: Map<string, Visibility>;
  private svg: SVGElement;
  private processor: SVGProcessor;
  private camera: Camera;
  private data: LevelData;
  private lastClick: planck.Vec2;
  private lastCameraPosition: planck.Vec2;
  private selectionSymbol: SVGElement;
  private objects: LevelObjects;
  private selection: Selection;
  private placeAction: PlaceAction;
  private details: HTMLTextAreaElement;
  private updateDetails: HTMLButtonElement;
  private idCounter: number;
  private vertexLayer: SVGElement;

  /**
   * Creates the editor in the given window.
   */
  constructor() {
    LevelData.init();
    SVGProcessor.init();
    this.idCounter = 0;
    this.panel = document.querySelector("#panel");
    this.panel.onkeyup = (event) => this.keyEvent(event);
    this.panel.focus();
    this.directions = new Map();
    this.directions.set(Direction.UP, planck.Vec2(0, -1));
    this.directions.set(Direction.DOWN, planck.Vec2(0, 1));
    this.directions.set(Direction.LEFT, planck.Vec2(-1, 0));
    this.directions.set(Direction.RIGHT, planck.Vec2(1, 0));
    this.actionVisibility = new Map();
    this.clickActions = new Map();
    this.clickActions.set(ModelType.FRAGMENT,
      // FRAGMENT is a placeholder for a kinematic body, this is a hack :-)!
      (event) => this.svgClicked(event, ModelType.FRAGMENT));
    this.clickActions.set(ModelType.BOX,
      (event) => this.svgClicked(event, ModelType.BOX));
    this.clickActions.set(ModelType.COLLECTOR,
      (event) => this.svgClicked(event, ModelType.COLLECTOR));
    this.clickActions.set(ModelType.LANDSCAPE,
      (event) => this.svgClicked(event, ModelType.LANDSCAPE));
    this.clickActions.set(ModelType.FUEL_POD,
      (event) => this.svgClicked(event, ModelType.FUEL_POD));
    this.clickActions.set(ModelType.ROCKET,
      (event) => this.svgClicked(event, ModelType.ROCKET));
    this.clickActions.set(ModelType.SENSOR,
      (event) => this.svgClicked(event, ModelType.SENSOR));
    this.clickActions.set(ModelType.SHUTTLE,
      (event) => this.svgClicked(event, ModelType.SHUTTLE));
    this.clickActions.set(ModelType.STATION,
      (event) => this.svgClicked(event, ModelType.STATION));
    this.menuPanel = HTMLSupport.createElement("div");
    HTMLSupport.setStyleAttributes(this.menuPanel, {
      backgroundColor: "#337",
      color: "white",
      height: "98%",
      left: "4px",
      opacity: "1",
      padding: "2px",
      position: "absolute",
      top: "4px",
      width: "256px",
      zIndex: "4096",
    });
    const leftArrows = HTMLSupport.createElement("div");
    HTMLSupport.setStyleAttributes(leftArrows, {
      fontSize: "24px",
      position: "absolute",
      right: "2px",
      top: "-8px",
    });
    leftArrows.innerText = "\u21e4";
    const menu = this.menuPanel;
    leftArrows.onclick = () => {
      if (menu.style.left === "4px") {
        leftArrows.innerText = "\u21e5";
        menu.style.left = "-224px";
      } else {
        leftArrows.innerText = "\u21e4";
        menu.style.left = "4px";
      }
    };
    this.menuPanel.appendChild(leftArrows);
    this.initMenu();
    document.body.appendChild(this.menuPanel);

    this.detailPanel = HTMLSupport.createElement("div");
    document.body.style.overflow = "hidden";
    HTMLSupport.setStyleAttributes(this.detailPanel, {
      backgroundColor: "#733",
      color: "white",
      height: "98%",
      opacity: "1",
      padding: "2px",
      position: "absolute",
      right: "0px",
      top: "4px",
      width: "256px",
      zIndex: "4096",
    });
    const rightArrows = HTMLSupport.createElement("div");
    HTMLSupport.setStyleAttributes(rightArrows, {
      fontSize: "24px",
      left: "2px",
      position: "absolute",
      top: "-8px",
    });
    rightArrows.innerText = "\u21e5";
    const details = this.detailPanel;
    rightArrows.onclick = () => {
      if (details.style.right === "0px") {
        rightArrows.innerText = "\u21e4";
        details.style.right = "-224px";
      } else {
        rightArrows.innerText = "\u21e5";
        details.style.right = "0px";
      }
    };
    this.detailPanel.appendChild(rightArrows);
    this.initDetails();
    document.body.appendChild(this.detailPanel);
    this.resetMenu(LevelData.all()[0]);
  }

  private initMenu() {
    const visible = "inherit";
    const invisible = "none";
    this.addAction(ModelType.FRAGMENT, "+ ActorBody",
      () => {
        this.activateAction((point) => {
          const actorData = {
            data: [ point.x, point.y, 20, 10 ],
            id: this.createID("kbody"),
            type: DataType.KINEMATIC_BOX,
          };
          this.data.kinematics().bodies.push(actorData);
          const bodySvg = this.processor.processKinematics({
            actors: [],
            bodies: [ actorData ],
            sensors: [],
          })[0];
          this.objects.kinematicBodies.push(bodySvg);
          bodySvg.setAttributeNS(null, "transform", `translate(${point.x} ${point.y})`);
          this.bindObject(ModelType.FRAGMENT, bodySvg);
        });
      },
      () => visible);
    this.addAction(ModelType.BOX, "+ Box",
      () => {
        this.activateAction((point) => {
          const box = [ point.x, point.y ];
          const raw = this.data.raw();
          if (!raw.boxes) {
            raw.boxes = [];
          }
          raw.boxes.push(box);
          const boxSvg = this.processor.processBoxes([ box ])[0];
          this.objects.boxes.push(boxSvg);
          SVGSupport.setAttributes(boxSvg, {
            x: box[0],
            y: box[1],
          });
          this.bindObject(ModelType.BOX, boxSvg);
        });
      },
      () => visible);
    this.addAction(ModelType.COLLECTOR, "+ Collector",
      () => {
        this.activateAction((point) => {
          this.data.setCollector(point);
          this.objects.collector = this.processor.processCollector(this.data.collector());
          this.bindObject(ModelType.COLLECTOR, this.objects.collector);
        });
      },
      () => this.data.raw().collector ? invisible : visible);
    this.addAction(ModelType.FUEL_POD, "+ Fuel pod",
      () => {
        this.activateAction((point) => {
          const pod = {
            density: 1,
            fuel: 10,
            id: this.createID("genFuel"),
            position: planck.Vec2(point.x, point.y),
          };
          this.data.fuelPods().push(pod);
          const podSvg = this.processor.processFuelPods([ pod ])[0];
          this.objects.pods.push(podSvg);
          this.bindObject(ModelType.FUEL_POD, podSvg);
        });
      },
      () => visible);
    this.addAction(ModelType.LANDSCAPE, "+ Landscape",
      () => {
        this.activateAction((point) => {
          const path = {
            data: [ [ point.x, point.y ], [ point.x + 30, point.y] ],
            type: DataType.LANDSCAPE_PATH,
          };
          this.data.landscape().data.push(path);
          const landscapeSvg = this.processor.processLandscape({
            data: [ path ],
            dimension: undefined,
            properties: undefined,
          })[0];
          this.objects.landscapes.push(landscapeSvg);
          this.bindObject(ModelType.LANDSCAPE, landscapeSvg);
        });
      },
      () => visible);
    this.addAction(ModelType.ROCKET, "+ Rocket",
      () => {
        this.activateAction((point) => {
          this.data.setRocket({
            angle: 0,
            angularDamping: 2,
            position: point,
            userData: {
              requiredFuel: 10,
            },
          });
          this.objects.rocket = this.processor.processRocket(this.data.rocket());
          this.bindObject(ModelType.ROCKET, this.objects.rocket);
        });
      },
      () => this.data.rocket() ? invisible : visible);
    this.addAction(ModelType.SENSOR, "+ Sensor",
      () => {
        this.activateAction((point) => {
          const sensor = {
            enabled: true,
            id: this.createID("genSensor"),
            position: planck.Vec2(point.x, point.y),
          };
          this.data.kinematics().sensors.push(sensor);
          const sensorSvg = this.processor.processKinematics({
            actors: [],
            bodies: [],
            sensors: [ sensor ],
          })[0];
          this.objects.sensors.push(sensorSvg);
          SVGSupport.setAttributes(sensorSvg, {
            cx: sensor.position.x,
            cy: sensor.position.y,
          });
          this.bindObject(ModelType.SENSOR, sensorSvg);
        });
      },
      () => visible);
    this.addAction(ModelType.SHUTTLE, "+ Shuttle",
      () => {
        this.activateAction((point) => {
          this.data.setShuttle({
            angle: 0,
            angularDamping: 2,
            linearDamping: 0.75,
            position: point,
            userData: {
              maxFuel: 1000,
            },
          });
          this.objects.shuttle = this.processor.processShuttle(this.data.shuttle());
          this.bindObject(ModelType.SHUTTLE, this.objects.shuttle);
        });
      },
      () => this.data.shuttle() ? invisible : visible);
    this.addAction(ModelType.STATION, "+ Station",
      () => {
        this.activateAction((point) => {
          this.data.addStation(planck.Vec2(point.x, point.y));
          const station = this.data.stations()[this.data.stations().length - 1];
          const stationSvg = this.processor.processStations([ station ])[0];
          this.objects.stations.push(stationSvg);
          stationSvg.setAttributeNS(null, "transform", `translate(${station.position.x} ${station.position.y})`);
          this.bindObject(ModelType.STATION, stationSvg);
        });
      },
      () => visible);
    const help = HTMLSupport.createElement("ul", {
      style: "position: absolute; bottom: 0; left: -32px; font-size: small; list-style: none;",
    });
    for (const line of [
      ". zooms in",
      "- zooms out",
      "0 resets zoom",
      "1 centers view",
      "2 centers and zooms on selection",
      "<hr/>",
      "click item to select",
      "use cursor keys to move selection",
      "del deletes selection",
      "ctrl/shift moves fast",
      "click and drag to move view",
      "<hr/>",
      "ctrl+cursor moves vertex selection",
      "ctrl+del deletes vertex",
      "shift+del removes vertex selection",
      "l/r amends path left/right",
      "s/m splits/merges path",
      "<hr/>",
      "d copies level to clipboard",
    ]) {
      const item = HTMLSupport.createElement("li");
      item.innerHTML = line;
      help.appendChild(item);
    }
    this.menuPanel.appendChild(help);
  }

  private initDetails() {
    this.details = HTMLSupport.createElement("textarea", {
      cols: 30,
      id: "details",
      rows: 16,
      style: "background-color: #633; position: absolute; top: 40px; color: #ea3;",
    }) as HTMLTextAreaElement;
    this.details.disabled = true;
    this.detailPanel.appendChild(this.details);
    this.detailPanel.appendChild(HTMLSupport.createElement("br"));
    this.updateDetails = HTMLSupport.createElement("button", { type: "button" }) as HTMLButtonElement;
    this.updateDetails.innerText = "update";
    this.updateDetails.disabled = true;
    this.updateDetails.onclick = () => {
      this.updateSelectionDetails();
    };
    this.detailPanel.appendChild(this.updateDetails);

    const edit = HTMLSupport.createElement("div", {
      style: "position: absolute; bottom: 0;",
    });
    const levelProps: Set<string> = new Set();
    for (const name of [
      "gravity",
      "instructions",
      "name",
      "steppers",
      "timeLimit",
      "zoom",
    ]) {
      levelProps.add(name);
    }
    const landscapeProps: Set<string> = new Set();
    for (const name of [
      "dimension",
      "properties",
    ]) {
      landscapeProps.add(name);
    }
    edit.appendChild(this.addEditAction(
      "\u270e Level settings", () => this.data.raw(), (s) => levelProps.has(s)));
    edit.appendChild(this.addEditAction(
      "\u270e Landscape settings", () => this.data.landscape(), (s) => landscapeProps.has(s)));
    edit.appendChild(this.addEditAction(
      "\u270e Actor scripts", () => {
        let kinematics = this.data.kinematics();
        if (!kinematics) {
          this.data.raw().kinematics = {};
          kinematics = this.data.kinematics();
        }
        for (const prop of [ "actors", "bodies", "sensors" ]) {
          if (!kinematics[prop]) {
            kinematics[prop] = [];
          }
        }
        this.showSensorsAndActors();
        return kinematics.actors;
      }, () => true));
    edit.appendChild(HTMLSupport.createElement("p"));
    const levelChooser = HTMLSupport.createElement("select") as HTMLSelectElement;
    const all = LevelData.all();
    for (let i = 0; i < all.length; i++) {
      const option = HTMLSupport.createElement("option", {
        value: i.toString(10),
      });
      option.innerText = all[i].name();
      levelChooser.appendChild(option);
    }
    const create = HTMLSupport.createElement("option", {
      value: "create",
    });
    create.innerText = "<new level>";
    levelChooser.appendChild(create);
    levelChooser.onchange = (event) => {
      const select = event.target as HTMLSelectElement;
      const levels = LevelData.all();
      if (select.selectedIndex === levels.length) {
        const newLevel = new LevelData({
          fuelPods: [],
          gravity: planck.Vec2(0, -8),
          instructions: {
            success: "level complete",
            welcome: [ "welcome" ],
          },
          kinematics: {
            actors: [],
            bodies: [],
            sensors: [],
          },
          landscape: {
            data: [],
            dimension: {
              height: 800,
              width: 1024,
              x: -512,
              y: -400,
            },
            properties: {
              density: 1,
              friction: 1,
              restitution: 0.5,
            },
          },
          name: this.createID("levelName"),
          stations: [],
          timeLimit: 0,
          zoom: 1,
        });
        levels.push(newLevel);
        const newOption = HTMLSupport.createElement("option", {
          value: select.selectedIndex.toString(10),
        }) as HTMLOptionElement;
        newOption.innerText = newLevel.name();
        levelChooser.add(newOption, select.selectedIndex);
        newOption.setAttribute("selected", "selected");
        this.resetMenu(newLevel);
      } else {
        this.resetMenu(levels[select.selectedIndex]);
      }
    };
    edit.appendChild(levelChooser);
    edit.appendChild(HTMLSupport.createElement("p"));
    this.detailPanel.append(edit);
  }

  private addEditAction(label: string, getter: TargetGetter, filter: PropertyFilter): HTMLElement {
    const result = HTMLSupport.createElement("div");
    result.innerText = label;
    result.onclick = () => {
      this.resetSelection();
      const target = getter.apply(undefined);
      if (target) {
        this.selection = { target };
        const copy = JSON.parse(JSON.stringify(target));
        for (const property in copy) {
          if (copy.hasOwnProperty(property) && !filter.apply(undefined, [ property ])) {
            delete copy[property];
          }
        }
        this.details.value = JSON.stringify(copy, undefined, 2);
        this.updateDetails.disabled = false;
        this.details.disabled = false;
      }
    };
    return result;
  }

  private showSensorsAndActors(): void {
    // reuse the vertex layer for temporary information
    SVGSupport.removeChildren(this.vertexLayer);
    const textFor: Map<string, SVGElement> = new Map();
    for (const actor of this.data.kinematics().actors) {
      const sensor = this.svg.querySelector(`#${actor.on}`);
      if (sensor) {
        const pos = planck.Vec2(
          parseInt(sensor.getAttributeNS(null, "cx"), 10),
          parseInt(sensor.getAttributeNS(null, "cy"), 10));
        const perPhase: Array<Set<string>> = [];
        for (const phase of actor.phases) {
          const parties: Set<string> = new Set();
          for (const instr of phase.split(";")) {
            const target = instr.split("~")[0].trim();
            if (target !== actor.on) { // only consider non-self-references
              parties.add(target);
            }
          }
          perPhase.push(parties);
        }
        for (let i = 0; i < perPhase.length; i++) {
          perPhase[i].forEach((id) => {
            const candidate = this.svg.querySelector(`#${id}`);
            if (candidate) {
              let targetPos;
              switch (candidate.nodeName) {
              case "circle":
                targetPos = planck.Vec2(
                  parseInt(candidate.getAttributeNS(null, "cx"), 10),
                  parseInt(candidate.getAttributeNS(null, "cy"), 10));
                break;
              case "g":
                const match = Editor.TRANSLATE.exec(candidate.getAttributeNS(null, "transform"));
                if (match.length > 1) {
                  const coords = match[1].split(" ");
                  targetPos = planck.Vec2(parseInt(coords[0], 10), parseInt(coords[1], 10));
                }
                break;
              default:
                throw new Error("cannot handle " + id);
              }
              const line = SVGSupport.createElement("line", {
                "opacity": 0.75,
                "stroke": "#7a7",
                "stroke-dasharray": "4",
                "x1": pos.x,
                "x2": targetPos.x,
                "y1": pos.y,
                "y2": targetPos.y,
              }) as SVGGraphicsElement;
              this.vertexLayer.appendChild(line);
              const key = id + actor.on;
              let text = textFor.get(key);
              if (!text) {
                const rect = line.getBBox();
                text = SVGSupport.createElement("text", {
                  "fill": "yellow",
                  "stroke": "transparent",
                  "text-align": "middle",
                  "x": rect.x + rect.width / 2,
                  "y": rect.y + rect.height / 2,
                });
                text.textContent = (1 + i).toString(10);
                this.vertexLayer.appendChild(text);
                textFor.set(key, text);
              } else {
                text.textContent += " " + (1 + i).toString(10);
              }
            }
          });
        }
      }
    }
  }

  private handleUpdateSettings(): void {
    let update;
    try {
      update = JSON.parse(this.details.value);
    } catch (error) {
      window.alert(error.toString());
      return;
    }
    for (const key in update) {
      if (update.hasOwnProperty(key)) {
        this.selection.target[key] = update[key];
      }
    }
    this.resetSelection();
    this.renderLevelDimensions();
  }

  private activateAction(action: PlaceAction): void {
    this.svg.style.cursor = "crosshair";
    this.placeAction = action;
  }

  private updateActionVisibility(): void {
    this.actionVisibility.forEach((visibility, id) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = visibility.apply(undefined);
        element.style.fontWeight = "normal";
      }
    });
  }

  private resetMenu(levelData: LevelData): void {
    this.data = levelData;
    this.resetSVG();
    this.resetSelection();
    this.updateSelectionDetails();
    this.updateActionVisibility();
  }

  private addAction(type: ModelType, label: string, action: (event: Event) => void, visibility: () => string): void {
    const id = `action${type}`;
    const element = HTMLSupport.createElement("div", { id });
    element.innerText = label;
    element.onclick = (evt) => {
      for (const actionID of this.actionVisibility.keys()) {
        document.getElementById(actionID).style.fontWeight = "normal";
      }
      document.getElementById(id).style.fontWeight = "bold";
      action.apply(undefined, [ evt ]);
    };
    this.menuPanel.appendChild(element);
    this.actionVisibility.set(id, visibility);
  }

  private resetSVG(): void {
    if (this.svg) {
      // remove old SVG
      SVGSupport.removeElement(this.svg);
    }
    // create a new processor
    const panel: HTMLElement = document.querySelector("#panel");
    this.processor = new SVGProcessor();
    this.svg = this.processor.root();
    this.svg.style.cursor = "inherit";
    this.renderLevelDimensions();
    this.svg.onmousemove = (event) => {
      if (event.buttons === 1 && this.lastClick) {
        this.updateCamera(event);
      }
    };
    this.svg.onmousedown = (event) => {
      this.lastClick = planck.Vec2(event.clientX, event.clientY);
      this.lastCameraPosition = this.camera.center().clone();
      if (this.placeAction) {
        const imgRect = this.svg.getBoundingClientRect();
        const box = this.svg.getAttribute("viewBox").split(" ").map((e) => parseInt(e, 10));
        const point = planck.Vec2(
          Math.round(box[0] + box[2] * (event.pageX - imgRect.left) / SVGProcessor.WIDTH),
          Math.round(box[1] + box[3] * (event.pageY - imgRect.top) / SVGProcessor.HEIGHT));
        this.svg.style.cursor = "pointer";
        this.placeAction.apply(undefined, [ point ]);
        this.updateActionVisibility();
        this.placeAction = undefined;
      }
    };
    this.svg.onmouseup = () => this.lastClick = undefined;
    panel.appendChild(this.svg);
    HTMLSupport.setStyleAttributes(panel, {
      border: "1px solid #888",
      height: this.svg.getAttributeNS(null, "height") + "px",
      width: this.svg.getAttributeNS(null, "width") + "px",
    });
    // prepare selection visuals
    this.selectionSymbol = SVGSupport.createElement("g", {
      "pointer-events": "none",
      "transform": "translate(-65536, -65536)",
    });
    const circle = SVGSupport.createElement("circle", {
      "cx": 0,
      "cy": 0,
      "fill": "transparent",
      "opacity": 0.75,
      "r": 16,
      "stroke": "white",
      "stroke-dasharray": 5,
      "stroke-width": 2.5,
    });
    const anim = SVGSupport.createElement("animateTransform", {
      attributeName: "transform",
      attributeType: "XML",
      dur: "5",
      from: "0 0 0",
      repeatCount: "indefinite",
      to: "360 0 0",
      type: "rotate",
    });
    this.selectionSymbol.appendChild(SVGSupport.createElement("circle", {
      cx: 0,
      cy: 0,
      fill: "white",
      opacity: 0.75,
      r: 1.5,
      stroke: "transparent",
    }));
    this.selectionSymbol.appendChild(circle);
    circle.appendChild(anim);
    this.svg.appendChild(this.selectionSymbol);
    // process the level
    const data = this.data;
    // reset level tracking objects
    this.objects = {};
    const landscape = data.landscape();
    this.objects.landscapes = this.processor.processLandscape(landscape);
    this.objects.shuttle = this.processor.processShuttle(data.shuttle());
    this.objects.rocket = this.processor.processRocket(data.rocket());
    this.objects.collector = this.processor.processCollector(data.collector());
    this.objects.pods = this.processor.processFuelPods(data.fuelPods());
    const boxes = data.boxes();
    if (boxes) {
      // what a hack
      this.objects.boxes = this.processor.processBoxes(boxes);
      for (let i = boxes.length; --i >= 0; ) {
        SVGSupport.setAttributes(this.objects.boxes[i], {
          x: boxes[i][0],
          y: boxes[i][1],
        });
      }
    }
    this.objects.stations = this.processor.processStations(data.stations());
    const kinematics = this.processor.processKinematics(data.kinematics());
    this.objects.kinematicBodies = kinematics.filter(
      (e) => e.getAttributeNS(null, "data-type") !== ModelType.SENSOR.toString(10));
    this.objects.sensors = kinematics.filter(
      (e) => e.getAttributeNS(null, "data-type") === ModelType.SENSOR.toString(10));
    this.bindObjects();

    this.camera = new Camera(this.svg, landscape ? Camera.VIEW_WIDTH / landscape.dimension.width : 1);
    this.camera.update();

    // prepare the vertex layer
    this.vertexLayer = SVGSupport.createElement("g", {
      fill: "red",
      stroke: "transparent",
    });
    this.svg.appendChild(this.vertexLayer);
  }

  private bindObjects(): void {
    // FRAGMENT is abused for actor bodies!
    this.bindObject(ModelType.FRAGMENT, ...this.objects.kinematicBodies);
    this.bindObject(ModelType.BOX, ...this.objects.boxes);
    this.bindObject(ModelType.COLLECTOR, this.objects.collector);
    this.bindObject(ModelType.LANDSCAPE, ...this.objects.landscapes);
    this.bindObject(ModelType.FUEL_POD, ...this.objects.pods);
    this.bindObject(ModelType.ROCKET, this.objects.rocket);
    this.bindObject(ModelType.SENSOR, ...this.objects.sensors);
    this.bindObject(ModelType.SHUTTLE, this.objects.shuttle);
    this.bindObject(ModelType.STATION, ...this.objects.stations);
  }

  private bindObject(type: ModelType, ...objects: SVGElement[]): void {
    if (objects) {
      objects
        .filter((e) => e !== undefined)
        .forEach((element) => {
          const handler = this.clickActions.get(type);
          if (handler) {
            element.onclick = handler;
          }
        });
    }
  }

  private keyEvent(event: KeyboardEvent): void {
    let factor = 1;
    if (event.shiftKey) {
      factor = 10;
    } else if (event.ctrlKey) {
      factor = 50;
    }
    switch (event.key) {
    case "0":
      if (this.data) {
        this.camera.zoom = Camera.VIEW_WIDTH / this.data.landscape().dimension.width;
        this.camera.update();
      }
      break;
    case "1":
      if (this.data) {
        const pos = this.camera.center();
        pos.x = 0;
        pos.y = 0;
        this.camera.update();
      }
      break;
    case "2":
      if (this.data && this.selection) {
        const pos = this.camera.center();
        pos.x = this.selection.position.x / SVGProcessor.SCALE;
        pos.y = this.selection.position.y / -SVGProcessor.SCALE;
        this.camera.zoom = 3;
        this.camera.update();
      }
      break;
    case "ArrowDown":
      if (this.selection) {
        this.move(Direction.DOWN, factor);
      }
      break;
    case "ArrowLeft":
      if (this.selection) {
        this.move(Direction.LEFT, factor, event);
      }
      break;
    case "ArrowRight":
      if (this.selection) {
        this.move(Direction.RIGHT, factor, event);
      }
      break;
    case "ArrowUp":
      if (this.selection) {
        this.move(Direction.UP, factor);
      }
      break;
    case "Delete":
      if (this.selection) {
        this.remove(event);
      }
      break;
    case "d":
      this.toClipboard();
      break;
    case "l":
      this.amendPath(Direction.LEFT);
      break;
    case "m":
      this.mergePath();
      break;
    case "r":
      this.amendPath(Direction.RIGHT);
      break;
    case "s":
      this.splitPath();
      break;
    case ".":
      this.camera.zoom += 0.25;
      this.camera.update();
      break;
    case "-":
      this.camera.zoom = Math.max(0.25, this.camera.zoom - 0.25);
      this.camera.update();
      break;
    default:
      // console.log("i see", event.key);
      break;
    }
  }

  private svgClicked(event: MouseEvent, modelType?: ModelType): void {
    let current = event.target as SVGElement;
    if (modelType !== undefined) {
      SVGSupport.removeChildren(this.vertexLayer);
      switch (modelType) {
      case ModelType.BOX:
        this.select(current, modelType, (svg) => planck.Vec2(
          5 + parseInt(svg.getAttributeNodeNS(null, "x").textContent, 10),
          5 + parseInt(svg.getAttributeNodeNS(null, "y").textContent, 10)));
        break;
      case ModelType.LANDSCAPE:
        this.select(current, modelType, (svg) => {
          const bounds = (svg as SVGGraphicsElement).getBBox();
          return planck.Vec2(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        });
        if (this.selection) {
          this.buildVertices();
        }
        break;
      case ModelType.SENSOR:
        this.select(current, modelType, (svg) => planck.Vec2(
          parseInt(svg.getAttributeNodeNS(null, "cx").textContent, 10),
          parseInt(svg.getAttributeNodeNS(null, "cy").textContent, 10)));
        break;
      case ModelType.FUEL_POD:
      case ModelType.FRAGMENT: // hack, this is a kinematic body
      case ModelType.COLLECTOR:
      case ModelType.ROCKET:
      case ModelType.SHUTTLE:
      case ModelType.STATION:
        current = this.findGroup(current);
        if (current) {
          this.select(current, modelType, (svg) => {
            const match = Editor.TRANSLATE.exec(svg.getAttributeNS(null, "transform"));
            if (match.length > 1) {
              const coords = match[1].split(" ");
              return planck.Vec2(parseInt(coords[0], 10), parseInt(coords[1], 10));
            }
            return planck.Vec2.zero();
          });
        }
        break;
      default:
        throw new Error("unknown model type for click handling");
        break;
      }
      event.stopPropagation();
    }
  }

  private select(svg: SVGElement, type: ModelType, getter: TransformGetter): void {
    if (this.selection && this.selection.svg === svg) {
      this.resetSelection();
      return;
    }
    const position = getter.apply(undefined, [ svg ]) as planck.Vec2;
    if (position) {
      this.selectionSymbol.setAttributeNS(null, "transform", `translate(${position.x} ${position.y})`);
      this.selection = {
        position,
        svg,
        type,
      };
      let arr = [];
      switch (type) {
      case ModelType.BOX:
        arr = this.objects.boxes;
        break;
      case ModelType.FUEL_POD:
        arr = this.objects.pods;
        break;
      case ModelType.FRAGMENT: // actors...
        arr = this.objects.kinematicBodies;
        break;
      case ModelType.LANDSCAPE:
        arr = this.objects.landscapes;
        this.selection.vertex = 0;
        break;
      case ModelType.SENSOR:
        arr = this.objects.sensors;
        break;
      case ModelType.STATION:
        arr = this.objects.stations;
        break;
      default:
        break;
      }
      this.selection.index = arr.indexOf(svg);
      this.details.value = this.selectionProperties();
      const enabled = this.details.value === "";
      this.updateDetails.disabled = enabled;
      this.details.disabled = enabled;
    }
  }

  private selectionProperties(): string {
    const idx = this.selection.index;
    let result: any;
    switch (this.selection.type) {
    case ModelType.BOX:
      result = this.data.boxes()[idx];
      break;
    case ModelType.FUEL_POD:
      result = this.data.fuelPods()[idx];
      break;
    case ModelType.FRAGMENT: // actors...
      result = this.data.kinematics().bodies[idx];
      break;
    case ModelType.LANDSCAPE:
      const landscape = this.data.landscape().data[idx];
      result = JSON.parse(JSON.stringify(landscape));
      // drop the path/polygon info on the copy
      delete result.data;
      break;
    case ModelType.SENSOR:
      result = this.data.kinematics().sensors[idx];
      break;
    case ModelType.STATION:
      // this just has a position and static data
      break;
    case ModelType.COLLECTOR:
      // this just has a position
      break;
    case ModelType.ROCKET:
      result = this.data.rocket();
      break;
    case ModelType.SHUTTLE:
      result = this.data.shuttle();
      break;
    default:
      break;
    }
    return result ? JSON.stringify(result, undefined, 2) : "";
  }

  private updateSelectionDetails(): void {
    if (this.selection) {
      if (this.selection.target) {
        this.handleUpdateSettings();
        return;
      }
      const idx = this.selection.index;
      let newData;
      try {
        newData = JSON.parse(this.details.value);
      } catch (error) {
        window.alert(error.toString());
        return;
      }
      delete newData.position; // generally ignore position modifications
      switch (this.selection.type) {
      case ModelType.BOX:
        const values = newData as number[];
        const box = this.data.boxes()[idx];
        if (values.length > 2) {
          for (let i = 2; i < values.length; i++) {
            box[i] = values[i];
          }
          // need to render because potentially properties changed
          // which define the looks of the element
          const boxSvg = this.processor.processBoxes([ box ])[0];
          SVGSupport.removeElement(this.objects.boxes[idx]);
          this.bindObject(ModelType.BOX, boxSvg);
          this.objects.boxes[idx] = boxSvg;
          SVGSupport.setAttributes(boxSvg, {
            x: box[0],
            y: box[1],
          });
        }
        break;
      case ModelType.FUEL_POD:
        const pod = this.data.fuelPods()[idx];
        newData.position = pod.position;
        this.data.raw().fuelPods[idx] = newData;
        const podSvg = this.processor.processFuelPods([ newData ])[0];
        SVGSupport.removeElement(this.objects.pods[idx]);
        this.objects.pods[idx] = podSvg;
        SVGSupport.setAttributes(podSvg, {
          cx: newData.position.x,
          cy: newData.position.y,
        });
        this.bindObject(this.selection.type, podSvg);
        break;
      case ModelType.FRAGMENT: // actorbodies...
        this.data.kinematics().bodies[idx] = newData;
        // need to render because potentially properties changed
        // which define the looks of the element
        const bodySvg = this.processor.processKinematics({
          actors: [],
          bodies: [ newData ],
          sensors: [],
        })[0];
        SVGSupport.removeElement(this.objects.kinematicBodies[idx]);
        this.objects.kinematicBodies[idx] = bodySvg;
        bodySvg.setAttributeNS(
          null,
          "transform",
          bodySvg.getAttributeNS(null, "transform")
            .replace(Editor.TRANSLATE, `translate(${newData.data[0]} ${newData.data[1]})`));
        this.selectionSymbol.setAttributeNS(null, "transform", `translate(${newData.data[0]} ${newData.data[1]})`);
        this.bindObject(this.selection.type, bodySvg);
        break;
      case ModelType.LANDSCAPE:
        const oldLandscape = this.data.landscape().data[idx];
        let changed = false;
        for (const key in newData) {
          if (newData.hasOwnProperty(key)) {
            if (oldLandscape[key] !== newData[key]) {
              changed = true;
              oldLandscape[key] = newData[key];
            }
          }
        }
        if (changed) {
          this.data.landscape().data[idx].type = newData.type;
          SVGSupport.removeElement(this.objects.landscapes[idx]);
          const landscapeSvg = this.processor.processLandscape({
            data: [ this.data.landscape().data[idx] ],
            dimension: undefined,
            properties: undefined,
          })[0];
          this.objects.landscapes[idx] = landscapeSvg;
          this.bindObject(this.selection.type, landscapeSvg);
        }
        break;
      case ModelType.SENSOR:
        const sensor = this.data.kinematics().sensors[idx];
        newData.position = sensor.position;
        this.data.kinematics().sensors[idx] = newData;
        break;
      case ModelType.STATION:
        // this just has a position and static data
        break;
      case ModelType.COLLECTOR:
        // this just has a position
        break;
      case ModelType.ROCKET:
        newData.position = this.data.rocket().position;
        this.data.raw().rocket = newData;
        this.objects.rocket.setAttributeNS(
          null,
          "transform",
          this.objects.rocket.getAttributeNS(null, "transform")
            .replace(Editor.ROTATE, `rotate(${newData.angle})`));
        break;
      case ModelType.SHUTTLE:
        newData.position = this.data.shuttle().position;
        this.data.raw().shuttle = newData;
        this.objects.shuttle.setAttributeNS(
          null,
          "transform",
          this.objects.shuttle.getAttributeNS(null, "transform")
            .replace(Editor.ROTATE, `rotate(${newData.angle})`));
        break;
      default:
        break;
      }
    } else {
      this.details.value = "";
      this.updateDetails.disabled = true;
      this.details.disabled = true;
    }
  }

  private findGroup(element: SVGElement): SVGElement {
    let result = element;
    while (result && result.tagName !== "g") {
      result = (result.parentElement as any) as SVGElement;
    }
    return result;
  }

  private amendPath(direction: Direction): void {
    if (this.selection && this.selection.vertex >= 0) {
      const path = this.data.landscape().data[this.selection.index].data;
      if (direction === Direction.LEFT) {
        path.unshift([
          2 * path[0][0] - path[1][0],
          2 * path[0][1] - path[1][1],
        ]);
        this.selection.vertex = 0;
      } else {
        const pos = path.length - 2;
        path.push([
          2 * path[pos + 1][0] - path[pos][0],
          2 * path[pos + 1][1] - path[pos][1],
        ]);
        this.selection.vertex = path.length - 1;
      }
      this.renderPathAndVertices(path);
    }
  }

  private splitPath(): void {
    if (this.selection && this.selection.vertex > 0) {
      const path = this.data.landscape().data[this.selection.index].data;
      let idx = this.selection.vertex;
      const a = planck.Vec2(path[idx][0], path[idx][1]);
      idx--;
      const b = planck.Vec2(path[idx][0], path[idx][1]).sub(a).mul(0.5);
      path.splice(idx + 1, 0, [
        path[idx][0] - b.x,
        path[idx][1] - b.y,
      ]);
      this.renderPathAndVertices(path);
    }
  }

  private mergePath(): void {
    if (this.selection && this.selection.vertex > 1) {
      const path = this.data.landscape().data[this.selection.index].data;
      path.splice(this.selection.vertex, 1);
      this.selection.vertex--;
      this.renderPathAndVertices(path);
    }
  }

  private renderPathAndVertices(path: number[][]): void {
    // re-render path and update vertices
    SVGSupport.removeChildren(this.vertexLayer);
    this.buildVertices();
    this.repaintLandscape(path);
  }

  private buildVertices(): void {
    this.objects.vertices = [];
    for (const pos of this.data.landscape().data[this.selection.index].data) {
      const vertex = SVGSupport.createElement("circle", {
        cx: pos[0],
        cy: pos[1],
        r: 2.5,
      });
      this.objects.vertices.push(vertex);
      this.vertexLayer.appendChild(vertex);
    }
    SVGSupport.setAttributes(this.objects.vertices[this.selection.vertex], { fill: "yellow" });
  }

  private move(direction: Direction, factor: number, event?: KeyboardEvent): void {
    if (event && this.selection.vertex >= 0) {
      if (event.ctrlKey) {
        this.moveVertexCursor(direction);
        return;
      }
      if (factor === 1) {
        factor = 5;
      }
    }
    let delta = this.directions.get(direction);
    if (factor > 1) {
      delta = delta.clone().mul(factor);
    }
    let updateSelectionCursor = true;
    switch (this.selection.type) {
    case ModelType.BOX:
      const boxes = this.data.boxes()[this.selection.index];
      boxes[0] += delta.x;
      boxes[1] += delta.y;
      SVGSupport.setAttributes(this.selection.svg, {
        x: boxes[0],
        y: boxes[1],
      });
      break;
    case ModelType.LANDSCAPE:
      // vertex move
      if (this.selection.vertex >= 0) {
        const path = this.data.landscape().data[this.selection.index].data;
        path[this.selection.vertex][0] += delta.x;
        path[this.selection.vertex][1] += delta.y;
        this.repaintLandscape(path);
        SVGSupport.setAttributes(this.objects.vertices[this.selection.vertex], {
          cx: path[this.selection.vertex][0],
          cy: path[this.selection.vertex][1],
        });
        updateSelectionCursor = false;
      } else {
        const path = this.data.landscape().data[this.selection.index].data;
        for (const coordinates of path) {
          coordinates[0] += delta.x;
          coordinates[1] += delta.y;
        }
        this.repaintLandscape(path);
      }
      const bounds = (this.objects.landscapes[this.selection.index] as SVGGraphicsElement).getBBox();
      this.selectionSymbol.setAttributeNS(
        null,
        "transform",
        `translate(${bounds.x + bounds.width / 2}, ${bounds.y + bounds.height / 2})`);
      break;
    case ModelType.FUEL_POD:
      const pod = this.data.fuelPods()[this.selection.index];
      pod.position.x += delta.x;
      pod.position.y += delta.y;
      this.selection.svg.setAttributeNS(
        null,
        "transform",
        this.selection.svg.getAttributeNS(null, "transform")
          .replace(Editor.TRANSLATE, `translate(${pod.position.x} ${pod.position.y})`));
      break;
    case ModelType.SENSOR:
      const sensors = this.data.kinematics().sensors;
      sensors[this.selection.index].position.x += delta.x;
      sensors[this.selection.index].position.y += delta.y;
      SVGSupport.setAttributes(this.selection.svg, {
        cx: sensors[this.selection.index].position.x,
        cy: sensors[this.selection.index].position.y,
      });
      break;
    case ModelType.FRAGMENT:
      const kBody = this.data.kinematics().bodies[this.selection.index];
      kBody.data[0] += delta.x;
      kBody.data[1] += delta.y;
      this.selection.svg.setAttributeNS(
        null,
        "transform",
        this.selection.svg.getAttributeNS(null, "transform")
          .replace(Editor.TRANSLATE, `translate(${kBody.data[0]} ${kBody.data[1]})`));
      break;
    case ModelType.COLLECTOR:
      const collectorPos = this.data.collector().position;
      collectorPos.x += delta.x;
      collectorPos.y += delta.y;
      this.selection.svg.setAttributeNS(
        null,
        "transform",
        this.selection.svg.getAttributeNS(null, "transform")
          .replace(Editor.TRANSLATE, `translate(${collectorPos.x} ${collectorPos.y})`));
      break;
    case ModelType.ROCKET:
      const rocketPos = this.data.rocket().position;
      rocketPos.x += delta.x;
      rocketPos.y += delta.y;
      this.selection.svg.setAttributeNS(
        null,
        "transform",
        this.selection.svg.getAttributeNS(null, "transform")
          .replace(Editor.TRANSLATE, `translate(${rocketPos.x} ${rocketPos.y})`));
      break;
    case ModelType.SHUTTLE:
      const shuttlePos = this.data.shuttle().position;
      shuttlePos.x += delta.x;
      shuttlePos.y += delta.y;
      this.selection.svg.setAttributeNS(
        null,
        "transform",
        this.selection.svg.getAttributeNS(null, "transform")
          .replace(Editor.TRANSLATE, `translate(${shuttlePos.x} ${shuttlePos.y})`));
      break;
    case ModelType.STATION:
      const station = this.data.stations()[this.selection.index];
      station.position.x += delta.x;
      station.position.y += delta.y;
      this.selection.svg.setAttributeNS(null, "transform", `translate(${station.position.x} ${station.position.y})`);
      break;
    default:
      throw new Error("unknown model type for moving");
    }
    if (updateSelectionCursor) {
      this.selection.position.add(delta);
      this.selectionSymbol.setAttributeNS(
        null,
        "transform",
        `translate(${this.selection.position.x} ${this.selection.position.y})`);
    }
    this.details.value = this.selectionProperties();
  }

  private moveVertexCursor(direction: Direction): void {
    const last = this.objects.vertices[this.selection.vertex];
    this.selection.vertex =
      (this.selection.vertex + (direction === Direction.RIGHT ? 1 : -1)) % this.objects.vertices.length;
    if (this.selection.vertex < 0) {
      this.selection.vertex += this.objects.vertices.length;
    }
    SVGSupport.setAttributes(last, { fill: "red" });
    SVGSupport.setAttributes(this.objects.vertices[this.selection.vertex], { fill: "yellow" });
  }

  private resetSelection(): void {
    this.selection = undefined;
    this.selectionSymbol.setAttributeNS(null, "transform", "translate(-65536, -65536)");
    this.updateDetails.disabled = true;
    this.details.disabled = true;
    this.details.value = "";
    SVGSupport.removeChildren(this.vertexLayer);
    this.panel.focus();
  }

  private remove(event: KeyboardEvent): void {
    if (event.ctrlKey && this.selection.vertex >= 0) {
      if (this.objects.vertices.length < 3) {
        return;
      }
      SVGSupport.removeElement(this.objects.vertices[this.selection.vertex]);
      this.objects.vertices.splice(this.selection.vertex, 1);
      const path = this.data.landscape().data[this.selection.index].data;
      path.splice(this.selection.vertex, 1);
      if (this.selection.vertex >= this.objects.vertices.length) {
        this.selection.vertex--;
      }
      SVGSupport.setAttributes(this.objects.vertices[this.selection.vertex], { fill: "yellow" });
      this.repaintLandscape(path);
      return;
    }
    if (event.shiftKey && this.selection.vertex >= 0) {
      this.selection.vertex = -1;
      SVGSupport.removeChildren(this.vertexLayer);
      return;
    }
    let dataArr;
    let objArr;
    switch (this.selection.type) {
    case ModelType.BOX:
      dataArr = this.data.boxes();
      objArr = this.objects.boxes;
      break;
    case ModelType.LANDSCAPE:
      dataArr = this.data.landscape().data;
      objArr = this.objects.landscapes;
      break;
    case ModelType.FUEL_POD:
      dataArr = this.data.fuelPods();
      objArr = this.objects.pods;
      break;
    case ModelType.SENSOR:
      dataArr = this.data.kinematics().sensors;
      objArr = this.objects.sensors;
      break;
    case ModelType.FRAGMENT:
      dataArr = this.data.kinematics().bodies;
      objArr = this.objects.kinematicBodies;
      break;
    case ModelType.COLLECTOR:
      delete this.data.raw().collector;
      break;
    case ModelType.ROCKET:
      delete this.data.raw().rocket;
      break;
    case ModelType.SHUTTLE:
      delete this.data.raw().shuttle;
      break;
    case ModelType.STATION:
      dataArr = this.data.stations();
      objArr = this.objects.stations;
      break;
    default:
      throw new Error("unknown model type for removing");
    }
    if (dataArr && this.selection.index > -1) {
      dataArr.splice(this.selection.index, 1);
      objArr.splice(this.selection.index, 1);
    }
    SVGSupport.removeElement(this.selection.svg);
    this.resetSelection();
    this.updateActionVisibility();
  }

  private repaintLandscape(path: number[][]): void {
    let newData;
    switch (this.data.landscape().data[this.selection.index].type) {
    case DataType.LANDSCAPE_PATH:
      newData = SVGSupport.path(undefined, path).getAttributeNS(null, "d");
      break;
    case DataType.LANDSCAPE_POLYGON:
      newData = SVGSupport.polygon(undefined, path).getAttributeNS(null, "d");
      break;
    default:
      break;
    }
    this.objects.landscapes[this.selection.index].setAttributeNS(null, "d", newData);
  }

  private toClipboard(): void {
    const area = HTMLSupport.createElement("textarea", {
      cols: 60,
      id: "clipboard",
      rows: 10,
      style: "position: absolute; top: -16384px; left: -16384px;",
    }) as HTMLTextAreaElement;
    // clean up generated parts
    for (const station of this.data.stations()) {
      delete station.frame;
    }
    for (const pod of this.data.fuelPods()) {
      delete pod.id;
    }
    delete this.data.raw().code;
    delete this.data.instructions().nextCode;
    area.value = JSON.stringify(this.data.raw(), undefined, 2);
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    HTMLSupport.removeElement(area);
    window.alert("Level copied to clipboard!");
  }

  private updateCamera(event: MouseEvent): void {
    const dx = (this.lastClick.x - event.clientX) / this.camera.zoom;
    const dy = (event.clientY - this.lastClick.y) / this.camera.zoom;
    const pos = this.camera.center();
    pos.x = Math.round(this.lastCameraPosition.x + dx);
    pos.y = Math.round(this.lastCameraPosition.y + dy);
    this.camera.update();
  }

  private renderLevelDimensions(): void {
    if (!this.data) {
      return;
    }
    const old: SVGElement = this.svg.querySelector("#leveldimensions");
    if (old) {
      SVGSupport.removeElement(old);
    }
    const landscape = this.data.landscape();
    this.svg.appendChild(SVGSupport.createElement("rect", {
      "fill": "transparent",
      "height": landscape.dimension.height,
      "id": "leveldimensions",
      "opacity": 0.75,
      "pointer-events": "none",
      "stroke": "#777",
      "stroke-dasharray": 10,
      "stroke-width": 5,
      "width": landscape.dimension.width,
      "x": landscape.dimension.x,
      "y": landscape.dimension.y,
    }));
  }

  private createID(prefix: string): string {
    return `${prefix}${++this.idCounter}`;
  }

}
