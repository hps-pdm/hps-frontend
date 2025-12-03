"use client";

import { PieChart, Pie, Cell, Tooltip } from "recharts";
import {
  MisalignmentIcon,
  LoosenessIcon,
  ImbalanceIcon,
  BearingIcon,
} from "./DiagnosticIcons";
import SeverityIcon from "../assets/icons/severity.svg?react";

export type Status = "ok" | "warning" | "alarm";
export type SeverityBucket =
  | "Healthy"
  | "Warning"
  | "Alarm"
  | "Critical"
  | "Unknown";

type Mode = "fault" | "severity" | "equip";

type FaultCounts = {
  ok: number;
  warning: number;
  alarm: number;
};

type SeverityData = Partial<Record<SeverityBucket, number>>;

type EquipSlice = {
  label: string;
  value: number;
};

type HealthPieProps = {
  title: string; // e.g. "Misalignment", "Severity Distribution", "Equipment Type Mix"
  mode?: Mode;

  // fault mode (default)
  data?: FaultCounts;

  // severity mode
  severityData?: SeverityData;

  // equipment mix mode
  equipData?: EquipSlice[];

  // on slice click:
  //  - mode="fault"    => { faultType: string; status: Status }
  //  - mode="severity" => { severityBucket: SeverityBucket }
  //  - mode="equip"    => { equipType: string }
  onSliceClick?: (args: any) => void;
};

type Slice = {
  key: string;
  label: string;
  value: number;
  color: string;
  opacity?: number;
};

const COLORS_GRADIENT: Record<Status, string> = {
  ok: "url(#okGradient)",
  warning: "url(#warnGradient)",
  alarm: "url(#alarmGradient)",
};

const SEVERITY_COLORS: Record<SeverityBucket, string> = {
  Healthy: "#49fb03ff",
  Warning: "#facc15",
  Alarm: "#fb923c",
  Critical: "#ff0000",
  Unknown: "#6b7280",
};

const EQUIP_COLORS = [
  "#413737ff",
  "#757577ff",
  "#151dbdff",
  "#f97316",
  "#e11d48",
  "#0ea5e9",
  "#10b981",
];

// if a slice is < 15% of total, fade it a bit
const SMALL_SLICE_THRESHOLD = 0.15;

// -----------------------------
// Slice builders
// -----------------------------

function buildFaultSlices(data?: FaultCounts): Slice[] {
  const d: FaultCounts = data ?? { ok: 0, warning: 0, alarm: 0 };

  return [
    {
      key: "ok",
      label: "OK",
      value: d.ok,
      color: COLORS_GRADIENT.ok,
    },
    {
      key: "warning",
      label: "Warning",
      value: d.warning,
      color: COLORS_GRADIENT.warning,
    },
    {
      key: "alarm",
      label: "Alarm",
      value: d.alarm,
      color: COLORS_GRADIENT.alarm,
    },
  ];
}

function buildSeveritySlices(sd?: SeverityData): Slice[] {
  if (!sd) return [];
  const order: SeverityBucket[] = [
    "Healthy",
    "Warning",
    "Alarm",
    "Critical",
    "Unknown",
  ];
  const slices: Slice[] = [];

  for (const bucket of order) {
    const raw = sd[bucket] ?? 0;
    if (!raw) continue;
    slices.push({
      key: bucket,
      label: bucket,
      value: raw,
      color: SEVERITY_COLORS[bucket],
    });
  }
  return slices;
}

function buildEquipSlices(ed?: EquipSlice[]): Slice[] {
  if (!ed || !ed.length) return [];
  return ed.map((e, idx) => ({
    key: e.label,
    label: e.label,
    value: e.value,
    color: EQUIP_COLORS[idx % EQUIP_COLORS.length],
  }));
}

// -----------------------------
// Map title -> icon (fault mode only)
// -----------------------------

function faultIcon(title: string, size: number) {
  const key = title.toLowerCase();
  const commonProps = { size, color: "#cbd5e1" };

  if (key.includes("overall severity")) {
    return (
      <SeverityIcon
        width={size}
        height={size}
        style={{ fill: "#cbd5e1", color: "#cbd5e1", opacity: 0.9 }}
      />
    );
  }
  if (key.includes("misalign")) return <MisalignmentIcon {...commonProps} />;
  if (key.includes("unbalance") || key.includes("imbalance"))
    return <ImbalanceIcon {...commonProps} />;
  if (key.includes("loosen")) return <LoosenessIcon {...commonProps} />;
  if (key.includes("bear")) return <BearingIcon {...commonProps} />;
  return <BearingIcon {...commonProps} />;
}

// -----------------------------
// Component
// -----------------------------

