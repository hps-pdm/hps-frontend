// src/components/diagnostics/EquipmentFaultRow.tsx

"use client";

import type { FleetDiagRow } from "../../lib/queries";

type Status = "ok" | "warning" | "alarm";

const COLORS: Record<"ok" | "warning" | "alarm", string> = {
  ok: "#49fb03ff",
  warning: "#facc15",
  alarm: "#ff0000",
};

type Override = Partial<Record<"misalignment" | "unbalance" | "looseness" | "bearing", Status>>;

export default function EquipmentFaultRow({
  row,
  override = {},
}: {
  row: FleetDiagRow;
  override?: Override;
}) {
  const chip = (label: string, status: Status) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        marginRight: 16,
        marginBottom: 8,
        fontSize: 24,
        color: "#e5e7eb",
      }}
    >
      <span style={{ color: "#af9c9cff" }}>{label}:</span>
      <span
        style={{
          width: 17,
          height: 17,
          borderRadius: "50%",
          backgroundColor: COLORS[status],
        }}
      />
    </span>
  );

  return (
    <div
      style={{
        marginTop: 10,
        marginBottom: 20,
        display: "flex",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        rowGap: 8,
      }}
    >
      {chip("Misalignment", override.misalignment ?? row.misalignment)}
      {chip("Unbalance", override.unbalance ?? row.unbalance)}
      {chip("Looseness", override.looseness ?? row.looseness)}
      {chip("Bearing", override.bearing ?? row.bearing)}
    </div>
  );
}
