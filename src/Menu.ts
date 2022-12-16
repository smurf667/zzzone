import "planck-js";
import {Credits} from "./Credits";
import {Level} from "./Level";
import {LevelData} from "./LevelData";
import {Screen} from "./Screen";
import {Sfx, Sound} from "./Sfx";
import {Step} from "./Step";

enum State {
  WELCOME,
  LEVELS,
  PLAY,
}

type LevelSelector = () => void;

export interface MenuInfo {
  data: LevelData;
  keys: Map<string, boolean>;
  screen: Screen;
}

/**
 * The main menu for entering a level.
 */
export class Menu implements Step {

  private static readonly LEVELS_PER_PAGE = 4;
  private static readonly BLANK_CODE = "_____";
  private static readonly ENTER_CODE = "Enter level code: ";
  private static readonly BACKGROUND_TEXTS = [
    "Interface 2037 ready for inquiry",
    "What's the story, mother?",
    "Open the pod bay doors, HAL.",
    "That's no moon!",
    "I've seen things you little people wouldn't believe.",
    "I watched C-beams glitter in the dark near the Tannhauser Gate.",
    "Nuke the site from orbit. It's the only way to be sure.",
    "Why, oh, why didn't I take the blue pill?",
    "There is no spoon.",
    "It's too bad she won't live. But then again, who does?",
    "I am Locutus of Borg.",
    "Resistance is futile.",
    "Your life as it has been is over.",
    "From this time forward, you will service us.",
    "Just a whisper. I hear it in my ghost.",
    "Klaatu barada nikto.",
    "My code name is Project 2501.",
    "The net is vast and infinite.",
    "My God, it's full of stars!",
    "Never give up, never surrender!",
    "By Grabthar's hammer!",
    "Powerful you have become, the dark side I sense in you.",
    "Your weapons, you will not need them.",
    "He's dead, Jim.",
    "It can only be attributable to human error.",
    "Fear is the little-death that brings total obliteration.",
  ];

  private readonly screen: Screen;
  private readonly keys: Map<string, boolean>;
  private levels: LevelData[];
  private levelOffset: number;
  private code: string;
  private state: State;
  private frame: number;
  private selection: number;
  private selections: LevelSelector[];
  private level: LevelData;

  /**
   * Creates the menu using the given screen and key map.
   *
   * @param screen the screen used for rendering purposes
   * @param keys the map of pressed keys
   */
  constructor(screen: Screen, keys: Map<string, boolean>) {
    this.screen = screen;
    this.keys = keys;
    this.init();
  }

  /**
   * {@inheritDoc}
   */
  public perform(): Step {
    this.frame++;
    switch (this.state) {
    case State.WELCOME:
      if (this.frame === 1) {
        this.screen.clearAll();
        this.screen.animateTexts(
          3,
          -1,
          "Welcome to the zzzone!",
          "",
          "Use \u25bc\u25b2 to navigate, \u2b90 to select, and",
          "\u24ea\u2460\u2461\u2462\u2463\u2464\u2465\u2466\u2467\u2468 to enter a code.");
        this.screen.underline(3, true);
        this.spawnTexts();
      } else if (this.frame === 150) {
        this.showCurrentPage();
      }
      break;
    case State.LEVELS:
      if (this.frame === 1) {
        this.screen.clearText();
        this.showCurrentPage();
      }
      break;
    case State.PLAY:
      if (this.frame === 0) {
        return this.runLevel();
      } else if (this.frame === 1) {
        const lines: number[] = [];
        for (let i = 0; i < 20; i++) {
          if (this.selection !== i) {
            lines.push(i);
          }
        }
        this.screen.fadeLinesAndThen(() => this.frame = -1, lines);
      }
      break;
    default:
      break;
    }

    this.screen.step();

    return this;
  }

  /**
   * Returns information about the current selections and
   * other configuration of the menu.
   *
   * @returns level, keys and screen information
   */
  public config(): MenuInfo {
    return {
      data: this.level,
      keys: this.keys,
      screen: this.screen,
    };
  }

  /**
   * Handles a key event
   *
   * @param event the key event
   */
  public keyEvent(event: KeyboardEvent): void {
    if (this.state === State.PLAY) {
      return;
    }
    if (event.type === "keyup") {
      switch (event.key) {
      case "ArrowDown":
        this.move(1);
        break;
      case "ArrowUp":
        this.move(-1);
        break;
      case "Enter":
        if (this.selection >= 0) {
          const action = this.selections[this.selection];
          if (action) {
            action.apply(this);
          }
        }
        break;
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        const idx = this.code.indexOf("_");
        if (idx >= 0) {
          this.code = this.code.substr(0, idx) + event.key + this.code.substr(idx + 1);
          this.screen.setText(17, `${Menu.ENTER_CODE}${this.code}`);
          if (idx === 4) {
            if (this.code === "99929") {
              this.level = undefined;
              this.state = State.PLAY;
              this.frame = 0;
              this.code = Menu.BLANK_CODE;
              break;
            }
            const levels = LevelData.available(this.code);
            this.code = Menu.BLANK_CODE;
            if (levels.length > 0) {
              this.levels = levels;
              this.selection = -1;
              this.levelOffset = levels.length;
              this.page(1);
            } else {
              this.screen.animateFadeTextAndThen(() => {
                this.screen.setText(17, `${Menu.ENTER_CODE}${this.code}`);
              }, 18, "Does not compute", 50);
            }
          }
        } else {
          this.code = event.key + Menu.BLANK_CODE.charAt(0).repeat(4);
          this.screen.setText(17, `${Menu.ENTER_CODE}${this.code}`);
        }
        break;
      default:
        break;
      }
    }
  }