export default function HealthPie(props: HealthPieProps) {
  const {
    title,
    mode = "fault",
    data,
    severityData,
    equipData,
    onSliceClick,
  } = props;

  let slices: Slice[] = [];
  if (mode === "fault") {
    slices = buildFaultSlices(data);
  } else if (mode === "severity") {
    slices = buildSeveritySlices(severityData);
  } else {
    slices = buildEquipSlices(equipData);
  }

  const rawTotal = slices.reduce((acc, s) => acc + (s.value || 0), 0);
  const total = rawTotal || 1;

  const chartData = slices.map((s) => {
    const safeValue = s.value === 0 ? 0.00001 : s.value;
    const fraction = safeValue / total;
    const opacity = fraction < SMALL_SLICE_THRESHOLD ? 0.5 : 1.0;

    return {
      ...s,
      value: safeValue,
      fraction,
      opacity,
    };
  });

  // For fault mode we use gradients; for others we use solid colors
  const resolvedFill = (slice: Slice, mode: Mode) => {
    if (mode === "fault") return slice.color;
    return slice.color;
  };

  const faultType = title.toLowerCase();

  const chartSize = 200;
  const isEquip = mode === "equip";
  const innerRadius = isEquip ? 0 : 50;
  const outerRadius = isEquip ? 95 : 90;
  const iconSize = innerRadius * 1.2 || 60;

  const handleClick = (_: any, index: number) => {
    if (!onSliceClick) return;
    const slice = chartData[index];
    if (!slice) return;

    if (mode === "fault") {
      const status = slice.key as Status;
      onSliceClick({ faultType, status });
    } else if (mode === "severity") {
      const severityBucket = slice.key as SeverityBucket;
      onSliceClick({ severityBucket });
    } else {
      const equipType = slice.key;
      onSliceClick({ equipType });
    }
  };

  if (!slices.length || rawTotal === 0) {
    return (
      <div
        style={{
          width: 220,
          textAlign: "center",
          marginBottom: 24,
          position: "relative",
        }}
      >
        <div
          className="border rounded-lg"
          style={{
            width: 220,
            height: 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "#9CA3AF",
          }}
        >
          No data available
        </div>
        <div style={{ marginTop: 8, fontSize: 16 }}>
          <strong>{title}</strong>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        minWidth: 200,
        maxWidth: 260,
        textAlign: "center",
        marginBottom: 24,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ position: "relative", top: "-4px" }}>
        <PieChart width={chartSize} height={chartSize}>
          {/* Gradients + glow for fault mode */}
          {mode === "fault" && (
            <defs>
              {/* OK */}
              <linearGradient id="okGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#49fb03ff" />
                <stop offset="100%" stopColor="#2ecb8fff" />
              </linearGradient>

              {/* Warning */}
              <linearGradient id="warnGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>

              {/* Alarm */}
              <linearGradient id="alarmGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff0000" />
                <stop offset="100%" stopColor="#ff0000" />
              </linearGradient>

              {/* Subtle glow for alarm slices */}
              <filter
                id="alarmGlow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="4"
                  result="blur"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          )}

          <Pie
            data={chartData}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            label={false}
            stroke="none"
            strokeWidth={2}
            paddingAngle={0.2}
            cornerRadius={5}
            startAngle={90}
            endAngle={-270}
            animationDuration={3000}
            onClick={handleClick}
          >
            {chartData.map((slice, idx) => (
              <Cell
                key={idx}
                fill={resolvedFill(slice, mode)}
                stroke="none"
                strokeWidth={0}
                opacity={slice.opacity}
                filter={
                  mode === "fault" && slice.key === "alarm"
                    ? "url(#alarmGlow)"
                    : undefined
                }
                style={{ cursor: "pointer" }}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any, name: any, entry: any) => {
              const qty = typeof value === "number" ? value.toFixed(0) : value;
              const label = entry?.payload?.label ?? name;
              return [`${qty}`, label];
            }}
            labelFormatter={() => ""}
            contentStyle={{
              background: "transparent",
              border: "none",
              boxShadow: "none",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
            }}
            itemStyle={{ color: "#fff", fontSize: 14, fontWeight: 700 }}
            labelStyle={{ color: "#fff", fontSize: 14, fontWeight: 700 }}
          />
        </PieChart>
      </div>

      {/* Center icon overlay only for fault mode */}
      {mode === "fault" && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -90%)",
            pointerEvents: "none",
          }}
        >
          {faultIcon(title, iconSize)}
        </div>
      )}

      {/* Title */}
      <div style={{ marginTop: 28, fontSize: 16 }}>
        <strong>{title}</strong>
      </div>
    </div>
  );
}
