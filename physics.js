import { PIXELS_PER_METER, CAR_CRASH_THRESHOLD, physicsDefaults } from "./constants.js";
import { canvas } from "./canvasContext.js";
import { triggerCarCrash } from "./crashEffects.js";

export function updatePhysics(state, player, config, landscape, dt) {
  player.ax = 0;
  player.ay = state.gravity * PIXELS_PER_METER;
  state.dragForceX = 0;
  state.frictionForceX = 0;

  const appliedForceX = applyControls(state, player, config);
  applyDrag(state, player, config);

  player.vx += player.ax * dt;
  player.vy += player.ay * dt;

  limitVelocity(player, config);

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const centerX = state.canvasCenterX;
  const offsetX = player.x - centerX;
  state.worldX += offsetX;
  player.x = centerX;

  clampVertical(player);
  const wasOnGround = player.onGround;
  resolveGroundCollision(state, player, config, landscape, wasOnGround);
  applyGroundFriction(state, player, config, dt);

  state.lastAppliedForceX = appliedForceX;
  state.lastForceX = appliedForceX + state.dragForceX + state.frictionForceX;
  player.facing = player.vx >= 0 ? 1 : -1;

  return appliedForceX;
}

function applyControls(state, player, config) {
  if (player.crashed) {
    state.input.jumpQueued = false;
    return 0;
  }

  let totalForceX = 0;
  if (state.input.left) {
    totalForceX -= config.moveForce;
  }
  if (state.input.right) {
    totalForceX += config.moveForce;
  }

  player.ax += (totalForceX / config.mass) * PIXELS_PER_METER;

  if (state.playerType === "person") {
    if (state.input.jumpQueued && player.onGround) {
      const adjustedJump = config.jumpVelocity * Math.sqrt(physicsDefaults.gravity / state.gravity);
      player.vy = -adjustedJump * PIXELS_PER_METER;
      player.onGround = false;
    }
  }

  state.input.jumpQueued = false;
  return totalForceX;
}

function applyDrag(state, player, config) {
  const windSpeed = state.weather?.windSpeed ?? 0;
  const vxMeters = player.vx / PIXELS_PER_METER;
  const relativeVx = vxMeters - windSpeed;
  const dragAccelX = -state.airResistance * relativeVx;
  player.ax += dragAccelX * PIXELS_PER_METER;
  state.dragForceX = config.mass * dragAccelX;

  const vyMeters = player.vy / PIXELS_PER_METER;
  const dragAccelY = -state.airResistance * vyMeters;
  player.ay += dragAccelY * PIXELS_PER_METER;
}

function applyGroundFriction(state, player, config, dt) {
  if (!player.onGround || player.crashed) {
    state.frictionForceX = 0;
    state.effectiveGroundFriction = state.groundFriction;
    return;
  }

  const vxMeters = player.vx / PIXELS_PER_METER;
  if (Math.abs(vxMeters) < 0.02 && !state.input.left && !state.input.right) {
    player.vx = 0;
    state.frictionForceX = 0;
    state.effectiveGroundFriction = state.groundFriction;
    return;
  }

  const rainFactor = state.weather?.rainSlickness ?? 0;
  const rainMultiplier = 1 - rainFactor * 0.6;
  const effectiveFriction = Math.max(0.05, state.groundFriction * rainMultiplier);
  state.effectiveGroundFriction = effectiveFriction;

  const normalForce = config.mass * state.gravity;
  const maxFrictionForce = effectiveFriction * normalForce;
  const direction = Math.sign(vxMeters);
  if (direction === 0) {
    state.frictionForceX = 0;
    return;
  }

  const inputActive = state.input.left || state.input.right;
  const activeScale = config.activeFrictionScale ?? 0.45;
  const multiplier = inputActive ? activeScale : 1;
  const frictionForce = maxFrictionForce * multiplier;
  const frictionAccel = frictionForce / config.mass;
  const deltaMeters = frictionAccel * dt;
  const deltaPixels = deltaMeters * PIXELS_PER_METER;
  if (Math.abs(player.vx) > deltaPixels) {
    player.vx -= deltaPixels * direction;
  } else if (!state.input.left && !state.input.right) {
    player.vx = 0;
  }
  state.frictionForceX = -direction * frictionForce;
}

function limitVelocity(player, config) {
  const maxHorizontal = config.maxSpeed * PIXELS_PER_METER;
  if (Math.abs(player.vx) > maxHorizontal) {
    player.vx = Math.sign(player.vx) * maxHorizontal;
  }

  const maxVertical = config.maxVerticalSpeed * PIXELS_PER_METER;
  if (Math.abs(player.vy) > maxVertical) {
    player.vy = Math.sign(player.vy) * maxVertical;
  }
}

function clampVertical(player) {
  const halfHeight = player.height / 2;
  if (player.y < halfHeight) {
    player.y = halfHeight;
    player.vy = 0;
  }
  if (player.y > canvas.height + player.height) {
    player.y = canvas.height - halfHeight;
    player.vy = 0;
  }
}

function resolveGroundCollision(state, player, config, landscape, wasOnGround) {
  const groundY = landscape.ground(state.worldX, state.sceneTime);
  const halfHeight = player.height / 2;
  if (player.y + halfHeight >= groundY) {
    player.y = groundY - halfHeight;
    if (player.vy > 0) {
      const impactVelocityMeters = Math.abs(player.vy) / PIXELS_PER_METER;
      const totalVelocityMeters = Math.sqrt(player.vx * player.vx + player.vy * player.vy) / PIXELS_PER_METER;
      const landingImpact = !wasOnGround;
      if (
        landingImpact &&
        state.playerType === "car" &&
        !player.crashed
      ) {
        const severeVertical = impactVelocityMeters > CAR_CRASH_THRESHOLD;
        const severeTotal = totalVelocityMeters > CAR_CRASH_THRESHOLD * 1.5 && impactVelocityMeters > 2;
        if (severeVertical || severeTotal) {
          const crashSeverity = Math.max(impactVelocityMeters, totalVelocityMeters * 0.35);
          triggerCarCrash(state, player, crashSeverity);
        }
      }

      if (!player.crashed) {
        player.vy *= -config.restitution;
        if (Math.abs(player.vy) < 5) {
          player.vy = 0;
        }
      } else {
        player.vy = 0;
      }
    }
    player.onGround = true;
  } else {
    player.onGround = false;
  }
}
