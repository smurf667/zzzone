import "planck-js";
import {Gauge} from "../Gauge";
import {ModelType} from "../LevelData";
import {PlanckProcessor} from "../PlanckProcessor";
import {Sfx, Sound} from "../Sfx";
import {SVGProcessor} from "../SVGProcessor";
import {SVGSupport} from "../SVGSupport";
import {ModelBase} from "./ModelBase";

interface Pick {
  userData: any;
  body: planck.Body;
  distance: number;
}
/**
 * The shuttle.
 */
export class Shuttle extends ModelBase {

  private readonly rope: SVGElement;
  private readonly tractorBeam: SVGElement;
  private readonly world: planck.World;

  private readonly fuelGauge: Gauge;
  private readonly shieldGauge: Gauge;
  private readonly maxFuel: number;

  private beamOpacity: number;
  private hasPod: boolean;
  private opacity: planck.Vec3;
  private zoom: planck.Vec3;
  private effectEnding: () => void;
  private inactive: boolean;
  private refueling: boolean;
  private health: number;
  private fuel: number;

  /**
   * Creates the shuttle.
   *
   * @param shuttleSvg the representation of the shuttle
   * @param ropeSvg the representation of the rope between shuttle and pod
   * @param beamSvg the representation of the tractor beam
   * @param world the planck world
   * @param body the model of the shuttle
   * @param maxFuel the maximal fuel the shuttle can load
   */
  constructor(
    shuttleSvg: SVGElement,
    ropeSvg: SVGElement,
    beamSvg: SVGElement,
    world: planck.World,
    body: planck.Body,
    maxFuel: number,
  ) {
    super(body, shuttleSvg, ModelType.SHUTTLE);
    this.maxFuel = maxFuel;
    this.rope = ropeSvg;
    this.tractorBeam = beamSvg;
    this.world = world;
    this.beamOpacity = 0;
    this.hasPod = false;
    this.opacity = planck.Vec3(0, 1, 1 / 80);
    this.zoom = planck.Vec3(4, 1, 3 / 80);
    this.inactive = false;
    this.health = 100;
    this.fuel = this.maxFuel;
    this.shieldGauge = new Gauge(44, 48, "Shield", this.health, this.health);
    this.fuelGauge = new Gauge(44, 96, "Fuel", this.maxFuel, this.maxFuel);
  }

  /**
   * @inheritdoc
   */
  public step(): void {
    const userData: any = this.body.getUserData();
    if (this.refueling) {
      if (this.body.getLinearVelocity().length() < 0.2 &&
        Math.abs(Math.round(PlanckProcessor.rad2deg(this.body.getAngle())) % 360) < 2) {
        let updated = false;
        if (this.health < 100) {
          this.health += 0.1;
          this.shieldGauge.setValue(this.health);
          updated = true;
        }
        if (this.fuel < this.maxFuel) {
          this.fuel += this.maxFuel / 1000;
          this.fuelGauge.setValue(this.fuel);
          updated = true;
        }
        if (updated && !userData.sound) {
          userData.sound = Sfx.play(Sound.REFUEL, true);
        } else if (!updated && userData.sound) {
          userData.sound.pause();
          delete userData.sound;
        }
      }
    } else if (userData.sound) {
      userData.sound.pause();
      delete userData.sound;
    }
    this.fuelGauge.step();
    this.shieldGauge.step();
    SVGSupport.updatePosition(this.svg, this.body);
    if (this.opacity.x !== this.opacity.y) {
      SVGSupport.setAttributes(this.svg, {
        opacity: this.adjustVec3(this.opacity),
      });
    }
    if (this.zoom.x !== this.zoom.y) {
      const transform = this.svg.getAttribute("transform");
      const z = this.adjustVec3(this.zoom);
      this.svg.setAttributeNS(null, "transform", `${transform} scale(${z} ${z})`);
      if (z === this.zoom.y) {
        if (this.effectEnding) {
          this.effectEnding.apply(this);
          this.effectEnding = undefined;
        }
      }
    }
    if (userData && userData.segments) {
      const points: planck.Vec2[] = (userData.segments as planck.Body[]).map((body) => {
        const p = planck.Vec2(body.getWorldCenter()).mul(SVGProcessor.SCALE);
        p.y = -p.y;
        return p;
      });
      // offset the last point (which is the center of the ship)
      const last = points.length - 1;
      points[last].sub(planck.Vec2(points[last]).sub(points[last - 1]).mul(0.75));
      SVGSupport.setAttributes(this.rope, { d: SVGSupport.bezierPath(points) });
      //      SVGSupport.setAttributes(this.rope, { d: SVGSupport.linearPath(points) });
    }
    if (this.beamOpacity > 0) {
      this.beamOpacity -= 2;
      SVGSupport.setAttributes(this.tractorBeam, { opacity: (this.beamOpacity / 100).toString(10) });
    }
  }

