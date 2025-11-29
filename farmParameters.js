import { farmDefaults } from "./constants.js";

const randomSeed = () => Math.floor(Math.random() * 1000000);

export const farmParameters = {
  height: farmDefaults.height,
  frequency: farmDefaults.frequency,
  seed: randomSeed()
};

export function setFarmHeight(value) {
  farmParameters.height = value;
}

export function setFarmFrequency(value) {
  farmParameters.frequency = value;
}

export function resetFarmParameters() {
  farmParameters.height = farmDefaults.height;
  farmParameters.frequency = farmDefaults.frequency;
  farmParameters.seed = randomSeed();
}

export function reseedFarm() {
  farmParameters.seed = randomSeed();
}
