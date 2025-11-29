import { canvas } from "./canvasContext.js";
import { controls } from "./controls.js";
import { PIXELS_PER_METER, physicsDefaults } from "./constants.js";
import { landscapes } from "./landscapes.js";
import { players } from "./players.js";
import { farmParameters, resetFarmParameters, setFarmFrequency, setFarmHeight } from "./farmParameters.js";
import { createPlayer } from "./playerFactory.js";
import { updatePhysics } from "./physics.js";
import { renderScene } from "./rendering.js";
import { updateEquations, updateMetrics } from "./ui.js";
import { crashFragments, updateCrashFragments } from "./crashEffects.js";

const state = {
  playerType: "person",
  landscapeType: "beach",
  gravity: physicsDefaults.gravity,
  groundFriction: physicsDefaults.friction,
  airResistance: physicsDefaults.airResistance,
  worldX: 0,
  sceneTime: 0,
  lastForceX: 0,
  lastAppliedForceX: 0,
  dragForceX: 0,
  frictionForceX: 0,
  input: {
    left: false,
    right: false,
    jumpQueued: false
  },
  equationTimer: 0,
  carCrashTimer: 0,
  baseDefaults: { ...physicsDefaults },
  canvasCenterX: canvas.width * 0.5,
  weather: {
    windSpeed: 0,
    rainSlickness: 0
  },
  effectiveGroundFriction: physicsDefaults.friction
};

const unitState = {
  useImperial: false
};

let player = createPlayer(state.playerType);

controls.speedToggle.addEventListener("change", (event) => {
  unitState.useImperial = event.target.checked;
  updateMetrics(state, player, unitState);
});

controls.playerSelect.addEventListener("change", () => {
  state.playerType = controls.playerSelect.value;
  spawnPlayer();
  updateEquations(state, player);
});

controls.landscapeSelect.addEventListener("change", () => {
  state.landscapeType = controls.landscapeSelect.value;
  state.sceneTime = 0;
  applyLandscapeDefaults();
  updateFarmControlsVisibility();
  spawnPlayer();
  updateEquations(state, player);
});

controls.gravitySlider.addEventListener("input", (event) => {
  const value = parseFloat(event.target.value);
  setGravity(value);
  updateEquations(state, player);
});

controls.frictionSlider.addEventListener("input", (event) => {
  const value = parseFloat(event.target.value);
  setFriction(value);
  updateEquations(state, player);
});

controls.dragSlider.addEventListener("input", (event) => {
  const value = parseFloat(event.target.value);
  setAirResistance(value);
  updateEquations(state, player);
});

controls.farmHeightSlider.addEventListener("input", (event) => {
  const value = parseFloat(event.target.value);
  applyFarmHeight(value, false);
  if (state.landscapeType === "farm") {
    renderScene(state, player);
    updateEquations(state, player);
  }
});

controls.farmFrequencySlider.addEventListener("input", (event) => {
  const value = parseFloat(event.target.value);
  applyFarmFrequency(value, false);
  if (state.landscapeType === "farm") {
    renderScene(state, player);
    updateEquations(state, player);
  }
});

controls.windSlider.addEventListener("input", (event) => {
  const value = parseFloat(event.target.value);
  applyWind(value, false);
  updateEquations(state, player);
});

controls.rainSlider.addEventListener("input", (event) => {
  const value = parseFloat(event.target.value);
  applyRain(value, false);
  updateEquations(state, player);
});

controls.resetButton.addEventListener("click", () => {
  applyLandscapeDefaults();
  setGravity(physicsDefaults.gravity, true);
  if (state.landscapeType === "farm") {
    resetFarmParameters();
    syncFarmControls();
  }
  applyWind(0, true);
  applyRain(0, true);
  state.sceneTime = 0;
  spawnPlayer();
  updateEquations(state, player);
});

const keyMap = {
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyA: "left",
  KeyD: "right",
  ArrowUp: "jump",
  KeyW: "jump",
  Space: "jump"
};

window.addEventListener("keydown", (event) => {
  const action = keyMap[event.code];
  if (!action) {
    return;
  }
  event.preventDefault();
  if (action === "jump") {
    state.input.jumpQueued = true;
  } else {
    state.input[action] = true;
  }
});

window.addEventListener("keyup", (event) => {
  const action = keyMap[event.code];
  if (!action) {
    return;
  }
  if (action === "jump") {
    state.input.jumpQueued = false;
  } else {
    state.input[action] = false;
  }
});

