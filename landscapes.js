import { canvas, ctx } from "./canvasContext.js";
import { farmParameters } from "./farmParameters.js";

export const landscapes = {
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
    drawDetails() {
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
      if (amplitude <= 0.0001) {
        return canvas.height * 0.74;
      }

      const frequency = Math.max(20, farmParameters.frequency);
      const seed = farmParameters.seed ?? 0;

      const sampleScale = 1 / frequency;
      const offset = (x + seed * 97.31) * sampleScale;
      const amplitudeNoise = smoothNoise(seed, offset * 0.65);
      const phaseNoise = smoothNoise(seed, offset * 1.32 + 14.7);
      const layerNoise = smoothNoise(seed, offset * 1.9 + 31.4);

      const primaryAmplitude = amplitude * (0.35 + amplitudeNoise * 0.65);
      const primaryPhaseShift = phaseNoise * Math.PI * 2;
      const rolling = Math.sin(((x + time * 25) / frequency) + primaryPhaseShift + seed * 0.001) * primaryAmplitude;

      const secondaryBase = amplitude * 0.55;
      const secondaryAmplitude = secondaryBase * (0.25 + layerNoise * 0.55);
      const secondaryFrequency = Math.max(40, frequency * (0.42 + layerNoise * 0.4));
      const secondaryPhaseShift = (layerNoise * Math.PI * 1.6) + seed * 0.0025;
      const layers = Math.sin(((x - time * 40) / secondaryFrequency) + secondaryPhaseShift) * secondaryAmplitude;

      const totalOffset = clamp(rolling + layers, -amplitude, amplitude);
      return canvas.height * 0.74 + totalOffset;
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

function pseudoRandom(seed, value) {
  const x = Math.sin(value * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function smoothNoise(seed, value) {
  const base = Math.floor(value);
  const next = base + 1;
  const fraction = value - base;
  const n0 = pseudoRandom(seed, base);
  const n1 = pseudoRandom(seed, next);
  const t = smoothstep(fraction);
  return lerp(n0, n1, t);
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
