// src/components/equipment/EquipmentOverview.tsx
"use client";

import { useEquipmentDiagnostics } from "../../lib/queries";
import {
  MisalignmentIcon,
  LoosenessIcon,
  ImbalanceIcon,
  BearingIcon,
} from "../DiagnosticIcons";

type Status = "ok" | "warning" | "alarm";

const STATUS_COLOR: Record<Status, string> = {
  ok: "#10B981",       // green
  warning: "#FACC15",  // yellow
  alarm: "#EF4444",    // red
};

const STATUS_LABEL: Record<Status, string> = {
  ok: "OK",
  warning: "Warning",
  alarm: "Alarm",
};

// Map fault code -> ok / warning / alarm
function codeToStatus(code?: string): Status {
  if (!code) return "ok";
  const c = code.toLowerCase();
  if (c.endsWith("3")) return "alarm";    // u3, m3, l3, brms3
  if (c.endsWith("2")) return "warning";  // u2, m2, l2, brms2
  return "ok";                            // u1, m1, l1, brms1, u0, m0, l0
}

function FaultCard({
  label,
  status,
  code,
  icon,
}: {
  label: string;
  status: Status;
  code?: string;
  icon: JSX.Element;
}) {
  const color = STATUS_COLOR[status];
  return (
    <div
      style={{
        flex: 1,
        minWidth: 180,
        padding: "12px 14px",
        borderRadius: 8,
        backgroundColor: "#020617",
        border: "1px solid #1E293B",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <div style={{ fontWeight: 600 }}>{label}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: color,
          }}
        />
        <span style={{ fontSize: 13, color: "#E5E7EB" }}>
          {STATUS_LABEL[status]}
          {code ? ` (${code})` : ""}
        </span>
      </div>
    </div>
  );
}

export default function EquipmentOverview({ sn }: { sn: string }) {
  const {
    data,
    isLoading,
    error,
  } = useEquipmentDiagnostics(sn);

  if (isLoading) {
    return <div style={{ marginTop: 16 }}>Loading overview…</div>;
  }

  if (error || !data) {
    return (
      <div style={{ marginTop: 16, color: "#EF4444" }}>
        Failed to load overview.
      </div>
    );
  }

  // Detailed diagnostics object from /api/diagnostics
  const d = data;

  // Metrics (all are optional – we guard them)
  const rpm_rpm = d.cal_rpm_rpm ?? d.guess_rpm_rpm ?? null;
  const rpm_hz = d.cal_rpm_hz ?? d.guess_rpm_hz ?? null;
  const rmsVelMax = d.rms_vel_max ?? null;
  const rmsAccMax = d.rms_acc_max ?? null;
  const dir = d.max_direction ?? null;

  // fault is an array of one object in your API
  const faultRow =
    d.fault && Array.isArray(d.fault) && d.fault.length > 0 ? d.fault[0] : null;

  const unbalanceCode = faultRow?.unbalance as string | undefined;
  const loosenessCode = faultRow?.loosenes as string | undefined;
  const misalignmentCode = faultRow?.misalignment as string | undefined;
  const bearingCode = faultRow?.bearing_rms as string | undefined;

  const misStatus = codeToStatus(misalignmentCode);
  const unbStatus = codeToStatus(unbalanceCode);
  const looseStatus = codeToStatus(loosenessCode);
  const bearingStatus = codeToStatus(bearingCode);

  return (
    <div
      style={{
        marginTop: 24,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Key metrics */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div
          style={{
            flex: 2,
            minWidth: 260,
            padding: "12px 14px",
            borderRadius: 8,
            backgroundColor: "#020617",
            border: "1px solid #1E293B",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 8,
            fontSize: 13,
            color: "#E5E7EB",
          }}
        >
          <div>
            <div style={{ color: "#9CA3AF" }}>RPM</div>
            <div>
              {rpm_rpm !== null ? Math.round(rpm_rpm) : "–"}{" "}
              <span style={{ color: "#9CA3AF" }}>rpm</span>
            </div>
          </div>
          <div>
            <div style={{ color: "#9CA3AF" }}>Speed (Hz)</div>
            <div>
              {rpm_hz !== null ? rpm_hz.toFixed(2) : "–"}{" "}
              <span style={{ color: "#9CA3AF" }}>Hz</span>
            </div>
          </div>
          <div>
            <div style={{ color: "#9CA3AF" }}>RMS Velocity</div>
            <div>
              {rmsVelMax !== null ? rmsVelMax.toFixed(2) : "–"}{" "}
              <span style={{ color: "#9CA3AF" }}>mm/s</span>
            </div>
          </div>
          <div>
            <div style={{ color: "#9CA3AF" }}>RMS Acceleration</div>
            <div>
              {rmsAccMax !== null ? rmsAccMax.toFixed(3) : "–"}{" "}
              <span style={{ color: "#9CA3AF" }}>g</span>
            </div>
          </div>
          <div>
            <div style={{ color: "#9CA3AF" }}>Dominant Direction</div>
            <div>{dir ? `D${dir}` : "–"}</div>
          </div>
        </div>
      </div>

      {/* Fault cards row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <FaultCard
          label="Misalignment"
          status={misStatus}
          code={misalignmentCode}
          icon={<MisalignmentIcon size={26} color="#eeb014ff" />}
        />
        <FaultCard
          label="Unbalance"
          status={unbStatus}
          code={unbalanceCode}
          icon={<ImbalanceIcon size={26} color="#eeb014ff" />}
        />
        <FaultCard
          label="Looseness"
          status={looseStatus}
          code={loosenessCode}
          icon={<LoosenessIcon size={26} color="#eeb014ff" />}
        />
        <FaultCard
          label="Bearing"
          status={bearingStatus}
          code={bearingCode}
          icon={<BearingIcon size={26} color="#eeb014ff" />}
        />
      </div>
    </div>
  );
}