window.addEventListener("blur", () => {
  state.input.left = false;
  state.input.right = false;
  state.input.jumpQueued = false;
});

let lastTimestamp = performance.now();

function frame(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.066);
  lastTimestamp = timestamp;

  const config = players[state.playerType];
  const landscape = landscapes[state.landscapeType];

  updatePhysics(state, player, config, landscape, dt);
  updateCrashFragments(landscape, state, dt);
  if (player.crashed) {
    state.carCrashTimer += dt;
  }

  const speedMeters = Math.sqrt(player.vx * player.vx + player.vy * player.vy) / PIXELS_PER_METER;
  const inputsActive = state.input.left || state.input.right;
  if (inputsActive || speedMeters > 0.1) {
    state.sceneTime += dt;
  }

  renderScene(state, player);
  updateMetrics(state, player, unitState);

  state.equationTimer += dt;
  if (state.equationTimer >= 0.12) {
    updateEquations(state, player);
    state.equationTimer = 0;
  }

  requestAnimationFrame(frame);
}

function spawnPlayer() {
  player = createPlayer(state.playerType);
  const landscape = landscapes[state.landscapeType];
  const halfHeight = player.height / 2;
  state.worldX = 0;
  state.canvasCenterX = canvas.width * 0.5;
  player.x = state.canvasCenterX;
  const groundY = landscape.ground(state.worldX, state.sceneTime);
  player.y = groundY - halfHeight;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.crashed = false;
  state.carCrashTimer = 0;
  crashFragments.length = 0;
}

function setGravity(value, updateSlider = false) {
  state.gravity = value;
  controls.gravityValue.textContent = value.toFixed(2);
  if (updateSlider) {
    controls.gravitySlider.value = value.toFixed(2);
  }
}

function setFriction(value, updateSlider = false) {
  state.groundFriction = value;
  controls.frictionValue.textContent = value.toFixed(2);
  if (updateSlider) {
    controls.frictionSlider.value = value.toFixed(2);
  }
}

function setAirResistance(value, updateSlider = false) {
  state.airResistance = value;
  controls.dragValue.textContent = value.toFixed(3);
  if (updateSlider) {
    controls.dragSlider.value = value.toFixed(3);
  }
}

function applyLandscapeDefaults() {
  const landscape = landscapes[state.landscapeType];
  setFriction(landscape.baseFriction, true);
  setAirResistance(landscape.baseDrag, true);
}

function applyFarmHeight(value, syncSlider = true) {
  setFarmHeight(value);
  controls.farmHeightValue.textContent = Math.round(farmParameters.height);
  if (syncSlider) {
    controls.farmHeightSlider.value = farmParameters.height;
  }
}

function applyFarmFrequency(value, syncSlider = true) {
  setFarmFrequency(value);
  controls.farmFrequencyValue.textContent = Math.round(farmParameters.frequency);
  if (syncSlider) {
    controls.farmFrequencySlider.value = farmParameters.frequency;
  }
}

function applyWind(value, syncSlider = true) {
  state.weather.windSpeed = value;
  controls.windValue.textContent = value.toFixed(1);
  if (syncSlider) {
    controls.windSlider.value = value;
  }
}

function applyRain(percent, syncSlider = true) {
  const clamped = Math.max(0, Math.min(100, percent));
  state.weather.rainSlickness = clamped / 100;
  controls.rainValue.textContent = clamped.toFixed(0);
  if (syncSlider) {
    controls.rainSlider.value = clamped;
  }
}

function syncFarmControls() {
  applyFarmHeight(farmParameters.height, true);
  applyFarmFrequency(farmParameters.frequency, true);
}

function updateFarmControlsVisibility() {
  const showFarmControls = state.landscapeType === "farm";
  controls.farmControls.hidden = !showFarmControls;
  if (showFarmControls) {
    syncFarmControls();
  }
}

function initializeUI() {
  controls.playerSelect.value = state.playerType;
  controls.landscapeSelect.value = state.landscapeType;
  setGravity(state.gravity, true);
  setFriction(state.groundFriction, true);
  setAirResistance(state.airResistance, true);
  syncFarmControls();
  applyWind(state.weather.windSpeed, true);
  applyRain(state.weather.rainSlickness * 100, true);
  updateFarmControlsVisibility();
  updateEquations(state, player);
  updateMetrics(state, player, unitState);
}

applyLandscapeDefaults();
spawnPlayer();
initializeUI();
requestAnimationFrame(frame);