  /**
   * Selects the given line
   *
   * @param index the index of the line
   */
  public select(index: number): void {
    this.screen.underline(index, true);
    this.screen.flash(index);
    this.selection = index;
  }

  /**
   * Moves the selection up or down.
   *
   * @param dir the selection direction (1/-1)
   */
  public move(dir: number): void {
    if (this.selection > -1) {
      Sfx.play(Sound.CLICK);
      this.screen.underline(this.selection, false);
      let next = this.selection;
      while (true) {
        next += dir;
        if (next < 0) {
          next += this.selections.length;
        } else if (next > this.selections.length) {
          next -= this.selections.length;
        }
        if (this.selections[next]) {
          this.select(next);
          break;
        }
      }
    }
  }

  /**
   * Switches the displayed page (of levels)
   *
   * @param dir the switch direction (1/-1)
   */
  public page(dir: number): void {
    this.levelOffset += dir * Menu.LEVELS_PER_PAGE;
    if (this.levelOffset < 0) {
      this.levelOffset = 0;
    } else if (this.levelOffset >= this.levels.length) {
      this.levelOffset = Math.max(0, this.levels.length - Menu.LEVELS_PER_PAGE);
    }
    this.state = State.LEVELS;
    this.frame = 0;
  }

  /**
   * Initializes the menu.
   */
  public init(): void {
    if (window.location.hash) {
      this.levels = LevelData.available(window.location.hash.substr(1));
    }
    if (this.levels === undefined || this.levels.length === 0) {
      this.levels = [ LevelData.first() ];
    }
    this.levelOffset = this.levels.length;
    this.page(1);
    this.frame = 0;
    this.state = State.WELCOME;
    this.code = Menu.BLANK_CODE;
    this.selection = -1;
    this.selections = [];
    this.level = undefined;
  }

  /**
   * Resets state after returning from playing a level.
   *
   * @returns the menu instance
   */
  public fromLevel(): Step {
    this.state = State.LEVELS;
    this.screen.clearAll();
    this.spawnTexts();
    return this;
  }

  /**
   * Returns a step for playing the next level, or the
   * credits if all levels have been played.
   *
   * @returns the next step
   */
  public nextLevel(): Step {
    this.screen.clearAll();
    const code = this.level.instructions().nextCode;
    const next = LevelData.level(code);
    if (next) {
      if (this.levels.indexOf(next) < 0) {
        this.levels = LevelData.available(code);
      }
      this.level = next;
      return this.runLevel();
    }
    return new Credits(this);
  }

  private showCurrentPage(): void {
    this.selections = [];
    this.screen.animateTexts(17, -1, `${Menu.ENTER_CODE}${this.code}`);
    const stop = Math.min(this.levelOffset + Menu.LEVELS_PER_PAGE, this.levels.length);
    if (stop < this.levels.length) {
      this.screen.animateTexts(15, -1, "Next...");
      this.selections[15] = () => this.page(1);
    }
    if (this.levelOffset > 0) {
      this.screen.animateTexts(14, -1, "Previous...");
      this.selections[14] = () => this.page(-1);
    }
    for (let i = this.levelOffset; i < stop; i++) {
      const line = 9 + i - this.levelOffset;
      const level = this.levels[i];
      this.screen.animateTexts(line, -1, `${level.code()} ${level.name()}`);
      this.selections[line] = () => {
        this.level = level;
        this.state = State.PLAY;
        this.frame = 0;
      };
    }
    this.select(9);
  }

  private runLevel(): Step {
    this.screen.clearAll();
    this.state = State.PLAY;
    this.frame = -1;
    return this.level ? new Level(this) : new Credits(this);
  }

  private spawnTexts(): void {
    this.spawnText();
    this.spawnText();
    this.spawnText();
  }

  private spawnText(): void {
    if (this.state !== State.PLAY) {
      this.screen.backgroundText(
        Menu.BACKGROUND_TEXTS[Math.floor(Math.random() * Menu.BACKGROUND_TEXTS.length)], () => {
          this.spawnText();
        });
    }
  }

}
