// src/icons/EquipmentIcons.tsx
//
// Central place to map equipment / fault families to icons and labels.

import React from "react";
import {
  AlertTriangle,
  Activity,
  Vibrate,
  Cog,
  Gauge,
  Waves,
  AlertCircle,
  CircleDot,
} from "lucide-react";

// Import your custom SVG icons as React components.
// Make sure these filenames match what you actually have in src/assets/icons.
import MotorSvg from "../assets/icons/motor.svg?react";
import PulleySvg from "../assets/icons/pulley.svg?react";
import FanSvg from "../assets/icons/fan.svg?react";
import GearboxSvg from "../assets/icons/gearbox.svg?react";
import PumpSvg from "../assets/icons/pump.svg?react";
import CompressorSvg from "../assets/icons/compressor.svg?react";
import ScrewCompPng from "../assets/icons/ScrewComp2.png";
import ScrewCompTop from "../assets/icons/ScrewComp3.png";
// If you later add a bearing.svg, you can import it and replace Vibrate below:
// import BearingSvg from "../assets/icons/bearing.svg?react";

// Human-friendly labels for fault codes
export const CODE_LABELS: Record<string, string> = {
  overall_severity: "Overall Vibration",
  unbalance: "Unbalance",
  looseness: "Looseness",
  misalignment: "Misalignment",
  bearing_rms_high: "Bearing RMS High",
  gear_issue: "Gearbox Issue",
  motor_mech_issue: "Motor Mechanical Issue",
  process_or_mech_issue: "Pump/Compressor Issue",
  fan_unbalance_or_looseness: "Fan Unbalance/Looseness",
  pulley_belt_issue: "Pulley / Belt Drive Issue",
};

// Severity color palettes for FaultCard
export const SEVERITY_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  ok: { bg: "#022c22", text: "#6ee7b7", border: "#064e3b" },
  info: { bg: "#111827", text: "#60a5fa", border: "#1f2937" },
  warning: { bg: "#451a03", text: "#facc15", border: "#854d0e" },
  alarm: { bg: "#450a0a", text: "#f97373", border: "#991b1b" },
  critical: { bg: "#111827", text: "#fca5a5", border: "#b91c1c" },
};

// Colors per fault family (for labels / icon strokes)
export const FAMILY_COLORS: Record<string, string> = {
  overall: "#9ca3af",
  mechanical: "#f97316",
  bearing: "#22d3ee",
  gearbox: "#a855f7",
  motor: "#38bdf8",
  comopressor: "#a1aeb4ff",
  belt_drive: "#eab308",
  process: "#34d399",
};

// Base icons per family
const FAMILY_ICONS: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  overall: Gauge,          // tach/gauge icon
  mechanical: Activity,    // generic vibration
  bearing: Vibrate,        // use lucide Vibrate for bearing (no BearingSvg yet)
  gearbox: GearboxSvg,
  motor: MotorSvg,
  belt_drive: PulleySvg,
  process: PumpSvg,
  compressor: CompressorSvg,
};

// Fallback icons if no specific family mapping
const DEFAULT_OK_ICON = CircleDot;
const DEFAULT_ALARM_ICON = AlertTriangle;

/**
 * Return an icon component for a given fault family / severity.
 */
export function getIconForFamily(
  family: string,
  severity: string
): React.ComponentType<React.SVGProps<SVGSVGElement>> {
  const base = FAMILY_ICONS[family];
  if (base) return base;
  if (severity === "alarm" || severity === "critical") return DEFAULT_ALARM_ICON;
  return DEFAULT_OK_ICON;
}

/**
 * Map equip_type strings (from diagnostics) to icons for headers/lists.
 */
export const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  ElectricMotor: MotorSvg,
  Pulley: PulleySvg,
  Fan: FanSvg,
  fan: FanSvg,
  Gearbox: GearboxSvg,
  Pump: PumpSvg,
  // Detail-page large image (ScrewComp2) is handled via CompressorStatusOverlay; header/summary icon uses ScrewComp3.
  Compressor: (() => (
    <img
      src={ScrewCompTop}
      alt="Compressor"
      style={{ width: 300, height: 120, objectFit: "contain" }}
    />
  )) as any,
  compressor: (() => (
    <img
      src={ScrewCompTop}
      alt="Compressor"
      style={{ width: 120, height: 120, objectFit: "contain" }}
    />
  )) as any,
};
