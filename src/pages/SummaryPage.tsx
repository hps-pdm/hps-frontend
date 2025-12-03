"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, Filter as FilterIcon } from "lucide-react";

import { useFleetDiagnostics } from "../lib/queries";
import HealthPie from "../components/HealthPie";
import DiagnosticsMatrix from "../components/DiagnosticsMatrix";
import TopCriticalEquipment, {
  FleetDiagRow,
} from "../components/TopCriticalEquipment";

// -----------------------------
// Local types used for filtering
// -----------------------------

type FaultType = "misalignment" | "unbalance" | "looseness" | "bearing";
type Status = "ok" | "warning" | "alarm";

type PieBlock = {
  labels: string[];
  values: number[];
};

type FleetSummary = {
  total_equipment: number;
  severity: PieBlock;   // no longer used, but kept for API compatibility
  fault_type: PieBlock; // no longer used, but kept for API compatibility
  iso_zone: PieBlock;   // no longer used, but kept for API compatibility
  equip_type: PieBlock;
};

type EquipSlice = {
  label: string;
  value: number;
};

// what kind of filter is currently active
type FilterKind = "fault" | "overall" | "equip" | null;

type FilterState = {
  kind: FilterKind;
  faultType?: FaultType | null;
  status?: Status | null;       // reused for fault-level and overall severity
  equipType?: string | null;
};

const STATUS_SCORE: Record<Status, number> = {
  ok: 1.0,
  warning: 0.5,
  alarm: 0.0,
};

// -----------------------------
// Utility functions
// -----------------------------

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
    if (r.velocity_rms_status_thresholds) vals.push(r.velocity_rms_status_thresholds);
    if (r.acc_rms_status_thresholds) vals.push(r.acc_rms_status_thresholds);
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

// Fault-level classification: used everywhere
function classifyEquipment(row: FleetDiagRow): Status {
  const statuses: Status[] = [
    row.misalignment,
    row.unbalance,
    row.looseness,
    row.bearing,
  ];
  if (row.velocity_rms_status_thresholds) {
    statuses.push(row.velocity_rms_status_thresholds);
  }
  if (row.acc_rms_status_thresholds) {
    statuses.push(row.acc_rms_status_thresholds);
  }
  if (statuses.includes("alarm")) return "alarm";
  if (statuses.includes("warning")) return "warning";
  return "ok";
}

// Aggregate how many assets are OK / Warning / Alarm (overall)
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

// Build overall severity counts for Severity pie (OK / Warning / Alarm)
function buildUnifiedSeverityCounts(rows: FleetDiagRow[]) {
  let ok = 0,
    warning = 0,
    alarm = 0;
  for (const r of rows) {
    const s = classifyEquipment(r);
    if (s === "alarm") alarm++;
    else if (s === "warning") warning++;
    else ok++;
  }
  return { ok, warning, alarm };
}

type DiagCounts = { ok: number; warning: number; alarm: number };
type DiagAgg = {
  misalignment: DiagCounts;
  unbalance: DiagCounts;
  looseness: DiagCounts;
  bearing: DiagCounts;
};

function makeEmptyCounts(): DiagCounts {
  return { ok: 0, warning: 0, alarm: 0 };
}

function buildDiagAggFromRows(rows: FleetDiagRow[]): DiagAgg {
  const out: DiagAgg = {
    misalignment: makeEmptyCounts(),
    unbalance: makeEmptyCounts(),
    looseness: makeEmptyCounts(),
    bearing: makeEmptyCounts(),
  };

  for (const r of rows) {
    out.misalignment[r.misalignment]++;
    out.unbalance[r.unbalance]++;
    out.looseness[r.looseness]++;
    out.bearing[r.bearing]++;
  }

  return out;
}

