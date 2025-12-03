// src/components/equipment/EquipmentHeader.tsx
"use client";

import { useMemo } from "react";
import { useEquipment, useFleetDiagnostics } from "../../lib/queries";
import type { FleetDiagRow } from "../TopCriticalEquipment";

type Status = "ok" | "warning" | "alarm";

const STATUS_SCORE: Record<Status, number> = {
  ok: 1.0,
  warning: 0.5,
  alarm: 0.0,
};

function computeEquipmentHealth(row: FleetDiagRow | undefined): number | null {
  if (!row) return null;
  const vals: Status[] = [
    row.misalignment,
    row.unbalance,
    row.looseness,
    row.bearing,
  ];
  const total = vals.reduce((acc, s) => acc + STATUS_SCORE[s], 0);
  return Math.round((total / vals.length) * 100);
}

function classifyEquipment(row: FleetDiagRow | undefined): Status | null {
  if (!row) return null;
  const statuses: Status[] = [
    row.misalignment,
    row.unbalance,
    row.looseness,
    row.bearing,
  ];
  if (statuses.includes("alarm")) return "alarm";
  if (statuses.includes("warning")) return "warning";
  return "ok";
}

function statusLabel(status: Status | null): string {
  if (!status) return "Unknown";
  if (status === "alarm") return "Alarm";
  if (status === "warning") return "Warning";
  return "OK";
}

function statusColor(status: Status | null): string {
  if (!status) return "#9CA3AF";
  if (status === "alarm") return "#EF4444";
  if (status === "warning") return "#F97316";
  return "#10B981";
}

export default function EquipmentHeader({ sn }: { sn: string }) {
  const idNum = useMemo(() => {
    const n = Number(sn);
    return Number.isNaN(n) ? null : n;
  }, [sn]);

  const {
    data: equipmentData,
    isLoading: eqLoading,
    error: eqError,
  } = useEquipment();

  const {
    data: fleetDiag,
    isLoading: diagLoading,
    error: diagError,
  } = useFleetDiagnostics();

  if (eqLoading || diagLoading) {
    return (
      <div
        style={{
          marginTop: 16,
          padding: "16px 20px",
          borderRadius: 12,
          backgroundColor: "#111827",
          color: "#9CA3AF",
        }}
      >
        Loading equipment details…
      </div>
    );
  }

  if (eqError || diagError || !equipmentData || !fleetDiag || idNum === null) {
    return (
      <div
        style={{
          marginTop: 16,
          padding: "16px 20px",
          borderRadius: 12,
          backgroundColor: "#111827",
          color: "#EF4444",
        }}
      >
        Failed to load equipment details.
      </div>
    );
  }

  const items = Array.isArray(equipmentData)
    ? equipmentData
    : equipmentData.items ?? [];

  const equipment = items.find((e: any) => e.id === idNum);

  const allRows: FleetDiagRow[] = (fleetDiag || []) as FleetDiagRow[];
  const diagRow = allRows.find((r) => r.id === idNum);

  const health = computeEquipmentHealth(diagRow);
  const overallStatus = classifyEquipment(diagRow);
  const statusClr = statusColor(overallStatus);

  const name =
    equipment?.name ||
    `Equipment ${sn}`;

  return (
    <div
      style={{
        marginTop: 16,
        padding: "16px 20px",
        borderRadius: 12,
        backgroundColor: "#111827",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
      }}
    >
      {/* Left: Name + meta */}
      <div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>{name}</div>
        <div style={{ marginTop: 4, fontSize: 13, color: "#9CA3AF" }}>
          SN: <strong>{sn}</strong>
          {equipment?.status && (
            <>
              {" · "}
              Status: {equipment.status}
            </>
          )}
        </div>
      </div>

      {/* Right: Health + overall status */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        <div
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: `1px solid ${statusClr}`,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "#E5E7EB",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: statusClr,
            }}
          />
          <span>Overall: {statusLabel(overallStatus)}</span>
        </div>

        <div
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            backgroundColor: "#020617",
            border: "1px solid #334155",
            display: "inline-flex",
            alignItems: "baseline",
            gap: 6,
            fontSize: 13,
            color: "#D1D5DB",
          }}
        >
          <span>Health:</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>
            {health !== null ? health : "–"}
          </span>
          <span style={{ fontSize: 13, color: "#9CA3AF" }}>/ 100</span>
        </div>
      </div>
    </div>
  );
}
