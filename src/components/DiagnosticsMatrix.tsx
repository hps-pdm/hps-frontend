"use client";

import React from "react";
import { Link } from "react-router-dom";

import type { FleetDiagRow } from "./TopCriticalEquipment";

import {
  MisalignmentIcon,
  LoosenessIcon,
  ImbalanceIcon,
  BearingIcon,
} from "./DiagnosticIcons";
import MotorIcon from "../assets/icons/motor.svg?react";
import FanIcon from "../assets/icons/fan.svg?react";
import GearboxIcon from "../assets/icons/gearbox.svg?react";
import PumpIcon from "../assets/icons/pump.svg?react";
import PulleyIcon from "../assets/icons/pulley.svg?react";
import CompressorIcon from "../assets/icons/compressor.svg?react";

const FAULT_ICONS: Record<string, JSX.Element> = {
  Misalignment: <MisalignmentIcon size={22} />,
  Unbalance: <ImbalanceIcon size={22} />,
  Looseness: <LoosenessIcon size={22} />,
  Bearing: <BearingIcon size={22} />,
};

type Status = "ok" | "warning" | "alarm";

const STATUS_SCORE: Record<Status, number> = {
  ok: 1.0,
  warning: 0.5,
  alarm: 0.0,
};

function computeEquipmentHealth(row: FleetDiagRow): number {
  const vals: Status[] = [
    row.misalignment,
    row.unbalance,
    row.looseness,
    row.bearing,
  ];
  const total = vals.reduce((acc, s) => acc + STATUS_SCORE[s], 0);
  return Math.round((total / vals.length) * 100);
}

function healthBadgeColor(health: number): string {
  if (health <= 60) return "#ff0000";
  if (health <= 75) return "#facc15ff";
  return "#49fb03ff";
}

function healthBadgeLabel(health: number): string {
  if (health <= 60) return "Critical";
  if (health <= 75) return "Warning";
  return "OK";
}

function HealthBadge({ health }: { health: number }) {
  const color = healthBadgeColor(health);
  const label = healthBadgeLabel(health);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 999,
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        border: `1px solid ${color}`,
        fontSize: 14,
        color: "#E5E7EB",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
      <span>{label}</span>
      <span style={{ opacity: 0.8 }}>· {health}/100</span>
    </span>
  );
}

const STATUS_COLOR: Record<Status, string> = {
  ok: "#49fb03ff",
  warning: "rgb(241, 196, 15)",
  alarm: "#ff0000",
};

function Dot({ status }: { status: Status }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: "50%",
        backgroundColor: STATUS_COLOR[status],
      }}
    />
  );
}



function Indicator({ label, status }: { label: string; status: Status }) {
  return (
    <div style={{ textAlign: "center", minWidth: 120 }}>
      <div
        style={{
          fontSize: 17,
          color: "#9CA3AF",
          marginBottom: 4,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 4,
        }}
      >
        {FAULT_ICONS[label]} {label}
      </div>
      <Dot status={status} />
    </div>
  );
}

function EquipTypeIcon({ type }: { type: string | null }) {
  const raw = (type || "").trim();
  const key = raw.toLowerCase();
  const size = 50;
  const wrapperStyle: React.CSSProperties = {
    width: 60,
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const iconStyle = {
    fill: "#e5e7eb",
    color: "#e5e7eb",
    width: key.includes("compressor") ? size + 6 : size,
    height: key.includes("compressor") ? size + 6 : size,
    stroke: "#e5e7eb",
    display: "block",
    objectFit: "contain",
  };

  let IconComp: React.ComponentType<any> | null = null;
  if (key.includes("motor")) IconComp = MotorIcon;
  else if (key.includes("fan")) IconComp = FanIcon;
  else if (key.includes("gear")) IconComp = GearboxIcon;
  else if (key.includes("pump")) IconComp = PumpIcon;
  else if (key.includes("pulley") || key.includes("belt")) IconComp = PulleyIcon;
  else if (key.includes("compressor")) IconComp = CompressorIcon;

  if (!IconComp) return null;

  return (
    <div style={wrapperStyle}>
      <IconComp style={iconStyle} />
    </div>
  );
}

export default function DiagnosticsMatrix({ rows }: { rows: FleetDiagRow[] }) {
  if (!rows || !rows.length) return null;

  return (
    <div style={{ marginTop: 16 }}>
      {rows.map((r) => {
        const health = computeEquipmentHealth(r);
        return (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px auto",
              alignItems: "center",
              columnGap: 24,
              padding: "8px 14px",
              marginBottom: 8,
              borderRadius: 8,
              backgroundColor: "#111827",
            }}
          >
            {/* Left: equipment name + health badge */}
            <div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>
                <Link
                  to={`/equipment/${r.id}`}
                  className="critical-link"
                  style={{
                    color: "#e5e7eb",        // ← pick any hex you like
                  }}
                >
                  {r.name}
                </Link>
              </div>
              <div style={{ marginTop: 4 }}>
                <HealthBadge health={health} />
              </div>
            </div>

            {/* Middle: equip type icon */}
            <div
              style={{
                width: "100%",
                minWidth: 90,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <EquipTypeIcon type={r.equip_type} />
            </div>

            {/* Right: indicators for each fault */}
            <div style={{ display: "flex", gap: 40 }}>
              <Indicator label="Misalignment" status={r.misalignment} />
              <Indicator label="Unbalance" status={r.unbalance} />
              <Indicator label="Looseness" status={r.looseness} />
              <Indicator label="Bearing" status={r.bearing} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
