import { PIXELS_PER_METER } from "./constants.js";
import { players } from "./players.js";

export function createPlayer(type) {
  const config = players[type];
  const widthPx = config.bodyWidth * PIXELS_PER_METER;
  const heightPx = config.bodyHeight * PIXELS_PER_METER;
  return {
    type,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    width: widthPx,
    height: heightPx,
    mass: config.mass,
    color: config.color,
    accent: config.accent,
    onGround: false,
    facing: 1,
    crashed: false,
    airTime: 0,
    airborneStartY: null
  };
}
