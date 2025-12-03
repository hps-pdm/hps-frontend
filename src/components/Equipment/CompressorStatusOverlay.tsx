"use client";

import React from "react";
import ScrewComp2 from "../../assets/icons/ScrewComp2.png";

type Status = "ok" | "warning" | "alarm" | "unknown";

const STATUS_COLOR: Record<Status, string> = {
  ok: "#22c55e",
  warning: "#facc15",
  alarm: "#ef4444",
  unknown: "#9ca3af",
};

type Dot = {
  key: string;
  top: string;
  left: string;
  label: string;
  status: Status;
};

type Props = {
  bearingStatus?: Status;
  unbalanceStatus?: Status;
  overallStatus?: Status;
  motorStatus?: Status;
  motorBearingStatus?: Status;
  motorUnbalanceStatus?: Status;
  motorLoosenessStatus?: Status;
  couplingStatus?: Status;
  misalignmentStatus?: Status;
  loosenessStatus?: Status;
};

/**
 * Shows tiny status circles over the ScrewComp2 diagram.
 * Statuses are passed in; when unavailable they render as gray (unknown).
 */
export default function CompressorStatusOverlay({
  bearingStatus = "unknown",
  unbalanceStatus = "unknown",
  overallStatus = "unknown",
  motorStatus = "unknown",
  motorBearingStatus = "unknown",
  motorUnbalanceStatus = "unknown",
  motorLoosenessStatus = "unknown",
  couplingStatus = "unknown",
  misalignmentStatus = "unknown",
  loosenessStatus = "unknown",
}: Props) {
  const normalize = (s: any): Status => {
    const v = (s ?? "").toString().toLowerCase();
    if (v === "ok" || v === "warning" || v === "alarm") return v;
    return "unknown";
  };
  const overall = normalize(overallStatus);
  const bearing = normalize(bearingStatus);
  const unbalance = normalize(unbalanceStatus);
  const looseness = normalize(loosenessStatus);
  const motorStatusBase = normalize(motorStatus);
  const motorBearing = normalize(motorBearingStatus);
  const motorUnbalance = normalize(motorUnbalanceStatus);
  const motorLooseness = normalize(motorLoosenessStatus);
  const misalign = normalize(misalignmentStatus);
  const coupling = normalize(couplingStatus);
  const worst = (a: Status, b: Status): Status => {
    const order: Record<Status, number> = { ok: 0, warning: 1, alarm: 2, unknown: -1 };
    return order[a] >= order[b] ? a : b;
  };
  const rotorStatusStrict = worst(unbalance, looseness);

  // For motor and rotors, if unknown, fall back to overall; otherwise use the strict computed value
  const motorStrict = worst(motorUnbalance, motorLooseness);
  const motorStatusFinal =
    motorStrict === "unknown"
      ? motorStatusBase === "unknown"
        ? overall
        : motorStatusBase
      : motorStrict;
  const rotorStatus = rotorStatusStrict === "unknown" ? overall : rotorStatusStrict;
  const motorBearingFinal =
    motorBearing === "unknown"
      ? motorStatusFinal === "unknown"
        ? overall
        : motorStatusFinal
      : motorBearing;

  const resolve = (s: Status) => (s === "unknown" ? overall : s);

  const dots: Dot[] = [
    // Keep Motor NDE gray for now (unknown)
    { key: "Motor NDE", top: "55%", left: "25%", label: "Motor NDE", status: "unknown" },
    { key: "Motor", top: "55%", left: "40%", label: "Motor", status: motorStatusFinal },
    { key: "Motor DE", top: "55%", left: "60%", label: "Motor DE", status: resolve(motorBearingFinal) },
    { key: "Coupling", top: "55%", left: "70%", label: "Coupling", status: resolve(worst(misalign, coupling)) },
    // Gear: force green (ok) for now
    { key: "Gear", top: "55%", left: "90%", label: "Gear", status: "ok" },
    { key: "Rotor DE", top: "55%", left: "99%", label: "Rotor DE", status: bearing === "unknown" ? overall : bearing },
    { key: "Rotor", top: "55%", left: "120%", label: "Rotor", status: resolve(rotorStatus) },
    { key: "Rotor NDE", top: "55%", left: "142%", label: "Rotor NDE", status: "unknown" },
  ];

  return (
    <div style={{ position: "relative", width: 350, height: "auto", margin: "0 auto" }}>
    <img
      src={ScrewComp2}
      alt="Compressor"
      style={{
        width: "150%",   // >100% to enlarge; adjust as needed
        height: "auto",
        display: "block",
        opacity: 0.2, // 0 = fully transparent, 1 = fully opaque
        transform: "scale(1)",
        transformOrigin: "center center",
      }}
    />
      {dots.map((d) => (
        <div
          key={d.key}
          title={`${d.label}: ${d.status}`}
          style={{
            position: "absolute",
            top: d.top,
            left: d.left,
            transform: "translate(-50%, -50%)",
            width: 15,
            height: 15,
            borderRadius: "50%",
            backgroundColor: STATUS_COLOR[d.status],
            border: "1px solid rgba(0, 0, 0, 0.76)",
            boxShadow: "0 0 4px rgba(0, 0, 0, 0.91)",
          }}
        />
      ))}
    </div>
  );
}
