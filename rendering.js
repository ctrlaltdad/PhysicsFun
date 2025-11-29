import { canvas, ctx } from "./canvasContext.js";
import { PIXELS_PER_METER, METERS_PER_SECOND_TO_MPH, METERS_TO_FEET } from "./constants.js";
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
  drawVectorsOverlay(state, player);
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

function drawVectorsOverlay(state, player) {
  if (!state.showVectors) {
    return;
  }

  const vectorSource = player.crashed && state.crashVectorSnapshot
    ? state.crashVectorSnapshot
    : {
        vx: player.vx,
        vy: player.vy,
        appliedForceX: state.lastAppliedForceX,
        dragForceX: state.dragForceX,
        frictionForceX: state.frictionForceX,
        netForceX: state.lastForceX
      };

  const originX = player.x;
  const originY = player.y;

  const velocityScale = 0.02;
  const velocityVector = scaleAndClampVector(vectorSource.vx, vectorSource.vy, velocityScale, 140);

  ctx.save();
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.85;

  if (Math.hypot(velocityVector.vx, velocityVector.vy) > 1) {
    drawArrow(originX, originY, originX + velocityVector.vx, originY + velocityVector.vy, "#4cc9f0");
    drawVectorLabel(originX + velocityVector.vx, originY + velocityVector.vy, "v", "#4cc9f0");
  }

  const baseY = originY + player.height * 0.45;
  const forceScale = 0.02;
  const maxForceLength = 120;

  const forces = [
    {
      value: vectorSource.appliedForceX,
      color: "#80ed99",
      label: "F_input",
      offset: -18
    },
    {
      value: vectorSource.dragForceX,
      color: "#ff6b6b",
      label: "F_drag",
      offset: 0
    },
    {
      value: vectorSource.frictionForceX,
      color: "#f9c74f",
      label: "F_friction",
      offset: 18
    },
    {
      value: vectorSource.netForceX,
      color: "#f1f2f6",
      label: "F_net",
      offset: 36
    }
  ];

  forces.forEach((force) => {
    if (!Number.isFinite(force.value) || Math.abs(force.value) < 1) {
      return;
    }
    const length = clamp(force.value * forceScale, -maxForceLength, maxForceLength);
    if (Math.abs(length) < 2) {
      return;
    }
    const startY = baseY + force.offset;
    drawArrow(originX, startY, originX + length, startY, force.color);
    drawVectorLabel(originX + length, startY, force.label, force.color);
  });

  const legendBox = drawVectorsLegend();
  if (player.crashed && state.crashDiagnostics) {
    drawCrashDiagnostics(state, legendBox);
  }
  ctx.restore();
}

function drawVectorsLegend() {
  const legendItems = [
    { label: "Velocity", color: "#4cc9f0" },
    { label: "Input", color: "#80ed99" },
    { label: "Drag", color: "#ff6b6b" },
    { label: "Friction", color: "#f9c74f" },
    { label: "Net", color: "#f1f2f6" }
  ];

  const padding = 10;
  const boxWidth = 150;
  const lineHeight = 18;
  const boxHeight = padding * 2 + legendItems.length * lineHeight;

  const x = canvas.width - boxWidth - 20;
  const y = 20;

  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "rgba(10, 18, 30, 0.65)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 10, y);
  ctx.lineTo(x + boxWidth - 10, y);
  ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + 10);
  ctx.lineTo(x + boxWidth, y + boxHeight - 10);
  ctx.quadraticCurveTo(x + boxWidth, y + boxHeight, x + boxWidth - 10, y + boxHeight);
  ctx.lineTo(x + 10, y + boxHeight);
  ctx.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - 10);
  ctx.lineTo(x, y + 10);
  ctx.quadraticCurveTo(x, y, x + 10, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.textBaseline = "middle";

  legendItems.forEach((item, index) => {
    const lineY = y + padding + index * lineHeight + lineHeight / 2;
    ctx.fillStyle = item.color;
    ctx.fillRect(x + padding, lineY - 4, 12, 8);
    ctx.fillStyle = "#dce0ec";
    ctx.fillText(item.label, x + padding + 18, lineY);
  });
  ctx.restore();
  return { x, y, width: boxWidth, height: boxHeight };
}

