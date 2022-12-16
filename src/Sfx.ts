import sounds from "./sfx/sounds.json";

export enum Sound {
  ACTIVATE, // https://freesound.org/people/bbrocer/sounds/389511/
  ACTOR, // https://freesound.org/people/ldezem/sounds/386174/
  ALARM, // https://freesound.org/people/SamsterBirdies/sounds/467882/
  BEAM, // https://freesound.org/people/pyzaist/sounds/118653/
  CLICK, // https://freesound.org/people/goldenpotatobull/sounds/468948/
  CONTACT, // https://freesound.org/people/elgronbo/sounds/144096/
  COUNT3, // https://freesound.org/people/ryanconway/sounds/165504/
  COUNT2, // https://freesound.org/people/ryanconway/sounds/165504/
  COUNT1, // https://freesound.org/people/ryanconway/sounds/165504/
  EXPLOSION, // https://freesound.org/people/moca/sounds/49030/
  REFUEL, // https://freesound.org/people/Noizemaker/sounds/23216/
  ROCKET, // https://freesound.org/people/Maxx222/sounds/446764/
  SHOT, // https://freesound.org/people/Julien%20Matthey/sounds/268343/
  TEXT, // https://freesound.org/people/dotY21/sounds/309504/
  THRUSTER, // brownian noise generated with Audacity
}

/**
 * Sound effects.
 * These are played using the HTML Audio element.
 */
export class Sfx {

  /**
   * Initializes the sound.
   */
  public static init() {
    Sfx.sounds.set(Sound.ACTIVATE, sounds.activate);
    Sfx.sounds.set(Sound.ACTOR, sounds.actor);
    Sfx.sounds.set(Sound.ALARM, sounds.alarm);
    Sfx.sounds.set(Sound.BEAM, sounds.beam);
    Sfx.sounds.set(Sound.CLICK, sounds.click);
    Sfx.sounds.set(Sound.CONTACT, sounds.contact);
    Sfx.sounds.set(Sound.COUNT1, sounds.count1);
    Sfx.sounds.set(Sound.COUNT2, sounds.count2);
    Sfx.sounds.set(Sound.COUNT3, sounds.count3);
    Sfx.sounds.set(Sound.EXPLOSION, sounds.explosion);
    Sfx.sounds.set(Sound.REFUEL, sounds.refuel);
    Sfx.sounds.set(Sound.ROCKET, sounds.rocket);
    Sfx.sounds.set(Sound.SHOT, sounds.shot);
    Sfx.sounds.set(Sound.TEXT, sounds.text);
    Sfx.sounds.set(Sound.THRUSTER, sounds.thruster);
    Sfx.muted = false;
  }

  /**
   * Asynchronously plays the given sound.
   *
   * @param sound the sound to play.
   * @param loop optional, to loop or not
   * @returns the audio element playing the sound or undefined if muted
   */
  public static play(sound: Sound, loop?: boolean): HTMLAudioElement {
    if (Sfx.muted) {
      return undefined;
    }
    const audio = new Audio(Sfx.sounds.get(sound));
    audio.loop = loop || false;
    void audio.play();
    return audio;
  }

  /**
   * Plays the music for the credits.
   * https://soundcloud.com/argofox/from-the-dust-interstellar-rush
   */
  public static credits(): HTMLAudioElement {
    const audio = new Audio("http://www.engehausen.de/jan/From%20The%20Dust%20-%20Interstellar%20Rush.mp3");
    audio.loop = true;
    void audio.play();
    return audio;
  }

  /**
   * Mutes or unmutes the sound effects.
   */
  public static toggleMute(): void {
    Sfx.muted = !Sfx.muted;
  }

  /**
   * Sets the mute state.
   *
   * @param flag the muting state.
   */
  public static mute(flag: boolean): void {
    Sfx.muted = flag;
  }

  private static readonly sounds: Map<Sound, string> = new Map();
  private static muted: boolean;

}

Sfx.init();
