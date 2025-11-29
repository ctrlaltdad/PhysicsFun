export const PIXELS_PER_METER = 35;

// Vehicle parameters derived from common manufacturer limits and crash research
// ~200 km/h is a typical electronic limiter for many production performance sedans
export const CAR_TOP_SPEED_KMH = 200;
export const CAR_TOP_SPEED_MPS = CAR_TOP_SPEED_KMH / 3.6;

export const METERS_PER_SECOND_TO_MPH = 2.23694;
export const NEWTON_TO_LBF = 0.224809;
export const METERS_TO_FEET = 3.28084;

// ≈14 m/s corresponds to a 50 km/h delta-V, a well-documented severe injury threshold
export const CAR_CRASH_THRESHOLD = 13.9; // m/s

export const physicsDefaults = {
  gravity: 9.81,
  friction: 0.8,
  airResistance: 0.02
};

export const farmDefaults = {
  height: 40,
  frequency: 180
};
