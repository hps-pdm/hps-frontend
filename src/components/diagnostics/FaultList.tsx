import type { Fault } from "../../lib/types";
import { FaultCard } from "./FaultCard";

type FaultListProps = {
  faults: Fault[];
};

export function FaultList({ faults }: FaultListProps) {
  if (!faults || faults.length === 0) {
    return (
      <div
        style={{
          fontSize: 13,
          color: "#9ca3af",
          padding: 8,
          borderRadius: 8,
          border: "1px dashed rgba(148,163,184,0.4)",
          backgroundColor: "#020617",
        }}
      >
        No active faults detected.
      </div>
    );
  }

  // Sort by severity priority
  const order: Record<string, number> = {
    critical: 4,
    alarm: 3,
    warning: 2,
    info: 1,
    ok: 0,
  };

  const sorted = [...faults].sort(
    (a, b) => (order[b.severity] ?? 0) - (order[a.severity] ?? 0)
  );

  return (
    <div>
      {sorted.map((f, idx) => (
        <FaultCard key={`${f.code}-${idx}-${f.message}`} fault={f} />
      ))}
    </div>
  );
}