  /**
   * @inheritdoc
   */
  public destroy(world: planck.World, processor: PlanckProcessor): void {
    SVGSupport.removeElement(this.svg);
    world.destroyBody(this.body);
    this.land(false);
    if (!this.inactive) {
      this.terminate();
      this.health = 0;
      this.shieldGauge.setValue(0);
      processor.explode(this, ModelType.SHUTTLE);
    }
  }

  /**
   * Returns the fuel and shield gauges.
   *
   * @returns the fuel and shield gauges.
   */
  public gauges(): Gauge[] {
    return [ this.fuelGauge, this.shieldGauge ];
  }

  /**
   * Returns the planck body.
   *
   * @returns the planck body.
   */
  public planckBody(): planck.Body {
    return this.body;
  }

  /**
   * Turns the shuttle
   *
   * @param direction the direction to turn in (1/-1)
   */
  public turn(direction: number): void {
    this.body.applyTorque(32 * direction, true);
  }

  /**
   * Indicate if landed (refueling).
   *
   * @param flag the landing state
   */
  public land(flag: boolean): void {
    this.refueling = flag;
  }

  /**
   * Accelerates the shuttle.
   *
   * @param maxHeight max height where acceleration is possible
   * @param factor the acceleration factor
   * @returns true if acceleration took place
   */
  public accelerate(maxHeight: number, factor: number): boolean {
    if (this.fuel > 0) {
      let throttle = Math.min(maxHeight - this.body.getPosition().y, 16) / 16;
      if (throttle < 1) {
        throttle *= throttle;
      }
      this.body.applyLinearImpulse(
        this.body.getWorldVector(planck.Vec2(0.0, 1.0)).mul(throttle * factor),
        this.body.getWorldPoint(planck.Vec2(0.0, 2.0)), true);
      this.fuel--;
      this.fuelGauge.setValue(this.fuel);
      this.land(false);
      return true;
    }
    return false;
  }

