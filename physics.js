import {
  PIXELS_PER_METER,
  CAR_CRASH_THRESHOLD,
  METERS_PER_SECOND_TO_MPH,
  METERS_TO_FEET,
  physicsDefaults
} from "./constants.js";
import { canvas } from "./canvasContext.js";
import { triggerCarCrash } from "./crashEffects.js";

const RAD_TO_DEG = 180 / Math.PI;
const SLOPE_CRASH_MIN_SPEED = 8; // m/s
const SLOPE_CRASH_ANGLE_RAD = 55 * (Math.PI / 180);

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
  const airborneDuration = wasOnGround ? 0 : (player.airTime + dt);
  resolveGroundCollision(state, player, config, landscape, wasOnGround, airborneDuration);
  applyGroundFriction(state, player, config, dt);

  player.airTime = player.onGround ? 0 : airborneDuration;

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

function resolveGroundCollision(state, player, config, landscape, wasOnGround, airborneDuration) {
  const groundY = landscape.ground(state.worldX, state.sceneTime);
  const halfHeight = player.height / 2;
  if (player.y + halfHeight >= groundY) {
    player.y = groundY - halfHeight;

    if (
      state.playerType === "car" &&
      !player.crashed &&
      wasOnGround &&
      Math.abs(player.vx) > 0.1
    ) {
      const direction = Math.sign(player.vx);
      const probeDistancePixels = Math.max(player.width * 0.8, 40);
      const sampleAheadX = state.worldX + direction * probeDistancePixels;
      const groundAhead = landscape.ground(sampleAheadX, state.sceneTime);
      const risePixels = groundAhead - groundY;
      if (risePixels * direction > 0) {
        const riseMeters = Math.abs(risePixels) / PIXELS_PER_METER;
        const runMeters = probeDistancePixels / PIXELS_PER_METER;
        const slopeAngle = Math.atan2(Math.abs(risePixels), probeDistancePixels);
        const approachSpeed = Math.abs(player.vx) / PIXELS_PER_METER;
        if (slopeAngle >= SLOPE_CRASH_ANGLE_RAD && approachSpeed >= SLOPE_CRASH_MIN_SPEED) {
          const normalImpactVelocity = approachSpeed * Math.sin(slopeAngle);
          const slopeAngleDeg = slopeAngle * RAD_TO_DEG;
          const thresholds = [
            formatSlopeAngleComparison(slopeAngleDeg, SLOPE_CRASH_ANGLE_RAD * RAD_TO_DEG, riseMeters, runMeters),
            formatSpeedComparison("Approach speed", approachSpeed, SLOPE_CRASH_MIN_SPEED)
          ];
          const diagnostics = {
            reason: "Impacted steep slope",
            impactVelocity: normalImpactVelocity,
            horizontalVelocity: approachSpeed,
            totalVelocity: approachSpeed,
            airTime: player.airTime,
            dropHeight: 0,
            thresholds,
            effectiveFriction: state.effectiveGroundFriction,
            windSpeed: state.weather?.windSpeed ?? 0,
            surfaceSlickness: state.weather?.rainSlickness ?? 0,
            narrative: buildCrashNarrative({
              type: "slope",
              slopeAngle,
              approachSpeed,
              normalImpactVelocity,
              riseMeters,
              runMeters,
              effectiveFriction: state.effectiveGroundFriction,
              windSpeed: state.weather?.windSpeed ?? 0,
              surfaceSlickness: state.weather?.rainSlickness ?? 0
            })
          };
          const crashSeverity = Math.max(normalImpactVelocity * 1.5, approachSpeed * 0.6);
          triggerCarCrash(state, player, crashSeverity, diagnostics);
          player.onGround = true;
          player.airborneStartY = groundY;
          return;
        }
      }
    }

    if (player.vy > 0) {
      const impactVelocityMeters = Math.abs(player.vy) / PIXELS_PER_METER;
      const totalVelocityMeters = Math.sqrt(player.vx * player.vx + player.vy * player.vy) / PIXELS_PER_METER;
      const landingImpact = !wasOnGround;
      if (
        landingImpact &&
        state.playerType === "car" &&
        !player.crashed
      ) {
        const airborneSeconds = airborneDuration;
        const dropHeightMeters = Math.max(0, (groundY - (player.airborneStartY ?? groundY)) / PIXELS_PER_METER);
        const horizontalVelocityMeters = Math.abs(player.vx) / PIXELS_PER_METER;
        const severeVertical = impactVelocityMeters > CAR_CRASH_THRESHOLD && airborneSeconds > 0.12;
        const severeTotal = totalVelocityMeters > CAR_CRASH_THRESHOLD * 1.6 && impactVelocityMeters > 4 && airborneSeconds > 0.2;
        const dropInduced = impactVelocityMeters > CAR_CRASH_THRESHOLD * 0.75 && dropHeightMeters > 1.2 && airborneSeconds > 0.25;
        if (severeVertical || severeTotal || dropInduced) {
          const crashSeverity = Math.max(impactVelocityMeters, totalVelocityMeters * 0.35);
          const thresholds = [];
          if (severeVertical) {
            thresholds.push(
              formatSpeedComparison(
                "Vertical impact",
                impactVelocityMeters,
                CAR_CRASH_THRESHOLD
              )
            );
          }
          if (severeTotal) {
            thresholds.push(
              formatSpeedComparison(
                "Combined speed",
                totalVelocityMeters,
                CAR_CRASH_THRESHOLD * 1.6
              )
            );
          }
          if (dropInduced) {
            thresholds.push(
              formatDropComparison(dropHeightMeters, impactVelocityMeters)
            );
          }
          let reason = "Severe impact";
          if (severeVertical) {
            reason = "Hard vertical impact";
          } else if (severeTotal) {
            reason = "High-speed landing";
          } else if (dropInduced) {
            reason = "Large drop impact";
          }
          if (thresholds.length > 1) {
            reason += " (multiple factors)";
          }
          const diagnostics = {
            reason,
            impactVelocity: impactVelocityMeters,
            horizontalVelocity: horizontalVelocityMeters,
            totalVelocity: totalVelocityMeters,
            airTime: airborneSeconds,
            dropHeight: dropHeightMeters,
            thresholds,
            effectiveFriction: state.effectiveGroundFriction,
            windSpeed: state.weather?.windSpeed ?? 0,
            surfaceSlickness: state.weather?.rainSlickness ?? 0,
            narrative: buildCrashNarrative({
              type: "landing",
              reason,
              impactVelocityMeters,
              horizontalVelocityMeters,
              totalVelocityMeters,
              airborneSeconds,
              dropHeightMeters,
              effectiveFriction: state.effectiveGroundFriction,
              windSpeed: state.weather?.windSpeed ?? 0,
              surfaceSlickness: state.weather?.rainSlickness ?? 0,
              severeVertical,
              severeTotal,
              dropInduced
            })
          };
          triggerCarCrash(state, player, crashSeverity, diagnostics);
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
    player.airborneStartY = groundY;
  } else {
    player.onGround = false;
    if (wasOnGround) {
      player.airborneStartY = groundY;
    }
  }
}

function formatSpeedComparison(label, measured, threshold) {
  const measuredMph = measured * METERS_PER_SECOND_TO_MPH;
  const thresholdMph = threshold * METERS_PER_SECOND_TO_MPH;
  return `${label} ${measured.toFixed(1)} m/s (${measuredMph.toFixed(1)} mph) > ${threshold.toFixed(1)} m/s (${thresholdMph.toFixed(1)} mph)`;
}

function formatDropComparison(dropMeters, impactMetersPerSecond) {
  const dropFeet = dropMeters * METERS_TO_FEET;
  const impactMph = impactMetersPerSecond * METERS_PER_SECOND_TO_MPH;
  return `Drop ${dropMeters.toFixed(2)} m (${dropFeet.toFixed(2)} ft) with impact ${impactMetersPerSecond.toFixed(1)} m/s (${impactMph.toFixed(1)} mph)`;
}

function formatSlopeAngleComparison(angleDegrees, thresholdDegrees, riseMeters, runMeters) {
  const riseFeet = riseMeters * METERS_TO_FEET;
  return `Slope angle ${angleDegrees.toFixed(1)}° > ${thresholdDegrees.toFixed(1)}° (rise ${riseMeters.toFixed(2)} m / ${riseFeet.toFixed(2)} ft over ${runMeters.toFixed(2)} m)`;
}

function buildCrashNarrative(details) {
  if (details.type === "landing") {
    const lines = [];
    const impactMph = details.impactVelocityMeters * METERS_PER_SECOND_TO_MPH;
    const horizontalMph = details.horizontalVelocityMeters * METERS_PER_SECOND_TO_MPH;
    const totalMph = details.totalVelocityMeters * METERS_PER_SECOND_TO_MPH;
    const dropFeet = details.dropHeightMeters * METERS_TO_FEET;

    lines.push(
      `The car touched down at ${details.impactVelocityMeters.toFixed(1)} m/s (${impactMph.toFixed(1)} mph) downward after ${details.airborneSeconds.toFixed(2)} s aloft.`
    );

    if (details.impactVelocityMeters >= CAR_CRASH_THRESHOLD) {
      lines.push(
        `That exceeded the ${CAR_CRASH_THRESHOLD.toFixed(1)} m/s (${(CAR_CRASH_THRESHOLD * METERS_PER_SECOND_TO_MPH).toFixed(1)} mph) vertical crash limit.`
      );
    }

    lines.push(
      `Horizontal speed at impact was ${details.horizontalVelocityMeters.toFixed(1)} m/s (${horizontalMph.toFixed(1)} mph), giving a total touchdown speed of ${details.totalVelocityMeters.toFixed(1)} m/s (${totalMph.toFixed(1)} mph).`
    );

    if (details.severeTotal) {
      const combinedThreshold = CAR_CRASH_THRESHOLD * 1.6;
      lines.push(
        `That overall speed rose past the ${combinedThreshold.toFixed(1)} m/s (${(combinedThreshold * METERS_PER_SECOND_TO_MPH).toFixed(1)} mph) combined-speed limit.`
      );
    }

    if (details.dropInduced && details.dropHeightMeters > 0.05) {
      lines.push(
        `It fell roughly ${details.dropHeightMeters.toFixed(2)} m (${dropFeet.toFixed(2)} ft) before contact.`
      );
    }

    if (Number.isFinite(details.effectiveFriction)) {
      const slicknessPercent = Math.round((details.surfaceSlickness ?? 0) * 100);
      const slicknessText = slicknessPercent > 0 ? ` with ${slicknessPercent}% slickness` : "";
      lines.push(`Surface grip was μ≈${details.effectiveFriction.toFixed(2)}${slicknessText}.`);
    }

    const windMagnitude = Math.abs(details.windSpeed ?? 0);
    if (windMagnitude > 0.1) {
      lines.push(
        `Wind was about ${windMagnitude.toFixed(1)} m/s (${(windMagnitude * METERS_PER_SECOND_TO_MPH).toFixed(1)} mph).`
      );
    }

    const prefix = details.reason ? `${details.reason} — ` : "";
    return prefix + lines.join(" ");
  }

  if (details.type === "slope") {
    const slopeDegrees = details.slopeAngle * RAD_TO_DEG;
    const thresholdDegrees = SLOPE_CRASH_ANGLE_RAD * RAD_TO_DEG;
    const riseFeet = details.riseMeters * METERS_TO_FEET;
    const runFeet = details.runMeters * METERS_TO_FEET;
    const approachMph = details.approachSpeed * METERS_PER_SECOND_TO_MPH;
    const normalMph = details.normalImpactVelocity * METERS_PER_SECOND_TO_MPH;

    const lines = [
      `The hill rose ${details.riseMeters.toFixed(2)} m (${riseFeet.toFixed(2)} ft) over ${details.runMeters.toFixed(2)} m (${runFeet.toFixed(2)} ft), creating a ${slopeDegrees.toFixed(1)}° slope beyond the ${thresholdDegrees.toFixed(1)}° limit.`,
      `The car was still moving ${details.approachSpeed.toFixed(1)} m/s (${approachMph.toFixed(1)} mph), so its nose met the slope with about ${details.normalImpactVelocity.toFixed(1)} m/s (${normalMph.toFixed(1)} mph) of normal velocity.`
    ];

    if (Number.isFinite(details.effectiveFriction)) {
      const slicknessPercent = Math.round((details.surfaceSlickness ?? 0) * 100);
      const slicknessText = slicknessPercent > 0 ? ` and ${slicknessPercent}% slickness` : "";
      lines.push(`Surface grip was μ≈${details.effectiveFriction.toFixed(2)}${slicknessText}.`);
    }

    const windMagnitude = Math.abs(details.windSpeed ?? 0);
    if (windMagnitude > 0.1) {
      lines.push(
        `Wind was about ${windMagnitude.toFixed(1)} m/s (${(windMagnitude * METERS_PER_SECOND_TO_MPH).toFixed(1)} mph).`
      );
    }

    return `Impacted steep slope — ${lines.join(" ")}`;
  }

  return "";
}
