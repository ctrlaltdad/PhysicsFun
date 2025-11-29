import { farmDefaults } from "./constants.js";

export const farmParameters = {
  height: farmDefaults.height,
  frequency: farmDefaults.frequency
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
}
