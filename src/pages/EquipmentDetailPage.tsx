"use client";

import { useParams, Link } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import {
  useEquipmentDiagnostics,
  useHistory,
  useFleetDiagnostics,
  FleetDiagRow,
} from "../lib/queries";

import FaultDiagnostics from "../components/diagnostics/FaultDiagnostics";
import TrendPlot from "../components/charts/TrendPlot";
import SpectrumPlot from "../components/charts/SpectrumPlot";
import EnvelopePlot from "../components/charts/EnvelopePlot";
import WaveformPlot from "../components/charts/WaveformPlot";
import AccSpectrumPlot from "../components/charts/AccSpectrumPlot";
import EnvelopeTimePlot from "../components/charts/EnvelopeTimePlot";
import AccTrendPlot from "../components/charts/AccTrendPlot";
import VelocityWaveformPlot from "../components/charts/VelocityWaveformPlot";
import { TYPE_ICONS } from "../icons/EquipmentIcons";
import { RmsGaugesCard } from "../components/Equipment/RmsGaugesCard";
import CompressorStatusOverlay from "../components/Equipment/CompressorStatusOverlay";
import {
  getIsoVelocityThresholdsMm,
  mmPerSecToInPerSec,
} from "../constants/isoThresholds";

const DIR_LABELS: Record<number, string> = {
  1: "Vertical",
  2: "Horizontal",
  3: "Axial",
};

type StatusVal = "ok" | "warning" | "alarm" | "unknown" | string | undefined | null;

function StatusPill({ label, value }: { label: string; value: StatusVal }) {
  const v = (value ?? "").toString().toLowerCase();
  const color =
    v === "alarm" ? "#ef4444" : v === "warning" ? "#facc15" : v === "ok" ? "#22c55e" : "#9ca3af";
  const text =
    v === "alarm" ? "Alarm" : v === "warning" ? "Warning" : v === "ok" ? "OK" : "Unknown";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.05)",
        color: "#e5e7eb",
      }}
    >
      <span style={{ opacity: 0.8 }}>{label}:</span>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: color,
          display: "inline-block",
          border: "1px solid rgba(0,0,0,0.4)",
        }}
      />
      <span style={{ color, fontWeight: 600 }}>{text}</span>
    </div>
  );
}