  /**
   * Shows the tractor beam and possible collects a pod.
   */
  public showTractorBeam(): void {
    if (this.hasPod) {
      return;
    }
    Sfx.play(Sound.BEAM);
    this.beamOpacity = 102;
    const center = this.body.getWorldCenter();
    const shuttleAngle = PlanckProcessor.rad2deg(this.body.getAngle());
    const candidates: Pick[] = [];
    const known: Set<planck.Body> = new Set();
    for (let angle = 55; angle <= 125; angle += 10) {
      const p2 = planck.Vec2(
        5 * Math.cos(PlanckProcessor.deg2rad(shuttleAngle - angle)),
        5 * Math.sin(PlanckProcessor.deg2rad(shuttleAngle - angle))).add(center);
      this.world.rayCast(center,
        p2,
        (fixture: planck.Fixture) => {
          const fixtureBody = fixture.getBody();
          const userData = fixtureBody.getUserData() as any;
          if (userData && userData.pickable === true && !known.has(fixtureBody)) {
            known.add(fixtureBody);
            candidates.push({
              body: fixtureBody,
              distance: planck.Vec2(fixtureBody.getWorldCenter()).sub(center).length(),
              userData,
            });
          }
          return -1.0;
        });
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => Math.sign(a.distance - b.distance));
      this.hasPod = true;
      candidates[0].userData.pickable = false;
      const podCenter = candidates[0].body.getWorldCenter();
      const v = planck.Vec2(center).sub(podCenter);
      const l = v.length();
      const seg = 7;
      v.mul(1 / (seg + 1));
      const shape = planck.Box(0.1, (l - 0.5) / ( 2 * (seg + 1)));
      const shapeProps = {
        density: 16 / seg,
      };
      let last = candidates[0].body;
      const segments: planck.Body[] = [];
      const joints: planck.Joint[] = [];
      const ropeSegmentAngle = Math.atan2(-v.x, v.y);
      const ropeData = {
        modelType: ModelType.ROPE,
      };
      const ropeMass: planck.MassData = {
        I: 3,
        center: planck.Vec2.zero(),
        mass: 0.02,
      };
      for (let i = 0; i < seg; i++) {
        let next: planck.Body;
        if (i < seg - 1) {
          next = this.world.createDynamicBody(
            planck.Vec2(v).mul(i + 1).add(podCenter),
            ropeSegmentAngle);
          next.setMassData(ropeMass);
          next.createFixture(shape, shapeProps);
          next.setUserData(ropeData);
        } else {
          next = this.body;
        }
        segments.push(next);
        const joint = this.world.createJoint(planck.RevoluteJoint({
          collideConnected: false,
        }, last, next, next.getWorldCenter()));
        joints.push(joint);
        last = next;
      }
      const ropeJointDef = {} as any;
      ropeJointDef.maxLength = 1.1 * l;
      ropeJointDef.collideConnected = true;
      ropeJointDef.localAnchorA = candidates[0].body.getLocalCenter();
      ropeJointDef.localAnchorB = this.body.getLocalCenter();
      joints.push(this.world.createJoint(planck.RopeJoint(ropeJointDef, candidates[0].body, this.body, undefined)));
      candidates[0].body.setLinearVelocity(this.body.getLinearVelocity());
      this.body.applyLinearImpulse(
        this.body.getWorldVector(planck.Vec2(0.0, 1.0)).mul(32),
        this.body.getWorldPoint(planck.Vec2(0.0, 2.0)), true);
      this.body.setUserData({ joints, segments, pod: candidates[0].body, model: this, modelType: ModelType.SHUTTLE });
    }
  }

  /**
   * Removes the rope, if any
   */
  public removeRope(): void {
    SVGSupport.setAttributes(this.rope, { d: "" });
    this.hasPod = false;
    const data = this.body.getUserData() as any;
    if (data && data.joints) {
      (data.joints as planck.Joint[]).forEach((joint) => this.world.destroyJoint(joint));
      (data.segments as planck.Body[]).filter(
        (body) => body !== this.body).forEach((segment) => this.world.destroyBody(segment));
      ((data.pod as planck.Body).getUserData() as any).pickable = true;
      delete data.joints;
      delete data.segments;
      delete data.pod;
    }
  }

  /**
   * Returns the body of the connected pod, if any.
   *
   * @returns the body of the connected pod, if any.
   */
  public getPodBody(): planck.Body {
    const data = this.body.getUserData() as any;
    return data.pod;
  }

  /**
   * Fades in the shuttle, then performs some action.
   *
   * @param onEnd the action to perform
   */
  public fadeIn(onEnd?: () => void): void {
    this.opacity = planck.Vec3(0, 1, 1 / 50);
    this.zoom = planck.Vec3(3, 1, 2 / 50);
    this.effectEnding = onEnd;
  }

  /**
   * Fades out the shuttle, then performs some action.
   *
   * @param onEnd the action to perform
   */
  public fadeOut(onEnd?: () => void): void {
    this.opacity = planck.Vec3(1, 0, 1 / 50);
    this.zoom = planck.Vec3(1, 3, 2 / 50);
    this.effectEnding = onEnd;
  }

  /**
   * Terminates the shuttle.
   */
  public terminate(): void {
    this.inactive = true;
  }

  /**
   * Applies damage to the shuttle.
   *
   * @param amount amount of damage
   */
  public damage(amount: number): boolean {
    this.health = Math.max(0, this.health - amount);
    this.shieldGauge.setValue(this.health);
    if (this.inactive) {
      return false;
    }
    if (this.health === 0) {
      return true;
    }
    Sfx.play(Sound.CLICK);
    return false;
  }

  /**
   * @inheritdoc
   */
  public terminated(): boolean {
    return this.inactive;
  }

  /**
   * Indicates if shuttle is connected to a pod.
   *
   * @returns true if connected
   */
  public connected(): boolean {
    return this.hasPod;
  }

  /**
   * Step the tri-value into the target direction.
   * x represents the current value, y the target and z the step size.
   *
   * @param trivalue the tri-value
   * @returns the new x value
   */
  private adjustVec3(trivalue: planck.Vec3): number {
    const d = trivalue.z * Math.sign(trivalue.y - trivalue.x);
    trivalue.x += d;
    if ((d < 0 && trivalue.x < trivalue.y) || (d > 0 && trivalue.x > trivalue.y)) {
      trivalue.x = trivalue.y;
    }
    return trivalue.x;
  }
}
