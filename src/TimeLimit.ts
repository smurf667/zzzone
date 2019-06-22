import "planck-js";
import {Screen} from "./Screen";
import {Sfx, Sound} from "./Sfx";

/**
 * A time limit, displaying on the screen and counting down.
 */
export class TimeLimit {

  private readonly screen: Screen;
  private limit: number;
  private running: boolean;
  private uncritical: boolean;
  private frame: number;
  private last: number;

  /**
   * Creates the limit.
   */
  constructor(screen: Screen, limit: number) {
    this.screen = screen;
    this.limit = Date.now() + limit * 1000;
    this.running = true;
    this.uncritical = true;
    this.frame = 0;
  }

  /**
   * Updates the time limit displayed on the screen.
   */
  public update(): boolean {
    if (this.running) {
      this.frame++;
      const delta = Math.max(0, this.limit - Date.now());
      if (delta === 0) {
        this.running = false;
      }
      const time = new Date(delta);
      const seconds = time.getSeconds();
      if (seconds !== this.last || this.frame % 5 === 0) {
        this.last = seconds;
        const oneMinute = delta < 60000;
        this.screen.setTime(
          `${this.format(time.getMinutes())}:${this.format(seconds)}`,
          oneMinute && this.frame % 30 > 15);
        if (this.uncritical && oneMinute) {
          this.uncritical = false;
          Sfx.play(Sound.ALARM);
        }
      }
    }
    return this.running;
  }

  private format(time: number): string {
    return time.toString().padStart(2, "0");
  }

}