// normalize whatever /api/diagnostics/fleet returns into FleetDiagRow[]
// normalize whatever /api/diagnostics/fleet returns into FleetDiagRow[]
function getAllRows(fleetDiag: any): FleetDiagRow[] {
  if (!fleetDiag) return [];

  // Preferred shape: { items: [...] }
  if (Array.isArray(fleetDiag.items)) {
    return (fleetDiag.items as any[]).map((item) => {
      const sn = item.serialNumber ?? item.sn ?? item.id;

      // normalize severity_score (string | number → number | undefined)
      let severity_score: number | undefined;
      if (typeof item.severity_score === "number") {
        severity_score = item.severity_score;
      } else if (typeof item.severity_score === "string") {
        const v = parseFloat(item.severity_score);
        severity_score = Number.isFinite(v) ? v : undefined;
      }

      const statusToLower = (s: any, fallback: Status): Status => {
        if (typeof s !== "string") return fallback;
        const v = s.toLowerCase();
        if (v === "ok" || v === "warning" || v === "alarm") return v;
        return fallback;
      };

      const misalignment = statusToLower(item.misalignment, "ok");
      const unbalance = statusToLower(item.unbalance, "ok");
      const looseness = statusToLower(item.looseness, "ok");
      const bearing = statusToLower(item.bearing, "ok");

      let equipment_severity: Status | undefined;
      if (typeof item.equipment_severity === "string") {
        equipment_severity = statusToLower(item.equipment_severity, "ok");
      }

      const velocity_rms_status_thresholds = statusToLower(
        (item as any).velocity_rms_status_thresholds,
        undefined as any
      );
      const acc_rms_status_thresholds = statusToLower(
        (item as any).acc_rms_status_thresholds,
        undefined as any
      );

      return {
        serialNumber: sn,
        id: sn,
        name: item.name ?? `Equipment ${sn}`,
        equip_type: item.equip_type ?? null,
        equipment_severity,
        severity_score,
        overall: item.overall ?? item.status ?? null, // keep legacy "status" in case you show ISO zone
        misalignment,
        unbalance,
        looseness,
        bearing,
        velocity_rms_status_thresholds:
          velocity_rms_status_thresholds === "ok" ||
          velocity_rms_status_thresholds === "warning" ||
          velocity_rms_status_thresholds === "alarm"
            ? velocity_rms_status_thresholds
            : undefined,
        acc_rms_status_thresholds:
          acc_rms_status_thresholds === "ok" ||
          acc_rms_status_thresholds === "warning" ||
          acc_rms_status_thresholds === "alarm"
            ? acc_rms_status_thresholds
            : undefined,
      };
    });
  }

  // Fallbacks for older shapes
  if (Array.isArray(fleetDiag)) {
    return fleetDiag as FleetDiagRow[];
  }
  if (Array.isArray(fleetDiag.rows)) {
    return fleetDiag.rows as FleetDiagRow[];
  }

  return [];
}


// build equipment slices [{label, value}, ...] from summary pie block
function buildEquipSlicesFromSummary(block?: PieBlock): EquipSlice[] {
  if (!block) return [];
  const { labels, values } = block;
  return labels.map((label, idx) => ({
    label,
    value: values[idx] ?? 0,
  }));
}

// -----------------------------
// Data fetching
// -----------------------------