export default function EquipmentDetailPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const sn = equipmentId ? Number(equipmentId) : undefined;

  const [dir, setDir] = useState<number>(1); // default Vertical
  const [freqRange, setFreqRange] = useState<number | null>(1000); // Hz
  const [fundamentalOverride, setFundamentalOverride] = useState<number | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [downloadingCsv, setDownloadingCsv] = useState<boolean>(false);
  const directionControls = (
    <div style={{ display: "inline-flex", gap: 6 }}>
      {[1, 2, 3].map((d) => {
        const active = dir === d;
        return (
          <button
            key={d}
            onClick={() => setDir(d)}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: active ? "1px solid #22c55e" : "1px solid #4b5563",
              backgroundColor: active ? "#14532d" : "transparent",
              color: "#e5e7eb",
              fontSize: 12,
              cursor: "pointer",
              minWidth: 84,
            }}
          >
            {DIR_LABELS[d]}
          </button>
        );
      })}
    </div>
  );

  const handleDownloadAccWaveform = async () => {
    if (!sn) return;
    try {
      setDownloadingCsv(true);
      const res = await fetch(`/api/waveform?sn=${sn}&dir=${dir}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const sig: number[] = Array.isArray(data?.signal) ? data.signal : [];
      const csvLines = ["index,value"];
      sig.forEach((v, i) => {
        csvLines.push(`${i},${v}`);
      });
      const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `acc_waveform_sn${sn}_d${dir}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV download failed", err);
      alert("Failed to download CSV");
    } finally {
      setDownloadingCsv(false);
    }
  };

  // Per-equipment diagnostics (old or new shape)
  const {
    data: diag,
    isLoading: diagLoading,
    error: diagError,
  } = useEquipmentDiagnostics(sn);

  // History (RMS trends)
  const {
    data: hist,
    isLoading: histLoading,
    error: histError,
  } = useHistory(sn ?? 0);

  // Fleet diagnostics for the traffic-light / header context
  const { data: fleetDiag } = useFleetDiagnostics();
  const fleetItems: FleetDiagRow[] =
    (fleetDiag as any)?.items ?? ((fleetDiag as any) ?? []);
  const fleetRow = sn
    ? fleetItems.find(
        (r) =>
          (r as any).serialNumber === sn ||
          (r as any).id === sn
      )
    : undefined;

  if (!sn) return <div className="container">Invalid equipment ID.</div>;

  // -----------------------------
  // Safely resolve equipType and icon
  // -----------------------------
  const diagMetrics = (diag as any)?.metrics ?? diag;

  const equipType: string | undefined =
    diagMetrics?.equip_type ??
    diagMetrics?.EquipType ??
    (diag as any)?.overall?.equip_type ??
    (fleetRow as any)?.equip_type;

  const assetName: string | undefined =
    diagMetrics?.asset_name ??
    diagMetrics?.AssetName ??
    (diag as any)?.name ??
    (fleetRow as any)?.name;

  // Try to get ISO group from multiple places:
  const metrics = (diag as any)?.metrics;
  const mcRms = metrics?.mc_fault_rms_res;

  const mcGroup =
    Array.isArray(mcRms) && mcRms.length > 0
      ? mcRms[0].group
      : undefined;

  const isoGroup: number =
    (diag as any)?.overall?.group ??
    (diag as any)?.group ??
    mcGroup ??
    (fleetRow as any)?.overall?.group ??
    (fleetRow as any)?.group ??
    2; // default small/medium rigid machines

  const rpmHz =
    (diag as any)?.rpm_1x_hz ??
    (diag as any)?.cal_rpm_hz ??
    (diag as any)?.guess_rpm_hz ??
    (diag as any)?.metrics?.rpm_1x_hz ??
    (diag as any)?.metrics?.cal_rpm_hz ??
    (diag as any)?.metrics?.guess_rpm_hz ??
    (diag as any)?.metrics?.cal_rpm ??
    (diag as any)?.metrics?.guess_rpm ??
    null;

  useEffect(() => {
    // Reset manual override when backend RPM changes
    setFundamentalOverride(null);
  }, [rpmHz, sn]);

  const effectiveFundamental = fundamentalOverride ?? rpmHz ?? null;
  // Thresholds config (global/matrix + per-asset overrides)
  const thresholdsConfig =
    (diag as any)?.thresholds_config ?? (diag as any)?.metrics?.thresholds_config;

  const velThresholdsMm = useMemo(() => {
    const asset = thresholdsConfig?.asset_thresholds?.vel_rms_mm_s;
    if (asset?.ok != null && asset?.warning != null) {
      return {
        ok_mm_s: Number(asset.ok),
        warn_mm_s: Number(asset.warning),
      };
    }
    const matrix = thresholdsConfig?.threshold_matrix?.vel_rms_mm_s;
    if (Array.isArray(matrix)) {
      const match =
        matrix.find((row: any) => row?.group === isoGroup) ||
        matrix.find((row: any) => row?.group == null);
      if (match?.ok != null && match?.warning != null) {
        return {
          ok_mm_s: Number(match.ok),
          warn_mm_s: Number(match.warning),
        };
      }
    }
    const iso = getIsoVelocityThresholdsMm(isoGroup);
    return { ok_mm_s: iso.ok_mm_s, warn_mm_s: iso.warn_mm_s };
  }, [thresholdsConfig, isoGroup]);

  const accBand = useMemo(() => {
    const asset = thresholdsConfig?.asset_thresholds?.acc_rms_g;
    if (asset?.ok != null && asset?.warning != null) {
      return { ok: Number(asset.ok), warn: Number(asset.warning) };
    }
    const accCfg = thresholdsConfig?.thresholds?.acc_rms_g;
    if (accCfg?.ok != null && accCfg?.warning != null) {
      return { ok: Number(accCfg.ok), warn: Number(accCfg.warning) };
    }
    if (effectiveFundamental != null && Number.isFinite(effectiveFundamental)) {
      const rpm = effectiveFundamental * 60.0;
      const betaPoints = [
        { rpm: 200, beta: 0.2 },
        { rpm: 600, beta: 0.6 },
        { rpm: 1200, beta: 0.95 },
        { rpm: 1800, beta: 1.3 },
        { rpm: 3600, beta: 2.5 },
      ];
      const interpBetaLocal = (r: number) => {
        if (!Number.isFinite(r)) return betaPoints[0].beta;
        if (r <= betaPoints[0].rpm) return betaPoints[0].beta;
        for (let i = 0; i < betaPoints.length - 1; i++) {
          const a = betaPoints[i];
          const b = betaPoints[i + 1];
          if (r <= b.rpm) {
            const t = (r - a.rpm) / (b.rpm - a.rpm);
            return a.beta + t * (b.beta - a.beta);
          }
        }
        return betaPoints[betaPoints.length - 1].beta;
      };
      const beta = interpBetaLocal(rpm);
      return { ok: beta * 0.5, warn: beta };
    }
    return { ok: 0.71, warn: 1.42 };
  }, [thresholdsConfig, effectiveFundamental, isoGroup]);

  const TypeIcon = equipType ? TYPE_ICONS[equipType] : undefined;
  const bearingStatus: "ok" | "warning" | "alarm" | "unknown" =
    (diag as any)?.metrics?.bearing ??
    (diag as any)?.bearing ??
    (fleetRow as any)?.bearing ??
    "unknown";
  const unbalanceStatus: "ok" | "warning" | "alarm" | "unknown" =
    (diag as any)?.metrics?.unbalance ??
    (diag as any)?.unbalance ??
    (fleetRow as any)?.unbalance ??
    "unknown";
  const loosenessStatus: "ok" | "warning" | "alarm" | "unknown" =
    (diag as any)?.metrics?.looseness ??
    (diag as any)?.looseness ??
    (fleetRow as any)?.looseness ??
    "unknown";
  const misalignmentStatus: "ok" | "warning" | "alarm" | "unknown" =
    (diag as any)?.metrics?.misalignment ??
    (diag as any)?.misalignment ??
    (fleetRow as any)?.misalignment ??
    "unknown";
  const overallStatus: "ok" | "warning" | "alarm" | "unknown" =
    (diag as any)?.metrics?.equipment_severity ??
    (diag as any)?.equipment_severity ??
    (fleetRow as any)?.equipment_severity ??
    "unknown";

  // Motor (driver) statuses: if this asset is a driven compressor, try to fetch the driver's health
  const drivenBySn =
    (diag as any)?.metrics?.DrivenBySN ??
    (diag as any)?.DrivenBySN ??
    (diag as any)?.metrics?.driven_by_sn;

  const motorRow = drivenBySn
    ? fleetItems.find(
        (r) =>
          (r as any).serialNumber === drivenBySn ||
          (r as any).id === drivenBySn
      )
    : undefined;

  const motorUnbalanceStatus: "ok" | "warning" | "alarm" | "unknown" =
    (motorRow as any)?.unbalance ?? "unknown";
  const motorLoosenessStatus: "ok" | "warning" | "alarm" | "unknown" =
    (motorRow as any)?.looseness ?? "unknown";
  const motorBearingStatus: "ok" | "warning" | "alarm" | "unknown" =
    (motorRow as any)?.bearing ?? "unknown";
  const motorOverallStatus: "ok" | "warning" | "alarm" | "unknown" =
    (motorRow as any)?.equipment_severity ?? overallStatus;
  const motorMisalignmentStatus: "ok" | "warning" | "alarm" | "unknown" =
    (motorRow as any)?.misalignment ?? "unknown";
  const couplingStatus: "ok" | "warning" | "alarm" | "unknown" =
    (motorMisalignmentStatus !== "unknown" || misalignmentStatus !== "unknown")
      ? (["alarm", "warning", "ok"] as const).find(
          (lvl) => motorMisalignmentStatus === lvl || misalignmentStatus === lvl
        ) || "unknown"
      : "unknown";

  // Daily availability from history
  const availability = useMemo(() => {
    if (!hist || !Array.isArray(hist)) return [];
    const byDate = new Map<string, number>();
    for (const row of hist as any[]) {
      const d = row.date || row.time || row.mytimestamp || row.timestamp;
      if (!d) continue;
      const key = String(d).slice(0, 10); // YYYY-MM-DD
      byDate.set(key, (byDate.get(key) ?? 0) + 1);
    }
    return Array.from(byDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [hist]);

  return (
    <div className="container">
      {/* Header & back link */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <Link
          to="/summary"
          style={{
            fontSize: 13,
            color: "#9ca3af",
            alignSelf: "flex-start",
          }}
        >
          ← Back to equipment
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 4 }}>
            <h2
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
            {/* Equipment name (prefer asset_name from diagnostics) */}
            {assetName ?? (diag as any)?.asset_name ?? (diag as any)?.name ?? fleetRow?.name ?? `Equipment ${sn}`}

              {/* Small type pill */}
              {equipType && (
                <span
                  style={{
                    marginLeft: 8,
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    border: "1px solid rgba(184, 165, 148, 0.4)",
                    color: "#9ca3af",
                    backgroundColor: "#020617",
                  }}
                >
                  {equipType}
                </span>
              )}
            </h2>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>SN: {sn}</div>
          </div>
          {/* Icon on the right */}
          {TypeIcon && (
            <span style={{ flexShrink: 0 }}>
              <TypeIcon
                width={120}
                height={120}
                style={{ fill: "#f9f8f6ff", color: "#f9f8f6ff" }}
              />
            </span>
          )}
        </div>

        {/* Compressor component status overlay */}
        {equipType && equipType.toLowerCase().includes("compressor") && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor: "#111827",
              marginTop: 8,
              marginBottom: 16,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <CompressorStatusOverlay
              bearingStatus={bearingStatus}
              unbalanceStatus={unbalanceStatus}
              overallStatus={overallStatus}
              motorStatus={motorOverallStatus}
              motorBearingStatus={motorBearingStatus}
              motorUnbalanceStatus={motorUnbalanceStatus}
              motorLoosenessStatus={motorLoosenessStatus}
              couplingStatus={couplingStatus}
              loosenessStatus={loosenessStatus}
              misalignmentStatus={misalignmentStatus}
            />
          </div>
        )}

        {/* Driver (motor) summary card for compressor assets */}
        {equipType &&
          equipType.toLowerCase().includes("compressor") &&
          motorRow && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                backgroundColor: "#0b1220",
                marginBottom: 16,
                border: "1px solid rgba(148,163,184,0.15)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 600 }}>Driver (Motor) Summary</div>
                <Link
                  to={`/equipment/${(motorRow as any).serialNumber ?? (motorRow as any).id}`}
                  style={{ color: "#60a5fa", fontSize: 12 }}
                >
                  View motor details →
                </Link>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
                <StatusPill label="Overall" value={(motorRow as any)?.equipment_severity} />
                <StatusPill label="Bearing" value={(motorRow as any)?.bearing} />
                <StatusPill label="Unbalance" value={(motorRow as any)?.unbalance} />
                <StatusPill label="Looseness" value={(motorRow as any)?.looseness} />
                <StatusPill label="Misalignment" value={(motorRow as any)?.misalignment} />
                {((motorRow as any)?.rpmHz ?? (motorRow as any)?.rpm_hz) && (
                  <div style={{ color: "#e5e7eb", opacity: 0.8 }}>
                    RPM:{" "}
                    {Math.round(
                      60 *
                        Number(
                          (motorRow as any)?.rpmHz ??
                            (motorRow as any)?.rpm_hz ??
                            0
                        )
                    ).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}
      </div>

      {/* Fault diagnostics card */}
      <FaultDiagnostics
        diag={diag}
        loading={diagLoading}
        error={diagError}
        fleetRow={fleetRow}
      />

      {/* Data availability (per day) */}
      <div
        style={{
          padding: 12,
          borderRadius: 8,
          backgroundColor: "#111827",
          marginBottom: 16,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>
          Sensor Connectivity (Daily)
        </h3>
        {histLoading && <div>Loading availability…</div>}
        {histError && (
          <div style={{ color: "#f97373" }}>Failed to load availability.</div>
        )}
        {!histLoading && !histError && availability.length === 0 && (
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            No historical data available.
          </div>
        )}
        {!histLoading && !histError && availability.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 4,
              alignItems: "flex-end",
              overflowX: "auto",
              overflowY: "visible",
            }}
          >
            {availability.map((d) => (
              <div
                key={d.date}
                title={d.date}
                style={{
                  width: 16,
                  height: Math.min(60, 10 + d.count * 6),
                  borderRadius: 4,
                  backgroundColor: "#49fb03ff",
                  opacity: 0.9,
                  position: "relative",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHoveredDate(d.date)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: "50%",
                    transform: "translate(-50%, -4px)",
                    backgroundColor: "#0f172a",
                    color: "#e5e7eb",
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontSize: 10,
                    whiteSpace: "nowrap",
                    opacity: hoveredDate === d.date ? 1 : 0,
                    visibility: hoveredDate === d.date ? "visible" : "hidden",
                    pointerEvents: "none",
                    transition: "opacity 0.15s ease",
                    zIndex: 10,
                  }}
                  className="availability-tooltip"
                >
                  {d.date}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* RMS forecast gauges: Vel / Acc / Env */}
      <div
        style={{
          padding: 12,
          borderRadius: 8,
          backgroundColor: "#111827",
          marginBottom: 16,
        }}
      >
        <RmsGaugesCard
          sn={sn}
          direction="d1"
          directionLabel="Vertical"
          isoGroup={isoGroup}
          rpmHz={effectiveFundamental}
          thresholdsConfig={
            (diag as any)?.thresholds_config ??
            (diag as any)?.metrics?.thresholds_config
          }
        />
      </div>

      

       {/*Plots grid*/}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1.5fr)",
          gap: 16,
          marginTop: 12,
        }}
      >
        

        {/* Velocity RMS Daily Average */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#111827",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>
          Velocity RMS Daily Average [in/s]
        </h3>
        {histLoading && <div>Loading historical RMS…</div>}
        {histError && (
          <div style={{ color: "#f97373" }}>Failed to load historical RMS.</div>
        )}
        {!histLoading && !histError && hist && hist.length > 0 && (
          <TrendPlot
            data={hist}
            thresholds={{
              ok: mmPerSecToInPerSec(velThresholdsMm.ok_mm_s),
              warn: mmPerSecToInPerSec(velThresholdsMm.warn_mm_s),
            }}
          />
        )}
        {!histLoading && !histError && (!hist || hist.length === 0) && (
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            No historical RMS data available.
          </div>
        )}
        </div>


        {/* Acceleration RMS Daily Average */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#111827",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>
          Acceleration RMS Daily Average [g]
        </h3>
        {histLoading && <div>Loading trend…</div>}
        {histError && (
          <div style={{ color: "#f97373" }}>Failed to load trend.</div>
        )}
        {!histLoading && !histError && hist && hist.length > 0 && (
          <AccTrendPlot data={hist} thresholds={accBand} />
        )}
        {!histLoading && !histError && (!hist || hist.length === 0) && (
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            No trend data available.
          </div>
        )}
        
        </div>
      </div>

      

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginTop: 16,
          marginBottom: 16,
        }}
      >
        {/* Velocity spectrum */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#111827",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <h3 style={{ margin: 0 }}>Velocity Spectrum – {DIR_LABELS[dir]}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {directionControls}
            </div>
          </div>
          <SpectrumPlot
            sn={sn}
            dir={dir}
            rangeHz={freqRange}
            onRangeChange={setFreqRange}
            rpmHz={effectiveFundamental}
            onFundamentalChange={setFundamentalOverride}
            showRangeControls={true}
          />
        </div>

        {/* Acceleration spectrum */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#111827",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>
            Acceleration Spectrum – {DIR_LABELS[dir]}
          </h3>
          <AccSpectrumPlot
            sn={sn}
            dir={dir}
            rangeHz={freqRange}
            onRangeChange={setFreqRange}
            rpmHz={effectiveFundamental}
            onFundamentalChange={setFundamentalOverride}
          />
        </div>

        {/* Envelope spectrum */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#111827",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>
            Envelope Spectrum – {DIR_LABELS[dir]}
          </h3>
          <EnvelopePlot
            sn={sn}
            dir={dir}
            rangeHz={freqRange}
            rpmHz={effectiveFundamental}
          />
        </div>
      </div>

      {/* Acceleration waveform */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#111827",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>
            Acceleration Waveform [g] – {DIR_LABELS[dir]}
          </h3>
          <WaveformPlot sn={sn} dir={dir} />
          <div style={{ marginTop: 8 }}>
            <button
              onClick={handleDownloadAccWaveform}
              disabled={downloadingCsv}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid #4b5563",
                backgroundColor: downloadingCsv ? "#1f2937" : "transparent",
                color: "#e5e7eb",
                fontSize: 12,
                cursor: downloadingCsv ? "not-allowed" : "pointer",
              }}
            >
              {downloadingCsv ? "Preparing CSV…" : "Download CSV"}
            </button>
          </div>
        </div>


     
    </div>
  );
}
