// Simple recommendation library keyed by equipment type and fault.
// Extend as needed; each entry is a short list of actionable steps.
export type FaultKey =
  | "overall"
  | "bearing"
  | "unbalance"
  | "misalignment"
  | "looseness";

type SevBucket = { warning?: string[]; alarm?: string[] };

export const RECOMMENDATIONS: Record<
  string,
  Partial<Record<FaultKey, SevBucket>>
> = {
  ElectricMotor: {
    bearing: {
      warning: [
        "Check bearing temperature/noise; inspect lubrication condition.",
        "If greaseable, add small amount of correct grease and trend change.",
      ],
      alarm: [
        "Plan bearing replacement soon; monitor temperature and vibration closely.",
        "If sealed, schedule swap; if greaseable, re-lube and prepare spare bearing.",
      ],
    },
    unbalance: {
      warning: [
        "Inspect for debris buildup and loose keys/set screws.",
        "Verify coupling hardware; schedule balance check.",
      ],
      alarm: [
        "Clean and remove debris immediately; lock-out if severe vibration persists.",
        "Perform precision balance or take out of service if balance cannot be restored.",
      ],
    },
    misalignment: {
      warning: [
        "Check coupling alignment and soft-foot; re-torque mounts.",
      ],
      alarm: [
        "Realign driver–driven; correct soft-foot; verify mounts and base flatness.",
        "If rapid heating/vibration, shut down and realign before restart.",
      ],
    },
    looseness: {
      warning: [
        "Check base/foot bolts and structural supports; re-torque as needed.",
      ],
      alarm: [
        "Inspect for cracked base or worn couplings; secure mounts before restart.",
      ],
    },
  },
  Compressor: {
    bearing: {
      warning: [
        "Check bearing temperature and lubrication health; refresh grease if applicable.",
      ],
      alarm: [
        "Schedule bearing replacement; monitor temp/vibe closely; prepare spare.",
      ],
    },
    unbalance: {
      warning: [
        "Inspect rotor for fouling/debris; clean if present.",
        "Verify coupling hardware and plan a balance check.",
      ],
      alarm: [
        "Check oil contamination and filtration system; if vibration remains high, schedule precision balance.",
      ],
    },
    misalignment: {
      warning: [
        "Verify driver–driven alignment; check soft-foot and pipe strain.",
      ],
      alarm: [
        "Realign and correct pipe strain before continued operation.",
      ],
    },
    looseness: {
      warning: [
        "Check frame/base bolts and drivetrain mounts for looseness.",
      ],
      alarm: [
        "Secure mounts; inspect for structural cracks or worn keys/couplings before restart.",
      ],
    },
  },
  Fan: {
    unbalance: {
      warning: [
        "Clean blades; remove buildup; verify balance weights and set screws.",
      ],
      alarm: [
        "Perform balance or isolate fan until balanced; inspect blades for damage.",
      ],
    },
    bearing: {
      warning: [
        "Inspect for noise/heat; refresh grease if applicable.",
      ],
      alarm: [
        "Plan bearing replacement; limit runtime if temperature/vibration is high.",
      ],
    },
  },
  Pump: {
    unbalance: {
      warning: [
        "Inspect impeller for buildup or damage; clean and re-balance if needed.",
      ],
      alarm: [
        "If vibration is severe, isolate pump; inspect impeller and balance before restart.",
      ],
    },
    bearing: {
      warning: [
        "Check lubrication and bearing temperature; schedule replacement if trending up.",
      ],
      alarm: [
        "Plan bearing swap; monitor closely; limit operation if temp/vibe rises.",
      ],
    },
    misalignment: {
      warning: [
        "Verify pump–motor alignment and pipe strain.",
      ],
      alarm: [
        "Realign and relieve pipe strain before continuing operation.",
      ],
    },
  },
  default: {
    bearing: {
      warning: [
        "Inspect bearing temperature/noise; check lubrication.",
      ],
      alarm: [
        "Plan bearing replacement; limit runtime if rising temp/vibration.",
      ],
    },
    unbalance: {
      warning: [
        "Inspect for debris and loose hardware; schedule balance check.",
      ],
      alarm: [
        "If vibration is high, isolate and balance; secure all hardware.",
      ],
    },
    misalignment: {
      warning: [
        "Verify alignment and mounting; check for soft-foot.",
      ],
      alarm: [
        "Realign before continued operation; correct soft-foot/base issues.",
      ],
    },
    looseness: {
      warning: [
        "Re-torque mounts/base; inspect for structural play.",
      ],
      alarm: [
        "Secure mounts; repair/replace worn components before restart.",
      ],
    },
    overall: {
      warning: [
        "Confirm operating conditions and recent changes; plan inspection.",
      ],
      alarm: [
        "Review operating envelope; prioritize inspection and corrective work.",
      ],
    },
  },
};