async function fetchFleetSummary(): Promise<FleetSummary> {
  const res = await fetch("/api/diagnostics/summary");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching /api/diagnostics/summary`);
  }
  return res.json();
}

// -----------------------------
// Component
// -----------------------------

export default function SummaryPage() {
  // diagnostics for rows / TopCriticalEquipment / diag pies
  const {
    data: fleetDiag,
    isLoading: isFleetLoading,
    error: fleetError,
  } = useFleetDiagnostics();

  // summary data (we now only use equip_type from here)
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useQuery<FleetSummary>({
    queryKey: ["fleet-summary"],
    queryFn: fetchFleetSummary,
    staleTime: 30_000,
  });

  const [filter, setFilter] = useState<FilterState>({
    kind: null,
    faultType: null,
    status: null,
    equipType: null,
  });

  const allRows: FleetDiagRow[] = getAllRows(fleetDiag);
  const { scorePct, label: fleetLabel } = computeFleetHealth(allRows);
  const statusSummary = summarizeEquipmentStatus(allRows);
  const diagAgg = buildDiagAggFromRows(allRows);
  const unifiedSeverity = buildUnifiedSeverityCounts(allRows);

  // rows filtered by active filter (fault / overall / equip)
  const filteredRows = allRows.filter((r) => {
    if (!filter.kind) return true;

    if (filter.kind === "fault") {
      if (!filter.faultType || !filter.status) return true;
      return r[filter.faultType] === filter.status;
    }

    if (filter.kind === "overall") {
      if (!filter.status) return true;
      return classifyEquipment(r) === filter.status;
    }

    if (filter.kind === "equip") {
      if (!filter.equipType) return true;
      const et = (r.equip_type ?? "Unknown").toString();
      return et === filter.equipType;
    }

    return true;
  });

  // helper labels for filter pill
  const prettyFault = (f: FaultType | null | undefined) =>
    f ? f.charAt(0).toUpperCase() + f.slice(1) : "";

  const prettyStatus = (s: Status | null | undefined) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  const headerText = useMemo(() => {
    const n =
      summaryData?.total_equipment && summaryData.total_equipment > 0
        ? summaryData.total_equipment
        : allRows.length;
    if (!n) return "Fleet Diagnostics Summary";
    return `Fleet Diagnostics Summary – ${n} assets`;
  }, [summaryData, allRows.length]);

  if (isFleetLoading && !fleetDiag) {
    return <div className="container">Loading…</div>;
  }
  if (fleetError) {
    return <div className="container">Failed to load.</div>;
  }

  // active filter text for pill
  let activeFilterLabel: string | null = null;
  if (filter.kind === "fault" && filter.faultType && filter.status) {
    activeFilterLabel = `${prettyFault(filter.faultType)} – ${prettyStatus(
      filter.status
    )}`;
  } else if (filter.kind === "overall" && filter.status) {
    activeFilterLabel = `Overall Severity – ${prettyStatus(filter.status)}`;
  } else if (filter.kind === "equip" && filter.equipType) {
    activeFilterLabel = `Equipment – ${filter.equipType}`;
  }

  const clearFilter = () =>
    setFilter({
      kind: null,
      faultType: null,
      status: null,
      equipType: null,
    });

  // build data structures for equip pie in HealthPie format
  const equipSlices = buildEquipSlicesFromSummary(summaryData?.equip_type);

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="container">
      {/* Title + Fleet Health */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>{headerText}</h2>
          <p style={{ marginTop: 4, fontSize: 12, color: "#9CA3AF" }}>
            Overview of fleet health, fault types, and equipment mix.
          </p>
        </div>

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
            <Activity size={18} color="#49fb03ff" />
            <span style={{ fontSize: 14, color: "#D1D5DB" }}>
              Fleet Health:
            </span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{scorePct}</span>
            <span style={{ fontSize: 14, color: "#9CA3AF" }}>
              / 100 ({fleetLabel})
            </span>
          </div>
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
              marginTop: 16,
              fontSize: 13,
              color: "#E5E7EB",
            }}
          >
            {statusSummary.total} assets ·{" "}
            <span style={{ color: "#ff0000" }}>
              {statusSummary.alarm} Alarm
            </span>{" "}
            ·{" "}
            <span style={{ color: "#facc15ff" }}>
              {statusSummary.warning} Warning
            </span>{" "}
            ·{" "}
            <span style={{ color: "#49fb03ff" }}>
              {statusSummary.ok} OK
            </span>
          </div>

          <h3 style={{ marginTop: 8, marginBottom: 8 }}>
            Fault Distribution Across Fleet
          </h3>

          {/* Pies row: 4 fault pies + Overall Severity + Equip Type, all using HealthPie */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 24,
              alignItems: "start",
              marginBottom: 16,
            }}
          >
            {/* Fault pies */}
            <HealthPie
              title="Misalignment"
              mode="fault"
              data={diagAgg.misalignment}
              onSliceClick={({ status }: { status: Status }) =>
                setFilter({
                  kind: "fault",
                  faultType: "misalignment",
                  status,
                  equipType: null,
                })
              }
            />
            <HealthPie
              title="Unbalance"
              mode="fault"
              data={diagAgg.unbalance}
              onSliceClick={({ status }: { status: Status }) =>
                setFilter({
                  kind: "fault",
                  faultType: "unbalance",
                  status,
                  equipType: null,
                })
              }
            />
            <HealthPie
              title="Looseness"
              mode="fault"
              data={diagAgg.looseness}
              onSliceClick={({ status }: { status: Status }) =>
                setFilter({
                  kind: "fault",
                  faultType: "looseness",
                  status,
                  equipType: null,
                })
              }
            />
            <HealthPie
              title="Bearing"
              mode="fault"
              data={diagAgg.bearing}
              onSliceClick={({ status }: { status: Status }) =>
                setFilter({
                  kind: "fault",
                  faultType: "bearing",
                  status,
                  equipType: null,
                })
              }
            />

            {/* Unified Overall Severity pie (OK / Warning / Alarm) */}
            <HealthPie
              title="Overall Severity"
              mode="fault"
              data={unifiedSeverity}
              onSliceClick={({ status }: { status: Status }) =>
                setFilter({
                  kind: "overall",
                  status,
                  faultType: null,
                  equipType: null,
                })
              }
            />

            {/* Equipment Type Mix pie using HealthPie in equip mode */}
            <HealthPie
              title="Equipment Type Mix"
              mode="equip"
              equipData={equipSlices}
              onSliceClick={({ equipType }: { equipType: string }) =>
                setFilter({
                  kind: "equip",
                  faultType: null,
                  status: null,
                  equipType,
                })
              }
            />
          </div>

          {(isSummaryLoading || summaryError) && (
            <div className="text-xs text-gray-500 mb-2">
              {isSummaryLoading
                ? "Loading summary pies…"
                : (summaryError as Error)?.message ||
                  "Error loading summary pies"}
            </div>
          )}

          {/* divider */}
          <div
            style={{
              borderTop: "1px solid rgba(148, 163, 184, 0.15)",
              margin: "32px 0 12px",
            }}
          />

          {/* Top Critical Equipment */}
          <h3 style={{ marginTop: 8 }}>Top Critical Equipment (Health ≤ 75)</h3>
          <TopCriticalEquipment rows={allRows} />

          {/* active filter pill */}
          {activeFilterLabel && (
            <div
              style={{
                marginTop: 12,
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
                Filter: <strong>{activeFilterLabel}</strong>
              </span>
              <button
                onClick={clearFilter}
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
