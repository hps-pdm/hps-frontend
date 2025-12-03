"use client";

import type { DiagnosticsResponse } from "../../lib/types";
import type { FleetDiagRow } from "../../lib/queries";
import EquipmentFaultRow from "./EquipmentFaultRow";
import { Fault } from "../../lib/types";
import React, { useMemo, useEffect } from "react";
import { RECOMMENDATIONS } from "../../constants/recommendations";


const LABEL_COLOR = "#9ca3af";

type Props = {
  diag: DiagnosticsResponse | undefined;
  loading: boolean;
  error: unknown;
  fleetRow?: FleetDiagRow | undefined;
};

export default function FaultDiagnostics({
  diag,
  loading,
  error,
  fleetRow,
}: Props) {
  // /api/diagnostics returns { serialNumber, metrics: {...} }
  const metrics = diag ? (diag as any).metrics ?? diag : undefined;
  const rpmHz =
    (diag as any)?.rpm_1x_hz ??
    (diag as any)?.cal_rpm_hz ??
    (diag as any)?.guess_rpm_hz ??
    metrics?.rpm_1x_hz ??
    metrics?.cal_rpm_hz ??
    metrics?.guess_rpm_hz ??
    null;
  useEffect(() => {
    console.log("FaultDiagnostics rpmHz", rpmHz, "diag", diag);
  }, [rpmHz, diag]);

  // Overall status: prefer fleet row, then metrics.fault_status, else Unknown
  const overallStatus =
    fleetRow?.status ??
    (metrics?.fault_status as string | undefined) ??
    "Unknown";

  const faultSeverity =
    typeof metrics?.fault_severity === "number"
      ? metrics.fault_severity
      : undefined;

  // Derive bearing status using the same beta(rpm) curve as backend/gauge
  const derivedBearing: "ok" | "warning" | "alarm" | null = useMemo(() => {
    // If backend already evaluated per-asset acc thresholds, honor that first
    const threshStatus = (metrics as any)?.acc_rms_status_thresholds;
    if (
      threshStatus === "ok" ||
      threshStatus === "warning" ||
      threshStatus === "alarm"
    ) {
      return threshStatus;
    }

    try {
      // Pull max acc from diagnostics (same source as gauge history)
      let maxAcc: number | null = null;
      const arr = metrics?.rms_accs;
      if (Array.isArray(arr) && arr.length) {
        maxAcc = Math.max(...arr.map((x: any) => Number(x) || 0));
      } else if (metrics?.rms_acc_max != null) {
        maxAcc = Number(metrics.rms_acc_max);
      }
      if (maxAcc == null || !Number.isFinite(maxAcc)) return null;

      // Interpolate beta from rpm (Hz -> RPM). Fallback to mid-speed 1800 RPM.
      const rpm = Number.isFinite(Number(rpmHz))
        ? Number(rpmHz) * 60.0
        : 1800;
      const pts = [
        { rpm: 200, beta: 0.2 },
        { rpm: 600, beta: 0.6 },
        { rpm: 1200, beta: 0.95 },
        { rpm: 1800, beta: 1.3 },
        { rpm: 3600, beta: 2.5 },
      ];
      const interpBeta = (r: number) => {
        if (!Number.isFinite(r)) return pts[0].beta;
        if (r <= pts[0].rpm) return pts[0].beta;
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i];
          const b = pts[i + 1];
          if (r <= b.rpm) {
            const t = (r - a.rpm) / (b.rpm - a.rpm);
            return a.beta + t * (b.beta - a.beta);
          }
        }
        return pts[pts.length - 1].beta;
      };
      const beta = interpBeta(rpm);
      if (maxAcc < beta * 0.5) return "ok";
      if (maxAcc < beta) return "warning";
      return "alarm";
    } catch {
      return null;
    }
  }, [metrics, rpmHz]);

  useEffect(() => {
    // console.debug can be re-enabled for deeper inspection
    // console.debug("Bearing debug:", {
    //   rpmHz,
    //   derivedBearing,
    //   rms_accs: metrics?.rms_accs,
    //   rms_acc_max: metrics?.rms_acc_max,
    // });
  }, [rpmHz, derivedBearing, metrics]);

  return (
    <div
      style={{
        borderRadius: 8,
        border: "1px solid rgba(148,163,184,0.25)",
        padding: 12,
        marginBottom: 12,
        backgroundColor: "#020617",
      }}
    >
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
          </div>

      {loading && (
        <div style={{ fontSize: 12, color: LABEL_COLOR }}>
          Loading diagnostics…
        </div>
      )}

      {error && !loading && (
        <div style={{ fontSize: 12, color: "#ff0000" }}>
          Failed to load diagnostics.
        </div>
      )}

      {metrics && !error && !loading && (
        <>
          {/* Overall status */}
          <div style={{ marginBottom: 6, fontSize: 20 }}>
            <span style={{ fontWeight: 600 }}>Overall status: </span>
            <span>{overallStatus}</span>
            {faultSeverity != null && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  color: LABEL_COLOR,
                }}
              >
              </span>
            )}
          </div>

          {/* Traffic-light mechanism row from fleet diagnostics */}
          {fleetRow && (
            <EquipmentFaultRow
              row={fleetRow}
              override={
                derivedBearing
                  ? { bearing: derivedBearing }
                  : { bearing: "ok" } // fallback
              }
            />
          )}

          {/* Recommendations */}
          {(() => {
            const mis = (fleetRow as any)?.misalignment;
            const unb = (fleetRow as any)?.unbalance;
            const loos = (fleetRow as any)?.looseness;
            const bear = derivedBearing ?? (fleetRow as any)?.bearing;
            const equipType =
              (metrics as any)?.equip_type ||
              (diag as any)?.equip_type ||
              (fleetRow as any)?.equip_type ||
              "default";
            const table = RECOMMENDATIONS[equipType] || RECOMMENDATIONS.default || {};

            const recs: string[] = [];
            const push = (key: keyof typeof table, active: string | null | undefined) => {
              if (!active) return;
              const sev = (active || "").toString().toLowerCase();
              if (sev !== "warning" && sev !== "alarm") return;
              const bucket = table[key];
              if (!bucket) return;
              const arr =
                sev === "alarm"
                  ? bucket.alarm || bucket.warning || []
                  : bucket.warning || [];
              if (Array.isArray(arr)) recs.push(...arr);
            };
            push("bearing", bear);
            push("unbalance", unb);
            push("misalignment", mis);
            push("looseness", loos);
            if (!recs.length) {
              push("overall", overallStatus);
            }
            if (!recs.length) return null;

            const seen = new Set<string>();
            const unique = recs.filter((r) => {
              if (seen.has(r)) return false;
              seen.add(r);
              return true;
            });

            return (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  Recommended actions
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, color: "#e5e7eb", fontSize: 12 }}>
                  {unique.slice(0, 6).map((r, idx) => (
                    <li key={idx} style={{ marginBottom: 2 }}>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {/* ISO band info (RMS / peak) */}
          {Array.isArray(metrics.mc_fault_rms_res) &&
            metrics.mc_fault_rms_res.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 12, color: LABEL_COLOR }}>
                
              </div>
            )}
          {Array.isArray(metrics.mc_fault_peak_res) &&
            metrics.mc_fault_peak_res.length > 0 && (
              <div style={{ fontSize: 12, color: LABEL_COLOR }}>
            
              </div>
            )}
        </>
      )}
    </div>
  );
}
