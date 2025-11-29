import { canvas, ctx } from "./canvasContext.js";
import { PIXELS_PER_METER } from "./constants.js";
import { landscapes } from "./landscapes.js";
import { players } from "./players.js";
import { drawCrashFragments, drawCrashIndicator } from "./crashEffects.js";

export function renderScene(state, player) {
  const landscape = landscapes[state.landscapeType];
  drawBackground(landscape);
  drawGround(state, landscape);
  if (landscape.drawDetails) {
    landscape.drawDetails(state.sceneTime, state.worldX);
  }
  drawShadow(state, player, landscape);
  drawPlayer(player, state);
  drawCrashFragments(ctx);
  drawCrashIndicator(ctx, player, state);
}

function drawBackground(landscape) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, landscape.palette.skyTop);
  gradient.addColorStop(1, landscape.palette.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGround(state, landscape) {
  ctx.save();
  const centerX = canvas.width * 0.5;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(0, landscape.ground(state.worldX - centerX, state.sceneTime));
  for (let x = 0; x <= canvas.width; x += 6) {
    const worldSampleX = state.worldX + (x - centerX);
    ctx.lineTo(x, landscape.ground(worldSampleX, state.sceneTime));
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fillStyle = landscape.palette.ground;
  ctx.fill();

  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(0, landscape.ground(state.worldX - centerX, state.sceneTime) - 8);
  for (let x = 0; x <= canvas.width; x += 12) {
    const worldSampleX = state.worldX + (x - centerX);
    ctx.lineTo(x, landscape.ground(worldSampleX, state.sceneTime) - 8);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fillStyle = landscape.palette.groundShadow;
  ctx.fill();
  ctx.restore();
}

function drawShadow(state, player, landscape) {
  const groundY = landscape.ground(state.worldX, state.sceneTime);
  const halfHeight = player.height / 2;
  const heightAboveGround = Math.max(0, groundY - (player.y + halfHeight));
  const scale = Math.max(0.3, Math.min(1, 1 - heightAboveGround / (PIXELS_PER_METER * 4)));

  ctx.save();
  ctx.globalAlpha = 0.35 * scale;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(player.x, groundY + 6, (player.width * 0.6) * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(player, state) {
  const config = players[state.playerType];
  if (state.playerType === "person") {
    drawPerson(player, config);
  } else {
    drawCar(player, config);
  }
}

function drawPerson(player, config) {
  const bodyWidth = player.width * 0.45;
  const bodyHeight = player.height * 0.6;
  const bodyTop = player.y - bodyHeight / 2;
  ctx.save();
  ctx.fillStyle = config.color;
  ctx.fillRect(player.x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);

  ctx.fillStyle = "#ffe0b5";
  const headRadius = player.height * 0.18;
  ctx.beginPath();
  ctx.arc(player.x, bodyTop - headRadius + 4, headRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = config.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  const armOffset = bodyHeight * 0.2;
  ctx.moveTo(player.x - bodyWidth / 2, bodyTop + armOffset);
  ctx.lineTo(player.x - bodyWidth, bodyTop + bodyHeight * 0.6);
  ctx.moveTo(player.x + bodyWidth / 2, bodyTop + armOffset);
  ctx.lineTo(player.x + bodyWidth, bodyTop + bodyHeight * 0.6);
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.beginPath();
  const legStart = bodyTop + bodyHeight;
  ctx.moveTo(player.x - bodyWidth / 3, legStart);
  ctx.lineTo(player.x - bodyWidth / 2, legStart + player.height * 0.35);
  ctx.moveTo(player.x + bodyWidth / 3, legStart);
  ctx.lineTo(player.x + bodyWidth / 2, legStart + player.height * 0.35);
  ctx.stroke();
  ctx.restore();
}

function drawCar(player, config) {
  const width = player.width;
  const height = player.height * 0.6;
  const baseY = player.y + height * 0.4;
  const crashTilt = player.crashed ? (player.facing >= 0 ? -Math.PI / 7 : Math.PI / 7) : 0;

  ctx.save();
  ctx.translate(player.x, baseY);
  if (player.crashed) {
    ctx.rotate(crashTilt);
  }
  ctx.translate(-width / 2, -height);

  ctx.fillStyle = player.crashed ? shadeColor(config.color, -18) : config.color;
  drawRoundedRect(ctx, 0, 0, width, height, height * 0.2);

  ctx.fillStyle = player.crashed ? shadeColor(config.accent, -24) : config.accent;
  ctx.fillRect(width * 0.25, -height * 0.25, width * 0.5, height * 0.45);

  ctx.fillStyle = "#1b1b1d";
  const wheelRadius = height * 0.35;
  const wheelYOffset = wheelRadius;
  ctx.beginPath();
  ctx.arc(width * 0.2, height + wheelYOffset, wheelRadius, 0, Math.PI * 2);
  ctx.arc(width * 0.8, height + wheelYOffset, wheelRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f0f0f0";
  ctx.beginPath();
  ctx.arc(width * 0.2, height + wheelYOffset, wheelRadius * 0.45, 0, Math.PI * 2);
  ctx.arc(width * 0.8, height + wheelYOffset, wheelRadius * 0.45, 0, Math.PI * 2);
  ctx.fill();

  if (player.crashed) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height * 0.4);
    ctx.lineTo(width * 0.45, height * 0.65);
    ctx.moveTo(width * 0.55, height * 0.2);
    ctx.lineTo(width * 0.9, height * 0.45);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRoundedRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.quadraticCurveTo(x + w, y, x + w, y + r);
  context.lineTo(x + w, y + h - r);
  context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  context.lineTo(x + r, y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
  context.fill();
}

function shadeColor(hex, percent) {
  const value = Math.max(-100, Math.min(100, percent));
  const amount = Math.round(2.55 * value);
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}
