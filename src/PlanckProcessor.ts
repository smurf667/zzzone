import {Camera} from "./Camera";
import {Collector} from "./LevelData";
import {DataType} from "./LevelData";
import {Instructions} from "./LevelData";
import {KinematicBody, KinematicsData} from "./LevelData";
import {Landscape} from "./LevelData";
import {LevelData} from "./LevelData";
import {ModelType} from "./LevelData";
import {Pod} from "./LevelData";
import {StationData} from "./LevelData";
import {StepperData} from "./LevelData";
import {StepperType} from "./LevelData";
import {LevelProcessor} from "./LevelProcessor";
import {Model} from "./Model";
import {BodyActor} from "./model/BodyActor";
import {Box} from "./model/Box";
import {Bullet} from "./model/Bullet";
import {Fragment} from "./model/Fragment";
import {FuelPod} from "./model/FuelPod";
import {Meteorite} from "./model/Meteorite";
import {Missile, MissileState} from "./model/Missile";
import {Rocket} from "./model/Rocket";
import {Sensor} from "./model/Sensor";
import {Shuttle} from "./model/Shuttle";
import {Station} from "./model/Station";
import {Screen} from "./Screen";
import {Sfx, Sound} from "./Sfx";
import {Step} from "./Step";
import {Dystopia} from "./stepper/Dystopia";
import {GravityShifter} from "./stepper/GravityShifter";
import {Meteorites} from "./stepper/Meteorites";
import {Missiles} from "./stepper/Missiles";
import {SVGProcessor} from "./SVGProcessor";
import {TimeLimit} from "./TimeLimit";

type BodyActorFactory = (
  processor: PlanckProcessor,
  body: KinematicBody,
  svgMapping: Map<string, SVGElement>) => BodyActor;

type ContactActionFactory = (
  processor: PlanckProcessor,
  modelA: Model,
  modelB: Model) => () => void;

type StepperFactory = (
  processor: PlanckProcessor,
  screen: Screen,
  data: number[]) => Step;

type ModelPreferrer = (
  modelA: Model,
  modelB: Model) => boolean;

type ContactAction = () => void;

/**
 * Level processor for the planck world.
 */
export class PlanckProcessor implements LevelProcessor<void>, Step {

