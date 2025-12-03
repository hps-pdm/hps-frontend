"use client";

import { Link } from "react-router-dom";
import { AlertTriangle, BellRing, CircleCheck } from "lucide-react";

type Status = "ok" | "warning" | "alarm";

export type FleetDiagRow = {
  id: string | number;
  serialNumber: string | number;
  name: string;
  equip_type: string | null;
  severity_score?: number;
  equipment_severity?: "ok" | "warning" | "alarm";
  overall?: string | null;
  misalignment: "ok" | "warning" | "alarm";
  unbalance: "ok" | "warning" | "alarm";
  looseness: "ok" | "warning" | "alarm";
  bearing: "ok" | "warning" | "alarm";
  velocity_rms_status_thresholds?: "ok" | "warning" | "alarm";
  acc_rms_status_thresholds?: "ok" | "warning" | "alarm";
};

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

function listActiveFaults(row: FleetDiagRow): string {
  const faults = [
    { key: "misalignment", label: "Misalignment" },
    { key: "unbalance", label: "Unbalance" },
    { key: "looseness", label: "Looseness" },
    { key: "bearing", label: "Bearing" },
  ];

  const active = faults
    .filter((f) => {
      const s = row[f.key as keyof FleetDiagRow] as Status;
      return s === "warning" || s === "alarm";
    })
    .map((f) => f.label);

  return active.join(", ") || "None";
}

function healthBadgeColor(health: number): string {
  if (health <= 60) return "#ff0000"; // red
  if (health <= 75) return "#facc15ff"; // orange
  return "#10B981"; // green (future-safe)
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
        fontSize: 15,
        color: "#E5E7EB",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
      <span>{label}</span>
      <span style={{ opacity: 0.8 }}>· {health}/100</span>
    </span>
  );
}

function healthIcon(health: number) {
  if (health <= 60) {
    return <AlertTriangle size={25} color="#ff0000" />;
  }
  if (health <= 75) {
    return <BellRing size={25} color="#facc15ff" />;
  }
  return <CircleCheck size={25} color="#49fb03ff" />;
}

export default function TopCriticalEquipment({ rows }: { rows: FleetDiagRow[] }) {
  if (!rows || !rows.length) return null;

  const scored = rows.map((r) => ({
    row: r,
    health: computeEquipmentHealth(r),
  }));

  // Only health <= 75
  const critical = scored.filter((x) => x.health <= 75);

  if (critical.length === 0)
    return (
      <div
        style={{
          marginBottom: 16,
          padding: "8px 14px",
          borderRadius: 8,
          backgroundColor: "#111827",
          color: "#9CA3AF",
          fontSize: 13,
        }}
      >
        No critical equipment (health ≤ 75).
      </div>
    );

  critical.sort((a, b) => a.health - b.health);

  return (
    <div
      style={{
        marginBottom: 16,
        padding: "8px 14px",
        borderRadius: 8,
        backgroundColor: "#111827",
      }}
    >

      <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
      </div>

      {critical.map(({ row, health }) => (
        <div
          key={row.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "4px 0",
          }}
        >
          <div
            style={{
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {healthIcon(health)}
            <Link
            to={`/equipment/${row.id}`}
            className="critical-link"

            style={{
              color: "#e5e7eb",        // ← pick any hex you like
            }}
          >
  {row.name}
</Link>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 2,
            }}
          >
            <HealthBadge health={health} />
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>
              {listActiveFaults(row)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
