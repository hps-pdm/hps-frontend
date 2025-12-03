"use client";

import { useState } from "react";
import {
  useDiagnosticsSummary,
  useFleetDiagnostics,
} from "../lib/queries";
import { Activity, Filter as FilterIcon } from "lucide-react";
import HealthPie from "../components/HealthPie";
import DiagnosticsMatrix from "../components/DiagnosticsMatrix";
import TopCriticalEquipment, {
  FleetDiagRow,
} from "../components/TopCriticalEquipment";

type FaultType = "misalignment" | "unbalance" | "looseness" | "bearing";
type Status = "ok" | "warning" | "alarm";

const STATUS_SCORE: Record<Status, number> = {
  ok: 1.0,
  warning: 0.5,
  alarm: 0.0,
};

function computeFleetHealth(
  rows: FleetDiagRow[]
): { scorePct: number; label: string } {
  if (!rows || !rows.length) return { scorePct: 0, label: "No data" };

  let total = 0;
  let count = 0;

  for (const r of rows) {
    const vals: Status[] = [
      r.misalignment,
      r.unbalance,
      r.looseness,
      r.bearing,
    ];
    for (const s of vals) {
      total += STATUS_SCORE[s];
      count += 1;
    }
  }

  const avg = count ? total / count : 0;
  const scorePct = Math.round(avg * 100);

  let label = "Poor";
  if (scorePct >= 90) label = "Excellent";
  else if (scorePct >= 75) label = "Good";
  else if (scorePct >= 60) label = "Fair";

  return { scorePct, label };
}

