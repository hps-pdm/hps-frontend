import React from "react";
import type { Fault } from "../../lib/types";
import {
  CODE_LABELS,
  SEVERITY_COLORS,
  FAMILY_COLORS,
  getIconForFamily,
} from "../../icons/EquipmentIcons";

function capitalize(s?: string | null) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type FaultCardProps = {
  fault: Fault;
};

export function FaultCard({ fault }: FaultCardProps) {
  const sev = SEVERITY_COLORS[fault.severity] ?? SEVERITY_COLORS.info;
  const familyColor = FAMILY_COLORS[fault.family] ?? "#9ca3af";
  const label = CODE_LABELS[fault.code] ?? fault.code.replace(/_/g, " ");
  const Icon = getIconForFamily(fault.family, fault.severity);

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${sev.border}`,
        backgroundColor: sev.bg,
        padding: 12,
        marginBottom: 8,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {/* Top row: icon + title + severity pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Icon bubble */}
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#020617",
            }}
          >
            <Icon width={14} height={14} color={familyColor} />
          </span>

          {/* Code label + family + direction */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.08,
                color: "#e5e7eb",
              }}
            >
              {label}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.4)",
                  color: familyColor,
                }}
              >
                {capitalize(fault.family)}
              </span>
              {(fault.direction || fault.axis) && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: 999,
                    backgroundColor: "#020617",
                    color: "#9ca3af",
                  }}
                >
                  {fault.axis ?? fault.direction}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Severity pill */}
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 999,
            backgroundColor: "rgba(15,23,42,0.6)",
            color: sev.text,
            border: `1px solid ${sev.border}`,
            textTransform: "uppercase",
          }}
        >
          {fault.severity}
        </span>
      </div>

      {/* Message */}
      <div style={{ fontSize: 13, color: "#e5e7eb" }}>{fault.message}</div>

      {/* Metrics chips */}
      {fault.metrics && Object.keys(fault.metrics).length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 2,
          }}
        >
          {Object.entries(fault.metrics).map(([k, v]) => (
            <span
              key={k}
              style={{
                fontSize: 11,
                color: "#9ca3af",
                backgroundColor: "#020617",
                padding: "2px 6px",
                borderRadius: 999,
              }}
            >
              {k}: {String(v)}
            </span>
          ))}
        </div>
      )}

      {/* Source tag */}
      <div style={{ marginTop: 2, fontSize: 10, color: "#6b7280" }}>
        Source: {fault.source}
      </div>
    </div>
  );
}
