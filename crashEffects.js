import { PIXELS_PER_METER } from "./constants.js";
import { canvas } from "./canvasContext.js";

export const crashFragments = [];

export function triggerCarCrash(state, player, impactVelocityMeters) {
  if (player.crashed || state.playerType !== "car") {
    return;
  }

  player.crashed = true;
  state.carCrashTimer = 0;
  state.input.left = false;
  state.input.right = false;
  state.input.jumpQueued = false;
  player.vx = 0;
  player.vy = 0;
  state.lastForceX = 0;
  state.lastAppliedForceX = 0;
  state.dragForceX = 0;
  state.frictionForceX = 0;
  crashFragments.length = 0;

  const fragmentCount = 9;
  const baseSpeed = impactVelocityMeters * PIXELS_PER_METER;
  for (let i = 0; i < fragmentCount; i += 1) {
    const angle = (-Math.PI / 3) + Math.random() * (Math.PI * 0.6);
    const magnitude = baseSpeed * (0.15 + Math.random() * 0.35);
    crashFragments.push({
      x: player.x + (Math.random() - 0.5) * player.width * 0.6,
      y: player.y + player.height * 0.1,
      vx: Math.cos(angle) * magnitude,
      vy: -Math.abs(Math.sin(angle)) * magnitude,
      life: 1.2 + Math.random() * 0.5
    });
  }
}

export function updateCrashFragments(landscape, state, dt) {
  if (crashFragments.length === 0) {
    return;
  }

  const gravityPixels = state.gravity * PIXELS_PER_METER;
  const centerX = canvas.width * 0.5;

  for (let i = crashFragments.length - 1; i >= 0; i -= 1) {
    const fragment = crashFragments[i];
    fragment.vy += gravityPixels * dt * 0.8;
    fragment.vx *= 0.99;
    fragment.x += fragment.vx * dt;
    fragment.y += fragment.vy * dt;
    fragment.life -= dt;

    const worldSampleX = state.worldX + (fragment.x - centerX);
    const groundY = landscape.ground(worldSampleX, state.sceneTime);
    if (fragment.y >= groundY) {
      fragment.y = groundY;
      fragment.vy *= -0.35;
      fragment.vx *= 0.6;
      if (Math.abs(fragment.vy) < 30) {
        fragment.vy = 0;
      }
    }

    if (fragment.life <= 0) {
      crashFragments.splice(i, 1);
    }
  }
}

export function drawCrashFragments(ctx) {
  if (crashFragments.length === 0) {
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  crashFragments.forEach((fragment) => {
    const alpha = Math.max(0, Math.min(1, fragment.life));
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(fragment.x - 3, fragment.y - 3, 6, 6);
  });
  ctx.restore();
}

export function drawCrashIndicator(ctx, player, state) {
  if (!player.crashed || state.carCrashTimer > 4) {
    return;
  }
  ctx.save();
  ctx.fillStyle = "rgba(255, 64, 64, 0.85)";
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Crash!", player.x, player.y - player.height * 0.8);
  ctx.restore();
}
