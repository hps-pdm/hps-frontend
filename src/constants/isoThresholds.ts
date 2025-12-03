// src/constants/isoThresholds.ts

//-----------------------------------------------------
// ISO MACHINE GROUPS (10816/20816)
//-----------------------------------------------------
// 1 = Large machines >300kW, stiff foundation
// 2 = Small/medium industrial machines (motors, pumps, fans) on rigid foundation
// 3 = Machines on flexible foundation
// 4 = Special, slow-speed, large-mass machines
//-----------------------------------------------------

export type IsoGroup = 1 | 2 | 3 | 4;

export const MM_PER_IN = 25.4;

//-----------------------------------------------------
// 1) VELOCITY RMS (mm/s) — REAL ISO STANDARD THRESHOLDS
//-----------------------------------------------------
export interface IsoVelocityThreshold {
  ok_mm_s: number;    // OK → Warning boundary
  warn_mm_s: number;  // Warning → Alarm boundary
  max_mm_s: number;   // Gauge max
}

// ISO 10816/20816 typical values
export const ISO_VELOCITY_THRESHOLDS: Record<IsoGroup, IsoVelocityThreshold> = {
  // Align with config threshold_matrix.vel_rms_mm_s
  1: { ok_mm_s: 1.12, warn_mm_s: 1.80, max_mm_s: 2.80 },
  2: { ok_mm_s: 2.80, warn_mm_s: 4.50, max_mm_s: 7.10 },
  3: { ok_mm_s: 7.10, warn_mm_s: 11.20, max_mm_s: 18.0 },
  4: { ok_mm_s: 18.0, warn_mm_s: 28.0, max_mm_s: 28.0 },
};

export interface IsoVelocityThresholdIn {
  ok_in_s: number;
  warn_in_s: number;
  max_in_s: number;
}

export function mmPerSecToInPerSec(v_mm_s: number): number {
  return v_mm_s / MM_PER_IN;
}

export function getIsoVelocityThresholdsIn(
  group?: number | null
): IsoVelocityThresholdIn {
  const g: IsoGroup =
    group === 1 || group === 2 || group === 3 || group === 4 ? group : 2;

  const base = ISO_VELOCITY_THRESHOLDS[g];

  return {
    ok_in_s: mmPerSecToInPerSec(base.ok_mm_s),
    warn_in_s: mmPerSecToInPerSec(base.warn_mm_s),
    max_in_s: mmPerSecToInPerSec(base.max_mm_s),
  };
}

export function getIsoVelocityThresholdsMm(
  group?: number | null
): IsoVelocityThreshold {
  const g: IsoGroup =
    group === 1 || group === 2 || group === 3 || group === 4 ? group : 2;
  return ISO_VELOCITY_THRESHOLDS[g];
}

//-----------------------------------------------------
// 2) ACCELERATION RMS (g) — Option 1 (group-aware scaling)
//-----------------------------------------------------
// Base thresholds for Group 2 (small/medium machines)
// Then scale by group:
//   Group 1 = 0.9x (stricter)
//   Group 2 = 1.0x
//   Group 3 = 1.2x (looser due to flexible foundation)
//   Group 4 = 1.2x (slow-speed, heavy machines)
//-----------------------------------------------------

export interface IsoAccThresholds {
  ok_g: number;
  warn_g: number;
  max_g: number;
}

// Fallback only; RPM-based beta curve should be used when available.
const BASE_ACC_OK = 0.71;     // matches config thresholds.acc_rms_g.ok
const BASE_ACC_WARN = 1.42;   // matches config thresholds.acc_rms_g.warning
const BASE_ACC_MAX = 2.0;

export function getIsoAccThresholds(group?: number | null): IsoAccThresholds {
  return {
    ok_g: BASE_ACC_OK,
    warn_g: BASE_ACC_WARN,
    max_g: BASE_ACC_MAX,
  };
}

//-----------------------------------------------------
// 3) ENVELOPE (gE) — Option 1 (group-aware scaling)
//-----------------------------------------------------
// Base thresholds for Group 2:
//   OK   < 0.15 gE
//   WARN < 0.30 gE
//   ALARM > 0.30 gE
// Scale slightly based on group:
//   Group 1 = 0.9x
//   Group 2 = 1.0x
//   Group 3 = 1.2x
//   Group 4 = 1.2x
//-----------------------------------------------------

export interface IsoEnvThresholds {
  ok_gE: number;
  warn_gE: number;
  max_gE: number;
}

const BASE_ENV_OK = 0.15;     // Group 2 baseline
const BASE_ENV_WARN = 0.30;
const BASE_ENV_MAX = 0.60;

function envScale(group: IsoGroup): number {
  if (group === 1) return 0.9;
  if (group === 2) return 1.0;
  if (group === 3) return 1.2;
  return 1.2; // group 4
}

export function getIsoEnvThresholds(
  group?: number | null
): IsoEnvThresholds {
  const g: IsoGroup =
    group === 1 || group === 2 || group === 3 || group === 4 ? group : 2;

  const f = envScale(g);

  return {
    ok_gE: BASE_ENV_OK * f,
    warn_gE: BASE_ENV_WARN * f,
    max_gE: BASE_ENV_MAX * f,
  };
}