function drawCrashDiagnostics(state, legendBox) {
  const diagnostics = state.crashDiagnostics;
  if (!diagnostics) {
    return;
  }

  const verticalImpactMph = metersPerSecondToMph(diagnostics.impactVelocity);
  const horizontalImpactMph = metersPerSecondToMph(diagnostics.horizontalVelocity);
  const totalImpactMph = metersPerSecondToMph(diagnostics.totalVelocity);
  const dropFeet = metersToFeet(diagnostics.dropHeight);

  const baseLines = [`Reason: ${diagnostics.reason ?? "Severe impact"}`];

  if (diagnostics.narrative) {
    const explanationText = stripNarrativeReason(diagnostics.narrative);
    const narrativeLines = wrapText(explanationText, 56);
    if (narrativeLines.length > 0) {
      baseLines.push(`Explanation: ${narrativeLines[0]}`);
      for (let i = 1; i < narrativeLines.length; i += 1) {
        baseLines.push(`  ${narrativeLines[i]}`);
      }
    }
  }

  baseLines.push(
    `Vertical impact: ${formatNumber(diagnostics.impactVelocity, 1)} m/s (${formatNumber(verticalImpactMph, 1)} mph)`,
    `Horizontal speed: ${formatNumber(diagnostics.horizontalVelocity, 1)} m/s (${formatNumber(horizontalImpactMph, 1)} mph)`,
    `Total speed: ${formatNumber(diagnostics.totalVelocity, 1)} m/s (${formatNumber(totalImpactMph, 1)} mph)`,
    `Air time: ${formatNumber(diagnostics.airTime, 2)} s`,
    `Drop height: ${formatNumber(diagnostics.dropHeight, 2)} m (${formatNumber(dropFeet, 2)} ft)`
  );

  const thresholdLines = (diagnostics.thresholds ?? []).map((entry) => `• ${entry}`);
  const lines = baseLines.concat(thresholdLines);

  const padding = 12;
  const lineHeight = 18;
  const boxWidth = Math.max(220, legendBox ? legendBox.width : 0);
  const x = canvas.width - boxWidth - 20;
  const y = legendBox ? legendBox.y + legendBox.height + 12 : 20;
  const boxHeight = padding * 2 + lines.length * lineHeight;

  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = "rgba(10, 18, 30, 0.7)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 10, y);
  ctx.lineTo(x + boxWidth - 10, y);
  ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + 10);
  ctx.lineTo(x + boxWidth, y + boxHeight - 10);
  ctx.quadraticCurveTo(x + boxWidth, y + boxHeight, x + boxWidth - 10, y + boxHeight);
  ctx.lineTo(x + 10, y + boxHeight);
  ctx.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - 10);
  ctx.lineTo(x, y + 10);
  ctx.quadraticCurveTo(x, y, x + 10, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#f4f6fb";
  ctx.textBaseline = "middle";
  lines.forEach((text, index) => {
    const lineY = y + padding + index * lineHeight + lineHeight / 2;
    ctx.fillText(text, x + padding, lineY);
  });
  ctx.restore();
}

function formatNumber(value, decimals) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  return value.toFixed(decimals);
}

function metersPerSecondToMph(value) {
  return value * METERS_PER_SECOND_TO_MPH;
}

function metersToFeet(value) {
  return value * METERS_TO_FEET;
}

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const lines = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const word = words[i];
    if ((currentLine.length + 1 + word.length) <= maxChars) {
      currentLine += ` ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

function stripNarrativeReason(narrative) {
  const text = String(narrative).trim();
  if (text.includes(" — ")) {
    return text.split(" — ").slice(1).join(" — ").trim();
  }
  return text;
}

function drawArrow(startX, startY, endX, endY, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  const angle = Math.atan2(endY - startY, endX - startX);
  const headLength = 10;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - headLength * Math.cos(angle - Math.PI / 6),
    endY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    endX - headLength * Math.cos(angle + Math.PI / 6),
    endY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function drawVectorLabel(x, y, text, color) {
  ctx.save();
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y - 6);
  ctx.restore();
}

function scaleAndClampVector(vx, vy, scale, maxLength) {
  if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
    return { vx: 0, vy: 0 };
  }
  const scaledX = vx * scale;
  const scaledY = vy * scale;
  const length = Math.hypot(scaledX, scaledY);
  if (length <= maxLength) {
    return { vx: scaledX, vy: scaledY };
  }
  const ratio = maxLength / length;
  return {
    vx: scaledX * ratio,
    vy: scaledY * ratio
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