  /**
   * Converts degrees to radians.
   *
   * @param degrees the angle in degrees
   * @returns the angle in radians
   */
  public static deg2rad(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  /**
   * Converts radians to degrees.
   *
   * @param radians the angle in degrees
   * @returns the angle in degrees
   */
  public static rad2deg(radians: number): number {
    return radians * 180 / Math.PI;
  }

  public static initBodyActorFactories() {
    PlanckProcessor.BODY_ACTOR_FACTORIES.set(DataType.KINEMATIC_BOX, (processor, body, svgMapping) => {
      const planckBody = processor.world.createBody(body.properties).setKinematic();
      if (body.properties && body.properties.angle) {
        planckBody.setAngle(PlanckProcessor.deg2rad(body.properties.angle));
      }
      planckBody.setPosition(processor.arr2vec2(body.data));
      planckBody.createFixture(
        planck.Box(body.data[2] / SVGProcessor.SCALE, body.data[3] / SVGProcessor.SCALE));
      return new BodyActor(planckBody, svgMapping.get(body.id));
    });
    PlanckProcessor.BODY_ACTOR_FACTORIES.set(DataType.KINEMATIC_LOCK, (processor, body, svgMapping) => {
      const planckBody = processor.world.createBody(body.properties).setKinematic();
      planckBody.setPosition(processor.arr2vec2(body.data));
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
      const props = body.properties || {
        density: 1,
      };
      processor.lines(props, upper, true, planckBody);
      processor.lines(props, lower, true, planckBody);
      planckBody.setAngle(PlanckProcessor.deg2rad(body.data[3]));
      return new BodyActor(planckBody, svgMapping.get(body.id));
    });
  }

  public static initStepperFactories() {
    PlanckProcessor.STEPPER_FACTORIES.set(
      StepperType.GRAVITY,
      (processor, screen, data) => new GravityShifter(processor, screen, data[0], data[1], data[2]));
    PlanckProcessor.STEPPER_FACTORIES.set(
      StepperType.METEORITES,
      (processor, screen, data) => new Meteorites(processor, screen, data[0], data[1]));
    PlanckProcessor.STEPPER_FACTORIES.set(
      StepperType.MISSILES,
      (processor, screen, data) => new Missiles(processor, screen, data[0], data[1]));
    PlanckProcessor.STEPPER_FACTORIES.set(
      StepperType.DYSTOPIA,
      (processor, screen, data) => new Dystopia(processor, data[0], data[1], data[2]));
  }

  public static initContactActionFactories() {
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(
      (ModelType.FUEL_POD | ModelType.COLLECTOR),
      (processor, modelA, modelB) => () => {
        processor.actionPodInCollector.apply(
          processor,
          PlanckProcessor.prefer(modelA, modelB, PlanckProcessor.PREFER_FUELPOD));
      });
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(
      (ModelType.SHUTTLE | ModelType.STATION),
      (processor, modelA, modelB) => () => {
        processor.actionShuttleOnStation.apply(
          processor,
          PlanckProcessor.prefer(modelA, modelB, PlanckProcessor.PREFER_SHUTTLE));
      });
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(
      ModelType.BULLET,
      (processor, modelA, modelB) => () => {
        PlanckProcessor.cast<Bullet>(modelA, modelB, PlanckProcessor.PREFER_BULLET).hit();
        Sfx.play(Sound.CLICK);
      });
    const shuttleContact = (processor, modelA, modelB) => () => {
      processor.actionShuttleHit.apply(
        processor,
        PlanckProcessor.prefer(modelA, modelB, PlanckProcessor.PREFER_SHUTTLE));
    };
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(ModelType.SHUTTLE, shuttleContact);
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(ModelType.SHUTTLE | ModelType.BULLET, shuttleContact);
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(ModelType.SHUTTLE | ModelType.METEORITE, shuttleContact);
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(ModelType.SHUTTLE | ModelType.MISSILE, shuttleContact);
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(
      ModelType.METEORITE,
      (processor, modelA, modelB) => () => {
        processor.actionProjectileHit.apply(
          processor,
          PlanckProcessor.prefer(modelA, modelB, PlanckProcessor.PREFER_METEORITE));
      });
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(
      ModelType.MISSILE,
      (processor, modelA, modelB) => () => {
        processor.actionProjectileHit.apply(
          processor,
          PlanckProcessor.prefer(modelA, modelB, PlanckProcessor.PREFER_MISSILE));
      });
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(
      ModelType.FUEL_POD,
      (processor, modelA, modelB) => () => {
        const pod = PlanckProcessor.cast<FuelPod>(modelA, modelB, PlanckProcessor.PREFER_FUELPOD);
        if (pod.collide()) {
          processor.removeRope(pod.elements().body);
          pod.hit();
        }
        Sfx.play(Sound.CONTACT);
      });
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(
      ModelType.SHUTTLE | ModelType.ROPE,
      () => () => { /* do nothing */ });
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(
      ModelType.FUEL_POD | ModelType.ROPE,
      () => () => { /* do nothing */ });
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(
      ModelType.BULLET | ModelType.SENSOR,
      (processor, modelA, modelB) => () => {
        processor.actionSensorHit.apply(
          processor,
          PlanckProcessor.prefer(modelA, modelB, PlanckProcessor.PREFER_SENSOR));
      });
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(
      ModelType.BULLET | ModelType.BOX,
      (_, modelA, modelB) => () => {
        PlanckProcessor.cast<Box>(modelA, modelB, PlanckProcessor.PREFER_BOX).hit();
      });
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(
      ModelType.BULLET | ModelType.FUEL_POD,
      (processor, modelA, modelB) => () => {
        processor.actionFuelPodHit.apply(
          processor,
          PlanckProcessor.prefer(modelA, modelB, PlanckProcessor.PREFER_FUELPOD));
      });
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(
      ModelType.BULLET | ModelType.METEORITE,
      (processor, modelA, modelB) => () => {
        processor.actionProjectileHit.apply(
          processor,
          PlanckProcessor.prefer(modelA, modelB, PlanckProcessor.PREFER_METEORITE));
      });
    PlanckProcessor.CONTACT_ACTION_FACTORIES.set(
      ModelType.BULLET | ModelType.MISSILE,
      (processor, modelA, modelB) => () => {
        processor.actionProjectileHit.apply(
          processor,
          PlanckProcessor.prefer(modelA, modelB, PlanckProcessor.PREFER_MISSILE));
      });
  }

  private static readonly BODY_ACTOR_FACTORIES: Map<string, BodyActorFactory> = new Map();
  private static readonly CONTACT_ACTION_FACTORIES: Map<number, ContactActionFactory> = new Map();
  private static readonly STEPPER_FACTORIES: Map<StepperType, StepperFactory> = new Map();
  private static readonly PREFER_BOX: ModelPreferrer = (a) => a instanceof Box;
  private static readonly PREFER_BULLET: ModelPreferrer = (a) => a instanceof Bullet;
  private static readonly PREFER_FUELPOD: ModelPreferrer = (a) => a instanceof FuelPod;
  private static readonly PREFER_METEORITE: ModelPreferrer = (a) => a instanceof Meteorite;
  private static readonly PREFER_MISSILE: ModelPreferrer = (a) => a instanceof Missile;
  private static readonly PREFER_SENSOR: ModelPreferrer = (a) => a instanceof Sensor;
  private static readonly PREFER_SHUTTLE: ModelPreferrer = (a) => a instanceof Shuttle;
  private static cast<T>(a: Model, b: Model, t: ModelPreferrer): T {
    return ((t(a, b) ? a : b) as any) as T;
  }
  private static prefer(a: Model, b: Model, t: ModelPreferrer): Model[] {
    return t(a, b) ? [ a, b ] : [ b, a ];
  }

  public readonly world: planck.World;
  private readonly svgProcessor: SVGProcessor;
  private readonly camera: Camera;
  private readonly screen: Screen;
  private readonly normalZoom: number;
  private steppers: Step[];
  private initialText: string[];

  private shuttle: Shuttle;
  private rocket: Rocket;
  private fuelPods: FuelPod[];
  private collectorBody: planck.Body;
  private frame: number;
  private contactActions: ContactAction[];
  private limits: planck.Body;
  private topLeft: planck.Vec2;
  private bottomRight: planck.Vec2;
  private landscapeProperties: planck.FixtureOpt;
  private instructions: Instructions;
  private success: boolean;
  private canShoot: boolean;
  private availableFuel: number;
  private maxAcceleration: number;
  private timeLimit: TimeLimit;

  /**
   * Creates the processor.
   *
   * @param world the planck world to use
   * @param svgProcessor the SVG processor to use for SVG representation
   * @param camera the camera to use
   * @param screen the screen to use
   */
  public constructor(world: planck.World, svgProcessor: SVGProcessor, camera: Camera, screen: Screen) {
    this.world = world;
    this.svgProcessor = svgProcessor;
    this.camera = camera;
    this.normalZoom = camera.zoom;
    this.screen = screen;
    this.steppers = [];
    this.fuelPods = [];
    this.contactActions = [];
    this.frame = 0;
    this.canShoot = true;
  }

  /**
   * Initializes the processor for the given level data.
   * The processors calls its child SVG processor as appropriate.
   *
   * @param data the level data
   */
  public initializeLevel(data: LevelData): void {
    this.processGravity(data.gravity());
    this.processLandscape(data.landscape());
    this.processShuttle(data.shuttle());
    this.processRocket(data.rocket());
    this.processCollector(data.collector());
    this.processFuelPods(data.fuelPods());
    this.processKinematics(data.kinematics());
    this.processBoxes(data.boxes());
    this.processStations(data.stations());
    this.processSteppers(data.steppers());
    this.processTimeLimit(data.timeLimit());
    this.instructions = data.instructions();
    this.initialText = this.instructions.welcome.slice();
    const gauges = this.shuttle.gauges().slice();
    if (this.rocket) {
      gauges.push(this.rocket.gauge());
    }
    this.screen.addGauges(gauges);
  }

  /**
   * @inheritdoc
   */
  public perform(): Step {
    this.world.step(1 / 60);
    this.step();
    if (this.success !== undefined) {
      if (this.rocket) {
        // stop potentially playing sound
        this.rocket.silence();
      }
      return undefined;
    }
    return this;
  }

  /**
   * @inheritdoc
   */
  public step(): void {
    this.frame++;
    if (this.initialText.length > 0 && (this.frame % 50 === 0)) {
      this.screen.animateFadeText(9 - this.initialText.length, this.initialText.shift(), 200);
    }
    this.svgProcessor.step();
    this.screen.step();
    if (this.timeLimit) {
      if (!this.timeLimit.update()) {
        this.timeLimit = undefined;
        this.screen.animateFadeTextAndThen(
          () => this.success = false,
          7,
          "Out of time.",
          150);
      }
    }
    const nextSteppers = [];
    for (const step of this.steppers) {
      const next = step.perform();
      if (next) {
        nextSteppers.push(next);
      }
    }
    this.steppers = nextSteppers;
    while (this.contactActions.length > 0) {
      this.contactActions.shift().apply(undefined);
    }
    if (this.rocket && !this.rocket.checkFuel(this.availableFuel)) {
      this.screen.animateFadeTextAndThen(
        () => this.success = false,
        7,
        "Insufficient remaining fuel.",
        150);
      this.availableFuel = 65536;
    }
    // iterate the bodies and update the SVGs where required
    let current = this.world.getBodyList();
    while (current) {
      const data = current.getUserData() as any;
      if (data) {
        if (data.model) {
          const model = data.model as Model;
          if (model.terminated()) {
            model.destroy(this.world, this);
          } else {
            model.step(this.frame);
          }
        }
        if (this.success !== undefined && data.sound) {
          data.sound.pause();
          delete data.sound;
        }
      }
      current = current.getNext();
    }
    this.camera.update();
  }

  /**
   * @inheritdoc
   */
  public shoot(): void {
    if (!this.canShoot) {
      return;
    }
    const ship = this.shuttle.planckBody();
    const bullet = this.world.createBody({bullet: true}).setDynamic();
    const bulletDir = ship.getWorldVector(planck.Vec2(0.0, 1.0));
    bullet.createFixture(planck.Circle(planck.Vec2(0, 0), 0.25), {
      density: 0.5,
      friction: 0.25,
    });
    bullet.setPosition(
      bulletDir.clone().mul(4).add(ship.getWorldCenter()));
    bullet.setMassData({
      I: 1,
      center: planck.Vec2.zero(),
      mass: 16,
    });
    bullet.setLinearVelocity(bulletDir.mul(Math.min(24, Math.max(24, 2 + ship.getLinearVelocity().length()))));
    bullet.setLinearDamping(0);
    bullet.setAngle(Math.random());
    new Bullet(this.svgProcessor.shoot(), bullet);
    Sfx.play(Sound.SHOT);
  }

  /**
   * @inheritdoc
   */
  public processGravity(gravity: planck.Vec2): void {
    this.svgProcessor.processGravity();
    this.world.setGravity(gravity);
    this.maxAcceleration = Math.max(1, gravity.length() / 2);
  }

  /**
   * @inheritdoc
   */
  public processLandscape(landscape: Landscape): void[] {
    this.landscapeProperties = landscape.properties;
    this.svgProcessor.processLandscape(landscape);
    for (const data of landscape.data) {
      switch (data.type) {
      case DataType.LANDSCAPE_PATH:
        this.lines(landscape.properties, data.data, false);
        break;
      case DataType.LANDSCAPE_POLYGON:
        this.lines(landscape.properties, data.data, true);
        break;
      default:
        break;
      }
    }
    const tl = planck.Vec2(landscape.dimension.x / SVGProcessor.SCALE, landscape.dimension.y / -SVGProcessor.SCALE);
    const br = planck.Vec2(tl).add(planck.Vec2(
      landscape.dimension.width / SVGProcessor.SCALE,
      landscape.dimension.height / -SVGProcessor.SCALE));
    this.topLeft = tl;
    this.bottomRight = br;
    this.limits = this.world.createBody();
    this.limits.createFixture(planck.Edge(planck.Vec2(tl.x, tl.y), planck.Vec2(br.x, tl.y)), landscape.properties);
    this.limits.createFixture(planck.Edge(planck.Vec2(tl.x, tl.y), planck.Vec2(tl.x, br.y)), landscape.properties);
    this.limits.createFixture(planck.Edge(planck.Vec2(br.x, tl.y), planck.Vec2(br.x, br.y)), landscape.properties);
    this.limits.createFixture(planck.Edge(planck.Vec2(tl.x, br.y), planck.Vec2(br.x, br.y)), landscape.properties);
    return undefined;
  }

  /**
   * @inheritdoc
   */
  public processRocket(data: planck.BodyDef): void {
    if (!data) {
      return;
    }
    const definition = JSON.parse(JSON.stringify(data)) as planck.BodyDef;
    definition.type = "dynamic";
    definition.position.x /= SVGProcessor.SCALE;
    definition.position.y /= -SVGProcessor.SCALE;
    const body = this.world.createBody(definition);
    body.setAngularDamping(0.25);
    body.createFixture(planck.Polygon(
      [
        planck.Vec2(0, 20),
        planck.Vec2(-3.5, 6),
        planck.Vec2(3.5, 6),
      ]), 1);
    body.createFixture(planck.Polygon(
      [
        planck.Vec2(0, 20),
        planck.Vec2(-2.5, 13),
        planck.Vec2(-3.5, 6),
      ]), 0.5);
    body.createFixture(planck.Polygon(
      [
        planck.Vec2(-3.5, 6),
        planck.Vec2(-6, 4),
        planck.Vec2(-2, 0),
      ]), 5);
    body.createFixture(planck.Polygon(
      [
        planck.Vec2(0, 20),
        planck.Vec2(2.5, 13),
        planck.Vec2(3.5, 6),
      ]), 0.5);
    body.createFixture(planck.Polygon(
      [
        planck.Vec2(3.5, 6),
        planck.Vec2(6, 4),
        planck.Vec2(2, 0),
      ]), 5);
    if (data.angle) {
      body.setAngle(PlanckProcessor.deg2rad(data.angle));
    }
    this.rocket = new Rocket(this.svgProcessor.processRocket(data), body, data.userData.requiredFuel);
  }

  /**
   * @inheritdoc
   */
  public processCollector(data: Collector): void {
    this.svgProcessor.processCollector(data);
    const angle = data.angle ? PlanckProcessor.deg2rad(data.angle) : 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.lines(
      {},
      data.frame.map((xy) => [
        (xy[0] * cos - xy[1] * sin) + data.position.x,
        (xy[1] * cos + xy[0] * sin) + data.position.y ]),
      true);
    const body = this.world.createBody();
    body.setAngle(angle);
    const collectorSensor = body.createFixture(
      planck.Box(
        data.sensor.width / SVGProcessor.SCALE,
        data.sensor.height / SVGProcessor.SCALE,
        planck.Vec2(0, -1.8)));
    collectorSensor.setSensor(true);
    body.setPosition(this.vec2vec2(data.position));
    body.setUserData({ modelType: ModelType.COLLECTOR });
    if (data.angle > 0) {
      body.setAngle(data.angle);
    }
    this.collectorBody = body;
  }

  /**
   * @inheritdoc
   */
  public processStations(stations: StationData[]): void[] {
    const svgs = this.svgProcessor.processStations(stations);
    for (let i = 0; i < stations.length; i++) {
      const station = stations[i];
      const x = station.position.x;
      const y = station.position.y;
      this.lines({}, station.frame.map((n) => [ n[0] + x, n[1] + y]), true);
      const body = this.world.createBody(this.vec2vec2(station.position));
      const sensor = body.createFixture(planck.Box(
        (station.frame[2][0] - station.frame[3][0]) / SVGProcessor.SCALE / 2,
        0.25));
      sensor.setSensor(true);
      new Station(svgs[i], body);
    }
    return undefined;
  }

  /**
   * @inheritdoc
   */
  public processTimeLimit(limit: number) {
    if (limit) {
      this.timeLimit = new TimeLimit(this.screen, limit);
    }
  }

  /**
   * @inheritdoc
   */
  public processShuttle(data: planck.BodyDef): void {
    const shuttleSvg = this.svgProcessor.processShuttle(data);
    // create a full copy
    const definition = JSON.parse(JSON.stringify(data)) as planck.BodyDef;
    definition.type = "dynamic";
    definition.position = this.vec2vec2(definition.position);
    const body = this.world.createBody(definition);
    body.createFixture(planck.Polygon(
      [planck.Vec2(-1.75, 0.0), planck.Vec2(0.0, 4), planck.Vec2(0.0, 1)]), 1.0);
    body.createFixture(planck.Polygon(
      [planck.Vec2(1.75, 0.0), planck.Vec2(0.0, 4), planck.Vec2(0.0, 1)]), 1.0);
    const maxFuel = definition.userData && definition.userData.maxFuel ? definition.userData.maxFuel : 1000;
    this.shuttle = new Shuttle(
      shuttleSvg,
      this.svgProcessor.rope(),
      this.svgProcessor.beam(),
      this.world,
      body,
      maxFuel);
    if (data.angle) {
      body.setAngle(PlanckProcessor.deg2rad(data.angle));
    }
    this.camera.follow(body);
  }

  /**
   * @inheritdoc
   */
  public processFuelPods(pods: Pod[]): void[] {
    const svgs = this.svgProcessor.processFuelPods(pods);
    this.availableFuel = 0;
    for (let i = 0; i < svgs.length; i++) {
      const body = this.world.createDynamicBody(this.vec2vec2(pods[i].position));
      body.setAngularDamping(1);
      body.createFixture(planck.Circle(planck.Vec2(0, 0), 0.75), {
        density: pods[i].density || 1,
        friction: 1.0,
        restitution: 0.25,
      });
      const fuelPod = new FuelPod(svgs[i], body, pods[i].fuel);
      this.availableFuel += pods[i].fuel;
      this.fuelPods.push(fuelPod);
    }
    return undefined;
  }

  /**
   * @inheritdoc
   */
  public processKinematics(data: KinematicsData): void[] {
    if (!data) {
      return undefined;
    }
    const svgMapping: Map<string, SVGElement> = new Map();
    const mapping: Map<string, any> = new Map();
    this.svgProcessor.processKinematics(data).forEach((element) => svgMapping.set(element.getAttribute("id"), element));
    // set the bodies
    data.bodies.forEach((body) => {
      const creator = PlanckProcessor.BODY_ACTOR_FACTORIES.get(body.type);
      if (creator) {
        const bodyActor = creator.call(undefined, this, body, svgMapping);
        mapping.set(body.id, bodyActor);
      }
    });
    data.sensors.forEach((sensor) => {
      const planckBody = this.world.createKinematicBody(this.vec2vec2(sensor.position));
      planckBody.createFixture(planck.Circle(planck.Vec2.zero(), 0.75));
      const instance = new Sensor(svgMapping.get(sensor.id), planckBody, mapping, sensor.enabled);
      mapping.set(sensor.id, instance);
    });
    data.actors.forEach((activation) => {
      const sensor = mapping.get(activation.on) as Sensor;
      sensor.addPhases(activation.phases, activation.repeatCount);
    });
    return undefined;
  }

  /**
   * @inheritdoc
   */
  public processBoxes(data: number[][]): void[] {
    const display = this.svgProcessor.processBoxes(data);
    for (let i = 0; i < data.length; i++) {
      const info = data[i];
      const box = this.world.createBody(this.arr2vec2(info)).setDynamic();
      box.createFixture(planck.Box(0.5, 0.5), {
        density: 1.0,
        friction: 2.0,
        restitution: 0.1,
      });
      box.setMassData({
        I: .8,
        center: planck.Vec2.zero(),
        mass: 1,
      });
      new Box(info.length > 2 ? info[2] : 1, display[i], box);
    }
    return undefined;
  }

  /**
   * @inheritdoc
   */
  public explode(model: Model, type: ModelType): void[] {
    const svgs = this.svgProcessor.explode(model, type);
    if (svgs) {
      Sfx.play(Sound.EXPLOSION);
      const body = model.elements().body;
      switch (type) {
      case ModelType.BOX:
        this.explodeBox(body, svgs);
        break;
      case ModelType.FUEL_POD:
        this.availableFuel -= (model as FuelPod).empty();
        this.explodeCircle(body, svgs, 0.75, 0.5);
        if  (!this.rocket) {
          this.screen.animateFadeTextAndThen(
            () => this.success = false,
            7,
            "Training failed!", 200);
        }
        break;
      case ModelType.METEORITE:
        const radius = (model as Meteorite).radius() / SVGProcessor.SCALE;
        this.explodeCircle(body, svgs, radius, 1 / (3 * radius));
        break;
      case ModelType.MISSILE:
        // use the fragments from svg processor + emit bullets (if not destroyed)
        this.explodeCircle(body, svgs, 1, 0.5);
        if ((model as Missile).state() === MissileState.EXPLODING) {
          this.explodeMissile(body);
        }
        break;
      case ModelType.SHUTTLE:
        this.explodeShuttle(body, svgs);
        break;
      default:
        break;
      }
    }
    return undefined;
  }

  /**
   * @inheritdoc
   */
  public createMeteorite(size: number): void {
    const radius = size / SVGProcessor.SCALE;
    const pos = this.randomPlaceAtTop(radius);
    const body = this.world.createDynamicBody(pos);
    const lr = Math.sign((this.bottomRight.x - this.topLeft.x) / 2 + this.topLeft.x - pos.x);
    body.setLinearVelocity(planck.Vec2(lr * 16 * Math.random(), -2 - 3 * Math.random()));
    body.setAngularDamping(0.75);
    body.setAngularVelocity(0.5 + 2.5 * Math.random());
    body.setMassData({
      I: 1,
      center: planck.Vec2.zero(),
      mass: radius * 4,
    });
    body.createFixture(planck.Circle(planck.Vec2(0, 0), radius));
    new Meteorite(this.svgProcessor.createMeteorite(size), body, size);
    return undefined;
  }

  /**
   * @inheritdoc
   */
  public createMissile(): void {
    const body = this.world.createDynamicBody(this.randomPlaceAtTop(2));
    body.createFixture(planck.Circle(planck.Vec2(0, 0), 1), 5);
    body.createFixture(planck.Polygon([
      planck.Vec2(0, 0),
      planck.Vec2(-1.2, 2),
      planck.Vec2(1.2, 2),
    ]), 1);
    body.applyLinearImpulse(
      planck.Vec2(Math.sign(Math.random() - 0.5) * Math.random() * 128, -32 - 96 * Math.random()),
      body.getWorldCenter());
    body.setAngularDamping(0.33);
    const sign = Math.sign(body.getLinearVelocity().x);
    body.setAngle(sign * Math.PI / 3);
    body.applyTorque(-sign * 192);
    new Missile(this.svgProcessor.createMissile(), body);
    return undefined;
  }

  /**
   * Performs a tractor beam scan, connecting the first
   * found fuel pod to the shuttle, if any.
   */
  public activateTractorBeam(): void {
    this.shuttle.showTractorBeam();
  }

  /**
   * Removes the rope connecting the shuttle with a pod, if any.
   *
   * @param pod the fuel pod to check for rope removal
   */
  public removeRope(pod?: planck.Body): void {
    if (pod === undefined || pod === this.shuttle.getPodBody()) {
      this.shuttle.removeRope();
    }
  }

  /**
   * Turns the shuttle left.
   *
   * @param force the force to apply for the turn
   */
  public turnLeft(force: number): void {
    this.shuttle.turn(force);
  }

  /**
   * Turns the shuttle right.
   *
   * @param force the force to apply for the turn
   */
  public turnRight(force: number): void {
    this.shuttle.turn(-force);
  }

  /**
   * Accelerates the shuttle.
   *
   * @returns flag indicating if acceleration took place
   */
  public accelerate(): boolean {
    return this.shuttle.accelerate(this.topLeft.y, this.maxAcceleration);
  }

  /**
   * This adds a step to be executed during the next stepping.
   *
   * @param step the step to add
   */
  public addSteps(step: Step) {
    this.steppers.push(step);
  }

  /**
   * Contact event handling. This is called when the world
   * is locked and collects the actions to be performed during
   * the frame step.
   *
   * @param contact the contact of two fixtures
   */
  public handleContact(contact: planck.Contact): void {
    const fixtureA = contact.getFixtureA();
    const fixtureB = contact.getFixtureB();
    const bodyA = fixtureA.getBody();
    const bodyB = fixtureB.getBody();
    const dataA = bodyA.getUserData() as any;
    const dataB = bodyB.getUserData() as any;
    const type = (dataA ? dataA.modelType : 0) | (dataB ? dataB.modelType : 0);
    let action = PlanckProcessor.CONTACT_ACTION_FACTORIES.get(type);
    if (!action) {
      // this could be a generic hit handling case
      action = PlanckProcessor.CONTACT_ACTION_FACTORIES.get(
        type & (ModelType.BULLET | ModelType.FUEL_POD | ModelType.SHUTTLE | ModelType.METEORITE | ModelType.MISSILE));
    }
    if (action) {
      this.contactActions.push(action.apply(
        undefined,
        [ this, dataA ? dataA.model : undefined, dataB ? dataB.model : undefined ]));
    }
  }

  /**
   * Contact handling for kinematic bodies.
   *
   * @param contact the contact of two fixtures
   */
  public handleKinematicContact(contact: planck.Contact): void {
    const fa = contact.getFixtureA();
    const fb = contact.getFixtureB();
    if (this.testLandscape(fa)) {
      if (this.testShuttle(fb)) {
        this.contactActions.push(() => this.selfDestruct());
      }
    } else if (this.testLandscape(fb)) {
      if (this.testShuttle(fa)) {
        this.contactActions.push(() => this.selfDestruct());
      }
    }
  }

  /**
   * Destroys the shuttle.
   */
  public selfDestruct(): void {
    this.shuttle.destroy(this.world, this);
  }

  /**
   * Launches the rocket.
   */
  public liftOff(): void {
    this.rocket.liftOff(this.world.getGravity());
    this.world.destroyBody(this.limits);
    this.camera.follow(this.rocket.elements().body);
    this.canShoot = false;
    const shuttle = this.shuttle;
    shuttle.fadeOut(() => {
      shuttle.terminate();
      this.screen.animateFadeText(this.screen.findFreeLine(7), this.instructions.success, 200);
      this.screen.animateFadeTextAndThen(
        () => {
          this.success = true;
          this.rocket.silence();
        },
        this.screen.findFreeLine(8),
        this.instructions.nextCode ? `Next: ${this.instructions.nextCode}` : "This is the end!",
        300);
    });
  }

  /**
   * Indicates if the player is still alive.
   *
   * @returns true if game can continue, false otherwise
   */
  public alive(): boolean {
    return this.success;
  }

  /**
   * Zooms the camera.
   *
   * @param factor the factor to zoom.
   * @returns the current camera zoom
   */
  public zoom(factor: number): number {
    this.camera.zoom = this.normalZoom * factor;
    return this.camera.zoom;
  }

  /**
   * Processes the steppers of the level.
   * A stepper can contribute to each frame of the level.
   * Note: This is not an interface method of LevelProcessor, as the
   * SVG variant won't contribute directly.
   *
   * @param data the stepper configuration used in the level
   */
  private processSteppers(data: StepperData[]): void {
    for (const stepper of data) {
      const creator = PlanckProcessor.STEPPER_FACTORIES.get(stepper.type);
      if (creator) {
        this.steppers.push(creator.call(undefined, this, this.screen, stepper.data));
      }
    }
  }

  private actionShuttleOnStation(shuttle: Shuttle, station: Station): void {
    const ship = shuttle.elements().body;
    const degs = Math.abs(Math.round(PlanckProcessor.rad2deg(ship.getAngle())) % 360);
    if (degs < 5) {
      station.flash();
      shuttle.land(true);
      Sfx.play(Sound.ACTIVATE);
    }
  }

  private actionPodInCollector(pod: FuelPod): void {
    pod.captured();
    this.removeRope();
    if (this.success !== undefined) {
      return;
    }
    Sfx.play(Sound.ACTIVATE);
    if (this.rocket) {
      const amount = pod.empty();
      this.availableFuel -= amount;
      if (this.rocket.addFuel(amount)) {
        this.screen.countDown(3, () => this.liftOff());
        this.rocket.countdown();
      }
    } else if (this.canShoot) {
      this.canShoot = false;
      this.screen.animateFadeTextAndThen(() => this.success = true, 7, this.instructions.success, 200);
      const shuttle = this.shuttle;
      shuttle.fadeOut(() => shuttle.terminate());
      this.camera.follow(this.collectorBody);
    }
  }

  private actionFuelPodHit(pod: FuelPod, bullet: Bullet) {
    pod.hit();
    bullet.hit();
  }

  private actionSensorHit(sensor: Sensor, bullet: Bullet) {
    sensor.trigger(this);
    bullet.hit();
    Sfx.play(Sound.ACTIVATE);
  }

  private actionProjectileHit(projectile: any, other: Model) {
    if (other instanceof Bullet) {
      projectile.hit(true);
      (other ).hit();
    } else {
      projectile.hit();
      Sfx.play(Sound.CLICK);
    }
  }

  private actionShuttleHit(shuttle: Shuttle, other: Model) {
    Sfx.play(Sound.CLICK);
    // hm, ignore this.shuttle === shuttle!
    if (this.shuttle.connected() && other instanceof FuelPod) {
      return; // ignore this
    }
    if (other instanceof Bullet) {
      (other ).hit();
      this.shuttle.damage(2);
      return;
    }
    if (other instanceof Meteorite) {
      (other ).hit();
      this.shuttle.damage(3);
      return;
    }
    if (other instanceof Missile) {
      (other ).hit();
      this.shuttle.damage(3);
      return;
    }
    const ship = this.shuttle.elements().body;
    const force = 2 * ship.getLinearVelocity().length();
    if (force > 5) {
      if (this.shuttle.damage(force)) {
        this.shuttle.destroy(this.world, this);
      }
    } else {
      const degs = Math.abs(Math.round(PlanckProcessor.rad2deg(ship.getAngle())) % 360);
      if (degs > 40) {
        this.shuttle.destroy(this.world, this);
      }
    }
  }

  private randomPlaceAtTop(radius: number): planck.Vec2 {
    return planck.Vec2(
      this.topLeft.x +  (this.bottomRight.x - this.topLeft.x) / (1.5 + 9 * Math.random()),
      this.topLeft.y - 2 * radius);
  }

  private explodeBox(deadBody: planck.Body, fragments: SVGElement[]): void[] {
    let offset = 0;
    for (let y = -0.5; y <= 0.5; y += 1) {
      for (let x = -0.5; x <= 0.5; x += 1) {
        const body = this.world.createDynamicBody({
          angularDamping: 0.5,
          linearDamping: 0.5,
        });
        body.createFixture(planck.Box(0.25, 0.25), 0);
        body.setMassData({
          I: 0.25,
          center: planck.Vec2.zero(),
          mass: 0.5,
        });
        body.setPosition(planck.Vec2(x, y).add(deadBody.getPosition()));
        body.setLinearVelocity(deadBody.getLinearVelocity());
        body.setAngularVelocity(deadBody.getAngularVelocity());
        body.applyTorque(128 * Math.random() - 64);
        new Fragment(fragments[offset++], body).step();
      }
    }

    return undefined;
  }

  private explodeCircle(deadBody: planck.Body, fragments: SVGElement[], radius: number, mass: number): void {
    const angle = Math.PI / 3;
    let offset = 0;
    for (let i = 0; i < 2 * Math.PI; i += angle) {
      const body = this.world.createDynamicBody({
        angularDamping: 0.5,
        linearDamping: 0.5,
      });
      body.createFixture(planck.Polygon([
        planck.Vec2(0, 0),
        planck.Vec2(radius * Math.cos(i), radius * Math.sin(i)),
        planck.Vec2(radius * Math.cos(i + angle), radius * Math.sin(i + angle)),
      ]), 0.05);
      body.setMassData({
        I: 0.25,
        center: planck.Vec2(radius * Math.cos(i + angle / 2) / 2, radius * Math.sin(i + angle / 2) / 2),
        mass,
      });
      body.setPosition(deadBody.getPosition());
      body.setLinearVelocity(deadBody.getLinearVelocity());
      body.setAngularVelocity(deadBody.getAngularVelocity());
      body.applyTorque(128 * Math.random() - 64);
      new Fragment(fragments[offset++], body).step();
    }
  }

  private explodeMissile(deadBody: planck.Body): void {
    const angle = Math.PI / 5;
    for (let i = 0; i < 2 * Math.PI; i += angle) {
      const bullet = this.world.createBody({bullet: true}).setDynamic();
      const bulletDir = planck.Vec2(Math.cos(i), Math.sin(i));
      bullet.createFixture(planck.Circle(planck.Vec2(0, 0), 0.25), {
        density: 0.5,
        friction: 0.25,
      });
      bullet.setPosition(
        bulletDir.clone().mul(1.5).add(deadBody.getWorldCenter()));
      bullet.setMassData({
        I: 1,
        center: planck.Vec2.zero(),
        mass: 8,
      });
      bullet.setLinearVelocity(bulletDir.mul(4).add(deadBody.getLinearVelocity()));
      bullet.setLinearDamping(0);
      bullet.setAngle(Math.random());
      new Bullet(this.svgProcessor.shoot(), bullet).step();
    }
  }

  private explodeShuttle(deadBody: planck.Body, fragments: SVGElement[]): void[] {
    this.removeRope();
    let offset = 0;
    for (const coordinates of [
      [ planck.Vec2(-1.75, 0), planck.Vec2(-0.9, 2), planck.Vec2(0, 1) ],
      [ planck.Vec2(1.75, 0), planck.Vec2(0.9, 2), planck.Vec2(0, 1) ],
      [ planck.Vec2(-0.9, 2), planck.Vec2(0, 4), planck.Vec2(0.9, 2) ],
      [ planck.Vec2(-0.9, 2), planck.Vec2(0.9, 2), planck.Vec2(0, 1) ],
    ]) {
      const body = this.world.createDynamicBody({
        angularDamping: 0.5,
        linearDamping: 0.5,
      });
      const fragment = body.createFixture(planck.Polygon(coordinates), 0.5);
      fragment.setFriction(0);
      body.setPosition(deadBody.getPosition());
      body.setLinearVelocity(deadBody.getLinearVelocity());
      body.setAngularVelocity(deadBody.getAngularVelocity());
      body.setAngle(deadBody.getAngle());
      body.applyTorque(512 * Math.random() - 256);
      new Fragment(fragments[offset++], body).step();
    }
    this.shuttle.damage(65536);
    if (this.canShoot) {
      this.canShoot = false;
      this.screen.animateFadeTextAndThen(() => this.success = false, 7, "Mission failed!", 200);
    }
    return undefined;
  }

  private testLandscape(fixture: planck.Fixture): boolean {
    return fixture.getUserData() && (fixture.getUserData() as any).actor;
  }

  private testShuttle(fixture: planck.Fixture): boolean {
    const data = fixture.getBody().getUserData() as any;
    return data && data.modelType === ModelType.SHUTTLE;
  }

  private lines(
    properties: planck.FixtureOpt,
    coordinates: number[][],
    closed: boolean,
    body?: planck.Body,
  ): planck.Body {
    if (!body) {
      body = this.world.createBody();
    }
    for (let i = 1; i < coordinates.length; i++) {
      body.createFixture(planck.Edge(
        this.arr2vec2(coordinates[i - 1]),
        this.arr2vec2(coordinates[i])),
      properties);
    }
    if (closed) {
      body.createFixture(planck.Edge(
        this.arr2vec2(coordinates[coordinates.length - 1]),
        this.arr2vec2(coordinates[0])),
      properties);
    }
    return body;
  }

  private arr2vec2(coordinate: number[]): planck.Vec2 {
    return planck.Vec2(coordinate[0] / SVGProcessor.SCALE, coordinate[1] / -SVGProcessor.SCALE);
  }

  private vec2vec2(unscaled: planck.Vec2): planck.Vec2 {
    return this.arr2vec2([unscaled.x, unscaled.y]);
  }

}
PlanckProcessor.initBodyActorFactories();
PlanckProcessor.initContactActionFactories();
PlanckProcessor.initStepperFactories();
