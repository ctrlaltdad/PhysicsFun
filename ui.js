import { PIXELS_PER_METER } from "./constants.js";
import { controls } from "./controls.js";
import { landscapes } from "./landscapes.js";
import { players } from "./players.js";

export function updateMetrics(state, player, unitState) {
  const config = players[state.playerType];
  const landscape = landscapes[state.landscapeType];
  const vxMeters = player.vx / PIXELS_PER_METER;
  const vyMeters = player.vy / PIXELS_PER_METER;
  const speed = Math.sqrt(vxMeters * vxMeters + vyMeters * vyMeters);
  const speedKmh = speed * 3.6;
  const speedMph = speedKmh * 0.621371;

  if (unitState.useImperial) {
    controls.speedReadout.textContent = speedMph.toFixed(1);
    controls.speedUnit.textContent = "mph";
    controls.speedSecondaryReadout.textContent = speedKmh.toFixed(1);
    controls.speedSecondaryUnit.textContent = "km/h";
  } else {
    controls.speedReadout.textContent = speed.toFixed(1);
    controls.speedUnit.textContent = "m/s";
    controls.speedSecondaryReadout.textContent = speedKmh.toFixed(1);
    controls.speedSecondaryUnit.textContent = "km/h";
  }

  const groundY = landscape.ground(state.worldX, state.sceneTime);
  const heightAboveGround = Math.max(0, (groundY - (player.y + player.height / 2)) / PIXELS_PER_METER);
  controls.heightReadout.textContent = heightAboveGround.toFixed(2);

  controls.forceReadout.textContent = state.lastForceX.toFixed(0);
  player.ax = 0;
  player.ay = 0;
}

export function updateEquations(state, player) {
  const config = players[state.playerType];
  const vxMeters = player.vx / PIXELS_PER_METER;
  const vyMeters = player.vy / PIXELS_PER_METER;
  const speed = Math.sqrt(vxMeters * vxMeters + vyMeters * vyMeters);
  const kineticEnergy = 0.5 * config.mass * speed * speed;
  const momentum = config.mass * vxMeters;
  const effectiveFriction = state.effectiveGroundFriction ?? state.groundFriction;
  const modifiers = {
    gravity: Math.abs(state.gravity - state.baseDefaults.gravity) > 0.05,
    friction: Math.abs(effectiveFriction - state.baseDefaults.friction) > 0.02,
    drag: Math.abs(state.airResistance - state.baseDefaults.airResistance) > 0.005
  };

  const verticalExpression = "a_y = -g - c_air * v_y";
  const horizontalExpression = "a_x = (F_input - F_drag - F_friction) / m";
  const energyExpression = "E_k = 0.5 * m * v^2";

  const verticalAcceleration = -state.gravity - state.airResistance * vyMeters;
  const horizontalAcceleration = state.lastForceX / config.mass;

  const equations = [
    {
      title: "Vertical Motion",
      expression: verticalExpression,
      details: [
        `m = ${config.mass.toFixed(0)} kg`,
        `g = ${state.gravity.toFixed(2)} m/s^2`,
        `c_air = ${state.airResistance.toFixed(3)} s^-1`,
        `v_y = ${vyMeters.toFixed(2)} m/s`,
        `a_y (current) = ${verticalAcceleration.toFixed(2)} m/s^2`,
        `restitution e = ${config.restitution.toFixed(2)}`
      ],
      modified: modifiers.gravity || modifiers.drag
    },
    {
      title: "Horizontal Motion",
      expression: horizontalExpression,
      details: [
        `F_input = ${state.lastAppliedForceX.toFixed(0)} N`,
        `F_drag ≈ ${state.dragForceX.toFixed(0)} N`,
        `F_friction ≈ ${state.frictionForceX.toFixed(0)} N`,
        `μ_eff = ${effectiveFriction.toFixed(2)} (wet surface factor)`,
        `v_x = ${vxMeters.toFixed(2)} m/s`,
        `a_x (current) = ${horizontalAcceleration.toFixed(2)} m/s^2`
      ],
      modified: modifiers.friction || modifiers.drag
    },
    {
      title: "Energy Snapshot",
      expression: energyExpression,
      details: [
        `v = ${speed.toFixed(1)} m/s`,
        `E_k = ${kineticEnergy.toFixed(0)} J`,
        `p = ${momentum.toFixed(0)} kg*m/s`
      ],
      modified: speed > 0.5
    },
    {
      title: "Supporting Relations",
      expression: "F_drag = 0.5 * ρ * C_d * A * v^2",
      details: (() => {
        const lines = [
          "ρ ≈ 1.225 kg/m³ at sea level",
          "F_friction = μ * N, where N = m * g",
          "Δp = F_net * Δt (impulse)",
          "W = F * d = ΔE_k"
        ];
        lines.push(`Wind speed = ${state.weather.windSpeed.toFixed(1)} m/s`);
        const slicknessPercent = (state.weather.rainSlickness * 100).toFixed(0);
        lines.push(`Surface slickness = ${slicknessPercent}%`);
        if (player.crashed && state.playerType === "car") {
          lines.unshift("Status: vehicle disabled after high-impact collision");
        }
        if (!player.onGround) {
          lines.push("Projectile: y(t) = y₀ + v_{y0} t - 0.5 * g * t²");
        }
        return lines;
      })(),
      modified: true
    }
  ];

  controls.equations.innerHTML = equations.map((eq) => {
    const badge = eq.modified ? '<span class="badge">modified</span>' : "";
    const list = eq.details.map((line) => `<li>${line}</li>`).join("");
    return `
      <article class="equation${eq.modified ? " modified" : ""}">
        <h3>${eq.title}${badge}</h3>
        <code>${eq.expression}</code>
        <ul>${list}</ul>
      </article>
    `;
  }).join("");
}