function classifyEquipment(row: FleetDiagRow): Status {
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

function summarizeEquipmentStatus(rows: FleetDiagRow[]) {
  let ok = 0,
    warning = 0,
    alarm = 0;
  for (const r of rows) {
    const s = classifyEquipment(r);
    if (s === "ok") ok++;
    else if (s === "warning") warning++;
    else alarm++;
  }
  return { ok, warning, alarm, total: rows.length };
}

type DiagCounts = { ok: number; warning: number; alarm: number };
type DiagAgg = {
  misalignment: DiagCounts;
  unbalance: DiagCounts;
  looseness: DiagCounts;
  bearing: DiagCounts;
};

function buildDiagAgg(rows: FleetDiagRow[]): DiagAgg {
  const make = (): DiagCounts => ({ ok: 0, warning: 0, alarm: 0 });

  const out: DiagAgg = {
    misalignment: make(),
    unbalance: make(),
    looseness: make(),
    bearing: make(),
  };

  for (const r of rows) {
    out.misalignment[r.misalignment]++;
    out.unbalance[r.unbalance]++;
    out.looseness[r.looseness]++;
    out.bearing[r.bearing]++;
  }

  return out;
}

// Safely normalize whatever /api/diagnostics/fleet returns into FleetDiagRow[]
function getAllRows(fleetDiag: any): FleetDiagRow[] {
  if (!fleetDiag) return [];

  if (Array.isArray(fleetDiag)) {
    return fleetDiag as FleetDiagRow[];
  }
  if (Array.isArray(fleetDiag.rows)) {
    return fleetDiag.rows as FleetDiagRow[];
  }
  if (Array.isArray(fleetDiag.items)) {
    return fleetDiag.items as FleetDiagRow[];
  }

  return [];
}

export default function SummaryPage() {
  // Backend summary stub (/api/diagnostics/summary)
  const {
    data: diag,
    isLoading: isDiagLoading,
    error: diagError,
  } = useDiagnosticsSummary();

  // Fleet-level per-equipment diagnostics (/api/diagnostics/fleet)
  const {
    data: fleetDiag,
    isLoading: isFleetLoading,
    error: fleetError,
  } = useFleetDiagnostics();

  const [filter, setFilter] = useState<{
    faultType: FaultType | null;
    status: Status | null;
  }>({ faultType: null, status: null });

  const loading = isFleetLoading;
  const hasError = !!fleetError;

  if (loading) return <div className="container">Loading…</div>;
  if (hasError) return <div className="container">Failed to load.</div>;

  const allRows: FleetDiagRow[] = getAllRows(fleetDiag);
  const { scorePct, label: fleetLabel } = computeFleetHealth(allRows);
  const statusSummary = summarizeEquipmentStatus(allRows);
  const diagAgg = buildDiagAgg(allRows);

  const filteredRows = allRows.filter((r) => {
    if (!filter.faultType || !filter.status) return true;
    return r[filter.faultType] === filter.status;
  });

  const prettyFault = (f: FaultType | null) =>
    f ? f.charAt(0).toUpperCase() + f.slice(1) : "";

  const prettyStatus = (s: Status | null) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  return (
    <div className="container">
      {/* Title + Fleet Health + Backend status + Logout */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: 0 }}>Fleet Diagnostics Summary</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Health score card */}
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              backgroundColor: "#111827",
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <Activity size={18} color="#10B981" />
            <span style={{ fontSize: 14, color: "#D1D5DB" }}>
              Fleet Health:
            </span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{scorePct}</span>
            <span style={{ fontSize: 14, color: "#9CA3AF" }}>
              / 100 ({fleetLabel})
            </span>
          </div>

          {/* Backend status (from /api/diagnostics/summary) – optional */}
          {diag && !diagError && !isDiagLoading && (
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                backgroundColor: "#0f172a",
                fontSize: 12,
                color: "#9CA3AF",
              }}
            >
              <strong>{diag.status}</strong>{" "}
              <span style={{ marginLeft: 4 }}>{diag.summary}</span>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={() => {
              localStorage.removeItem("auth_token");
              sessionStorage.removeItem("auth_token");
              window.location.href = "/login";
            }}
            style={{
              padding: "8px 12px",
              backgroundColor: "transparent",
              border: "1px solid #475569",
              borderRadius: 6,
              color: "#E5E7EB",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* No data case */}
      {allRows.length === 0 ? (
        <div style={{ marginTop: 32, color: "#9CA3AF", fontSize: 14 }}>
          No diagnostics data available yet.
        </div>
      ) : (
        <>
          {/* Alarm / Warning / OK summary */}
          <div
            style={{
              marginBottom: 8,
              marginTop: 40,
              fontSize: 13,
              color: "#E5E7EB",
            }}
          >
            {statusSummary.total} assets ·{" "}
            <span style={{ color: "#EF4444" }}>
              {statusSummary.alarm} Alarm
            </span>{" "}
            ·{" "}
            <span style={{ color: "#F59E0B" }}>
              {statusSummary.warning} Warning
            </span>{" "}
            ·{" "}
            <span style={{ color: "#10B981" }}>
              {statusSummary.ok} OK
            </span>
          </div>

          <h3 style={{ marginTop: 8, marginBottom: 8 }}>
            Fault Distribution Across Fleet
          </h3>

          {/* clickable pies */}
          <div
            style={{
              display: "flex",
              gap: 40,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <HealthPie
              title="Misalignment"
              data={diagAgg.misalignment}
              onSliceClick={({ status }) =>
                setFilter({ faultType: "misalignment", status })
              }
            />
            <HealthPie
              title="Unbalance"
              data={diagAgg.unbalance}
              onSliceClick={({ status }) =>
                setFilter({ faultType: "unbalance", status })
              }
            />
            <HealthPie
              title="Looseness"
              data={diagAgg.looseness}
              onSliceClick={({ status }) =>
                setFilter({ faultType: "looseness", status })
              }
            />
            <HealthPie
              title="Bearing"
              data={diagAgg.bearing}
              onSliceClick={({ status }) =>
                setFilter({ faultType: "bearing", status })
              }
            />
          </div>

          {/* divider */}
          <div
            style={{
              borderTop: "1px solid rgba(148, 163, 184, 0.15)",
              margin: "45px 0 12px",
            }}
          />

          {/* Top Critical Equipment */}
          <TopCriticalEquipment rows={allRows} />

          {/* active filter pill */}
          {filter.faultType && filter.status && (
            <div
              style={{
                marginBottom: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                backgroundColor: "#1F2933",
                fontSize: 12,
              }}
            >
              <FilterIcon size={14} color="#9CA3AF" />
              <span>
                Filter: <strong>{prettyFault(filter.faultType)}</strong> –{" "}
                <strong>{prettyStatus(filter.status)}</strong>
              </span>
              <button
                onClick={() => setFilter({ faultType: null, status: null })}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#9CA3AF",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                ✕ Clear
              </button>
            </div>
          )}

          {/* Matrix */}
          <h3 style={{ marginTop: 8 }}>Per-Equipment Diagnostics</h3>
          <DiagnosticsMatrix rows={filteredRows} />
        </>
      )}
    </div>
  );
}
