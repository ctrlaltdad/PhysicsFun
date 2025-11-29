import { CAR_TOP_SPEED_MPS } from "./constants.js";

export const players = {
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
    maxSpeed: CAR_TOP_SPEED_MPS,
    maxVerticalSpeed: 30,
    jumpVelocity: 0,
    restitution: 0.05,
    activeFrictionScale: 0.08
  }
};
