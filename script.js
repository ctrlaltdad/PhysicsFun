(() => {
  const canvas = document.getElementById("playground");
  const ctx = canvas.getContext("2d");

  const PIXELS_PER_METER = 35;
  const CAR_CRASH_THRESHOLD = 12; // meters per second; above this counts as a crash
  const defaults = {
    gravity: 9.81,
    friction: 0.8,
    airResistance: 0.02
  };

  const farmDefaults = {
    height: 40,
    frequency: 180
  };

  const farmParameters = {
    height: farmDefaults.height,
    frequency: farmDefaults.frequency
  };

  const players = {
    person: {
      label: "Person",
      mass: 70,
      bodyWidth: 0.6,
      bodyHeight: 1.8,
      color: "#f4a261",
      accent: "#264653",
      moveForce: 220,
      maxSpeed: 8,
      maxVerticalSpeed: 12,
      jumpVelocity: 6.5,
      restitution: 0.18,
      activeFrictionScale: 0.3
    },
    car: {
      label: "Car",
      mass: 1200,
      bodyWidth: 2.6,
      bodyHeight: 1.4,
      color: "#2a9d8f",
      accent: "#1f6f63",
      moveForce: 4000,
      maxSpeed: 67.06,
      maxVerticalSpeed: 30,
      jumpVelocity: 0,
      restitution: 0.05,
      activeFrictionScale: 0.08
    }
  };

  const landscapes = {
    beach: {
      label: "Sunny Beach",
      baseFriction: 0.45,
      baseDrag: 0.04,
      palette: {
        skyTop: "#4facfe",
        skyBottom: "#00c6fb",
        ground: "#fbd786",
        groundShadow: "#f7a26c",
        overlay: "#ffe5a0"
      },
      ground(x, time) {
        const gentle = Math.sin((x + time * 60) / 160) * 18;
        const ripples = Math.cos((x - time * 45) / 90) * 6;
        return canvas.height * 0.78 + gentle + ripples;
      },
      drawDetails(time, worldX) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "#ffe29f";
        ctx.beginPath();
        ctx.arc(canvas.width - 90, 90, 55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        const horizon = canvas.height * 0.65;
        const water = ctx.createLinearGradient(0, horizon - 10, 0, horizon + 60);
        water.addColorStop(0, "rgba(255, 255, 255, 0.4)");
        water.addColorStop(1, "rgba(0, 198, 251, 0.35)");
        ctx.fillStyle = water;
        ctx.fillRect(0, horizon - 10, canvas.width, 80);
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 2;
        const waveTile = 40;
        const waveOffset = ((worldX % waveTile) + waveTile) % waveTile;
        for (let i = 0; i < 5; i += 1) {
          const waveY = horizon + Math.sin(time * 2 + i) * 6 + i * 12;
          ctx.beginPath();
          ctx.moveTo(-waveOffset, waveY);
          for (let x = -waveOffset; x <= canvas.width + waveTile; x += waveTile) {
            ctx.quadraticCurveTo(x + 10, waveY - 3, x + 20, waveY);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    },
    racetrack: {
      label: "Race Track",
      baseFriction: 0.92,
      baseDrag: 0.015,
      palette: {
        skyTop: "#1b2735",
        skyBottom: "#090a0f",
        ground: "#444957",
        groundShadow: "#2f343f",
        overlay: "#d62839"
      },
      ground(x) {
        const base = canvas.height * 0.82;
        const camber = Math.pow(Math.sin(x / 240), 3) * 28;
        const bump = Math.exp(-Math.pow((x - canvas.width * 0.55) / 160, 2)) * 70;
        return base - camber - bump;
      },
      drawDetails(time, worldX) {
        ctx.save();
        const crowdHeight = canvas.height * 0.35;
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(0, crowdHeight, canvas.width, 8);
        ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        ctx.fillRect(0, crowdHeight + 8, canvas.width, 50);
        ctx.restore();
      }
    },
    farm: {
      label: "Hilly Farm",
      baseFriction: 0.72,
      baseDrag: 0.03,
      palette: {
        skyTop: "#ffecd2",
        skyBottom: "#fcb69f",
        ground: "#6fcb4c",
        groundShadow: "#4e8432",
        overlay: "#f77f00"
      },
      ground(x, time) {
        const amplitude = farmParameters.height;
        const frequency = farmParameters.frequency;
        const rolling = Math.sin((x + time * 25) / frequency) * amplitude;
        const secondaryAmplitude = amplitude * 0.45;
        const secondaryFrequency = Math.max(50, frequency * 0.5);
        const layers = Math.sin((x - time * 40) / secondaryFrequency) * secondaryAmplitude;
        return canvas.height * 0.74 + rolling + layers;
      },
      drawDetails(time, worldX) {
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        const cloudY = canvas.height * 0.28 + Math.sin(time * 0.6) * 10;
        const cloudSpacing = 220;
        const parallax = 0.4;
        const cloudOffset = (((worldX * parallax) % cloudSpacing) + cloudSpacing) % cloudSpacing;
        for (let i = -1; i <= 2; i += 1) {
          const cloudX = 80 - cloudOffset + i * cloudSpacing;
          ctx.beginPath();
          ctx.arc(cloudX, cloudY, 24, 0, Math.PI * 2);
          ctx.arc(cloudX + 32, cloudY + 5, 30, 0, Math.PI * 2);
          ctx.arc(cloudX + 64, cloudY, 26, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  };

  const controls = {
    playerSelect: document.getElementById("playerSelect"),
    landscapeSelect: document.getElementById("landscapeSelect"),
    gravitySlider: document.getElementById("gravitySlider"),
    gravityValue: document.getElementById("gravityValue"),
    frictionSlider: document.getElementById("frictionSlider"),
    frictionValue: document.getElementById("frictionValue"),
    dragSlider: document.getElementById("dragSlider"),
    dragValue: document.getElementById("dragValue"),
    speedReadout: document.getElementById("speedReadout"),
    speedUnit: document.getElementById("speedUnit"),
    speedSecondaryReadout: document.getElementById("speedSecondaryReadout"),
    speedSecondaryUnit: document.getElementById("speedSecondaryUnit"),
    speedToggle: document.getElementById("speedUnitToggle"),
    farmControls: document.getElementById("farmControls"),
    farmHeightSlider: document.getElementById("farmHeightSlider"),
    farmHeightValue: document.getElementById("farmHeightValue"),
    farmFrequencySlider: document.getElementById("farmFrequencySlider"),
    farmFrequencyValue: document.getElementById("farmFrequencyValue"),
    heightReadout: document.getElementById("heightReadout"),
    forceReadout: document.getElementById("forceReadout"),
    equations: document.getElementById("equations"),
    resetButton: document.getElementById("resetButton")
  };

  const state = {
    playerType: "person",
    landscapeType: "beach",
    gravity: defaults.gravity,
    groundFriction: defaults.friction,
    airResistance: defaults.airResistance,
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
    carCrashTimer: 0
  };

  const unitState = {
    useImperial: false
  };

  const crashFragments = [];

  controls.speedToggle.addEventListener("change", (event) => {
    unitState.useImperial = event.target.checked;
    updateMetrics();
  });

  let player = createPlayer(state.playerType);

  function createPlayer(type) {
    const config = players[type];
    const widthPx = config.bodyWidth * PIXELS_PER_METER;
    const heightPx = config.bodyHeight * PIXELS_PER_METER;
    return {
      type,
      x: canvas.width * 0.5,
      y: canvas.height * 0.5,
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
      crashed: false
    };
  }

  function spawnPlayer() {
    player = createPlayer(state.playerType);
    const config = players[state.playerType];
    const landscape = landscapes[state.landscapeType];
    const halfHeight = player.height / 2;
    state.worldX = 0;
    player.x = canvas.width * 0.5;
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

  function setFarmHeight(value, updateSlider = false) {
    farmParameters.height = value;
    controls.farmHeightValue.textContent = Math.round(value);
    if (updateSlider) {
      controls.farmHeightSlider.value = value;
    }
  }

  function setFarmFrequency(value, updateSlider = false) {
    farmParameters.frequency = value;
    controls.farmFrequencyValue.textContent = Math.round(value);
    if (updateSlider) {
      controls.farmFrequencySlider.value = value;
    }
  }

  function syncFarmControls() {
    setFarmHeight(farmParameters.height, true);
    setFarmFrequency(farmParameters.frequency, true);
  }

  function updateFarmControlsVisibility() {
    const showFarmControls = state.landscapeType === "farm";
    controls.farmControls.hidden = !showFarmControls;
    if (showFarmControls) {
      syncFarmControls();
    }
  }

  function resetFarmParameters(forceSync = false) {
    setFarmHeight(farmDefaults.height, forceSync);
    setFarmFrequency(farmDefaults.frequency, forceSync);
  }

  function triggerCarCrash(impactVelocityMeters) {
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

  function updateCrashFragments(landscape, dt) {
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

  function applyLandscapeDefaults() {
    const landscape = landscapes[state.landscapeType];
    setFriction(landscape.baseFriction, true);
    setAirResistance(landscape.baseDrag, true);
  }

  controls.playerSelect.addEventListener("change", () => {
    state.playerType = controls.playerSelect.value;
    spawnPlayer();
    updateEquations();
  });

  controls.landscapeSelect.addEventListener("change", () => {
    state.landscapeType = controls.landscapeSelect.value;
    state.sceneTime = 0;
    applyLandscapeDefaults();
    updateFarmControlsVisibility();
    spawnPlayer();
    updateEquations();
  });

  controls.gravitySlider.addEventListener("input", (event) => {
    const value = parseFloat(event.target.value);
    setGravity(value);
    updateEquations();
  });

  controls.frictionSlider.addEventListener("input", (event) => {
    const value = parseFloat(event.target.value);
    setFriction(value);
    updateEquations();
  });

  controls.dragSlider.addEventListener("input", (event) => {
    const value = parseFloat(event.target.value);
    setAirResistance(value);
    updateEquations();
  });

  controls.farmHeightSlider.addEventListener("input", (event) => {
    const value = parseFloat(event.target.value);
    setFarmHeight(value);
    if (state.landscapeType === "farm") {
      renderScene();
      updateEquations();
    }
  });

  controls.farmFrequencySlider.addEventListener("input", (event) => {
    const value = parseFloat(event.target.value);
    setFarmFrequency(value);
    if (state.landscapeType === "farm") {
      renderScene();
      updateEquations();
    }
  });

  controls.resetButton.addEventListener("click", () => {
    applyLandscapeDefaults();
    setGravity(defaults.gravity, true);
    resetFarmParameters(state.landscapeType === "farm");
    state.sceneTime = 0;
    spawnPlayer();
    updateEquations();
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
    updatePhysics(dt);
    const landscape = landscapes[state.landscapeType];
    updateCrashFragments(landscape, dt);
    if (player.crashed) {
      state.carCrashTimer += dt;
    }
    const speedMeters = Math.sqrt(player.vx * player.vx + player.vy * player.vy) / PIXELS_PER_METER;
    const inputsActive = state.input.left || state.input.right;
    if (inputsActive || speedMeters > 0.1) {
      state.sceneTime += dt;
    }
    renderScene();
    updateMetrics();
    state.equationTimer += dt;
    if (state.equationTimer >= 0.12) {
      updateEquations();
      state.equationTimer = 0;
    }
    requestAnimationFrame(frame);
  }

  function updatePhysics(dt) {
    const config = players[state.playerType];
    const landscape = landscapes[state.landscapeType];

    player.ax = 0;
    player.ay = state.gravity * PIXELS_PER_METER;
    state.dragForceX = 0;
    state.frictionForceX = 0;

    const appliedForceX = applyControls(config);
    applyDrag(config);

    player.vx += player.ax * dt;
    player.vy += player.ay * dt;

    limitVelocity(config);

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    const centerX = canvas.width * 0.5;
    const offsetX = player.x - centerX;
    state.worldX += offsetX;
    player.x = centerX;

    clampBounds(config);
    const wasOnGround = player.onGround;
    resolveGroundCollision(config, landscape, wasOnGround);
    applyGroundFriction(config, dt);

    state.lastAppliedForceX = appliedForceX;
    state.lastForceX = appliedForceX + state.dragForceX + state.frictionForceX;
    player.facing = player.vx >= 0 ? 1 : -1;
  }

  function applyControls(config) {
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
        const adjustedJump = config.jumpVelocity * Math.sqrt(defaults.gravity / state.gravity);
        player.vy = -adjustedJump * PIXELS_PER_METER;
        player.onGround = false;
      }
    }

    state.input.jumpQueued = false;
    return totalForceX;
  }

  function applyDrag(config) {
    const vxMeters = player.vx / PIXELS_PER_METER;
    const dragAccelX = -state.airResistance * vxMeters;
    player.ax += dragAccelX * PIXELS_PER_METER;
    state.dragForceX = config.mass * dragAccelX;

    const vyMeters = player.vy / PIXELS_PER_METER;
    const dragAccelY = -state.airResistance * vyMeters;
    player.ay += dragAccelY * PIXELS_PER_METER;
  }

  function applyGroundFriction(config, dt) {
    if (!player.onGround || player.crashed) {
      state.frictionForceX = 0;
      return;
    }

    const vxMeters = player.vx / PIXELS_PER_METER;
    if (Math.abs(vxMeters) < 0.02 && !state.input.left && !state.input.right) {
      player.vx = 0;
      state.frictionForceX = 0;
      return;
    }

    const normalForce = config.mass * state.gravity;
    const maxFrictionForce = state.groundFriction * normalForce;
    const direction = Math.sign(vxMeters);
    if (direction === 0) {
      state.frictionForceX = 0;
      return;
    }

    const inputActive = state.input.left || state.input.right;
    const activeScale = config.activeFrictionScale ?? 0.45;
    const multiplier = inputActive ? activeScale : 1;
    const frictionForce = maxFrictionForce * multiplier;
    const frictionAccel = (frictionForce / config.mass);
    const deltaMeters = frictionAccel * dt;
    const deltaPixels = deltaMeters * PIXELS_PER_METER;
    if (Math.abs(player.vx) > deltaPixels) {
      player.vx -= deltaPixels * direction;
    } else if (!state.input.left && !state.input.right) {
      player.vx = 0;
    }
    state.frictionForceX = -direction * frictionForce;
  }

  function limitVelocity(config) {
    const maxHorizontal = config.maxSpeed * PIXELS_PER_METER;
    if (Math.abs(player.vx) > maxHorizontal) {
      player.vx = Math.sign(player.vx) * maxHorizontal;
    }

    const maxVertical = config.maxVerticalSpeed * PIXELS_PER_METER;
    if (Math.abs(player.vy) > maxVertical) {
      player.vy = Math.sign(player.vy) * maxVertical;
    }
  }

  function clampBounds(config) {
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

  function resolveGroundCollision(config, landscape, wasOnGround) {
    const groundY = landscape.ground(state.worldX, state.sceneTime);
    const halfHeight = player.height / 2;
    if (player.y + halfHeight >= groundY) {
      player.y = groundY - halfHeight;
      if (player.vy > 0) {
        const impactVelocityMeters = Math.abs(player.vy) / PIXELS_PER_METER;
        const totalVelocityMeters = Math.sqrt(player.vx * player.vx + player.vy * player.vy) / PIXELS_PER_METER;
        const landingImpact = !wasOnGround;
        if (landingImpact && state.playerType === "car" && !player.crashed) {
          const severeVertical = impactVelocityMeters > CAR_CRASH_THRESHOLD;
          const severeTotal = totalVelocityMeters > CAR_CRASH_THRESHOLD * 1.5 && impactVelocityMeters > 2;
          if (severeVertical || severeTotal) {
            const crashSeverity = Math.max(impactVelocityMeters, totalVelocityMeters * 0.35);
            triggerCarCrash(crashSeverity);
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

  function renderScene() {
    const landscape = landscapes[state.landscapeType];
    drawBackground(landscape);
    drawGround(landscape);
    if (landscape.drawDetails) {
      landscape.drawDetails(state.sceneTime, state.worldX);
    }
    drawShadow();
    drawPlayer();
    drawCrashFragments();
    drawCrashIndicator();
  }

  function drawBackground(landscape) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, landscape.palette.skyTop);
    gradient.addColorStop(1, landscape.palette.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawGround(landscape) {
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

  function drawShadow() {
    const landscape = landscapes[state.landscapeType];
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

  function drawPlayer() {
    const config = players[state.playerType];
    if (state.playerType === "person") {
      drawPerson(config);
    } else {
      drawCar(config);
    }
  }

  function drawPerson(config) {
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

  function drawCar(config) {
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

  function drawCrashFragments() {
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

  function drawCrashIndicator() {
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

  function updateMetrics() {
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

  function updateEquations() {
    const config = players[state.playerType];
    const vxMeters = player.vx / PIXELS_PER_METER;
    const vyMeters = player.vy / PIXELS_PER_METER;
    const speed = Math.sqrt(vxMeters * vxMeters + vyMeters * vyMeters);
    const kineticEnergy = 0.5 * config.mass * speed * speed;
    const momentum = config.mass * vxMeters;
    const modifiers = {
      gravity: Math.abs(state.gravity - defaults.gravity) > 0.05,
      friction: Math.abs(state.groundFriction - defaults.friction) > 0.02,
      drag: Math.abs(state.airResistance - defaults.airResistance) > 0.005
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
          `μ = ${state.groundFriction.toFixed(2)}`,
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

  syncFarmControls();
  updateFarmControlsVisibility();
  applyLandscapeDefaults();
  spawnPlayer();
  updateEquations();
  requestAnimationFrame(frame);
})();
