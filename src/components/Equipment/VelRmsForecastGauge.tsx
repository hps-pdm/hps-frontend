"use client";

import React, { useMemo } from "react";
import { useEquipmentForecast } from "../../lib/queries";


type Props = {
  sn: number | string;
  direction: "d1" | "d2" | "d3";
  directionLabel: string;
};

type Status = "ok" | "warning" | "alarm";

const STATUS_COLOR: Record<Status, string> = {
  ok: "#22c55e",
  warning: "#eab308",
  alarm: "#ef4444",
};

// -----------------------------
// ISO-based thresholds (Group 2)
// -----------------------------
//
// ISO 10816/20816 Group 2 example (velocity RMS, mm/s):
//   Good + Satisfactory    < 4.5
//   Unsatisfactory         4.5 – 7.1
//   Unacceptable           > 7.1
//
// Convert to in/s: divide by 25.4
const MM_PER_IN = 25.4;

const ISO_OK_LIMIT_MM = 4.5;
const ISO_WARN_LIMIT_MM = 7.1;

const ISO_OK_LIMIT_IN = ISO_OK_LIMIT_MM / MM_PER_IN; // ≈ 0.18 in/s
const ISO_WARN_LIMIT_IN = ISO_WARN_LIMIT_MM / MM_PER_IN; // ≈ 0.28 in/s

// Gauge range in in/s
const GAUGE_MIN = 0.0;
const GAUGE_MAX = 0.5;

// 3-level classification using ISO thresholds
function classifyRmsISO(value: number | null | undefined): Status {
  if (value == null || Number.isNaN(value)) return "ok";
  const v = Number(value);

  if (v < ISO_OK_LIMIT_IN) return "ok"; // Good/Satisfactory
  if (v < ISO_WARN_LIMIT_IN) return "warning"; // Unsatisfactory
  return "alarm"; // Unacceptable
}

// Approximate ISO group from RMS value
function isoGroupFromRms(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const v = Number(value);
  if (v < ISO_OK_LIMIT_IN) return 2;
  if (v < ISO_WARN_LIMIT_IN) return 3;
  return 4;
}

// -----------------------------
// SVG helpers
// -----------------------------

function valueToAngle(value: number, max: number): number {
  const clamped = Math.max(GAUGE_MIN, Math.min(value, max));
  // map 0..max → -π..0 (left to right semicircle)
  return -Math.PI + (clamped / max) * Math.PI;
}

type IsoGaugeSvgProps = {
  title: string;
  currentVal: number | null; // in/s
  forecastVal: number | null; // in/s
};

const IsoRmsThreeArcGaugeSvg: React.FC<IsoGaugeSvgProps> = ({
  title,
  currentVal,
  forecastVal,
}) => {
  const cx = 150;
  const cy = 150;

  // separate radii for each ring
  const BACKGROUND_RADIUS = 120; // ISO bands
  const CURRENT_RADIUS = 120; // current arc
  const FORECAST_RADIUS = 142; // forecast arc

  const bandWidth = 24;
  const currentWidth = 16;
  const forecastWidth = 10;

  const tickRadius = BACKGROUND_RADIUS + 18;
  const tickStyle: React.CSSProperties = { fontSize: 12, fill: "#9ca3af" };

  const angleForVal = (v: number) => valueToAngle(v, GAUGE_MAX);

  const tick = (value: number, text: string) => {
    const a = angleForVal(value);
    const x = cx + tickRadius * Math.cos(a);
    const y = cy + tickRadius * Math.sin(a);
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        style={tickStyle}
      >
        {text}
      </text>
    );
  };

  // background band between from → to at radius r
  const bandArc = (from: number, to: number, color: string, r: number) => {
    const a0 = angleForVal(from);
    const a1 = angleForVal(to);
    const largeArc = Math.abs(a1 - a0) > Math.PI / 2 ? 1 : 0;

    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);

    return (
      <path
        d={`M ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1}`}
        stroke={color}
        strokeWidth={bandWidth}
        fill="none"
        strokeLinecap="round"
        opacity={0.35}
      />
    );
  };

  // value arc from 0 → value at radius r
  const valueArc = (
    value: number,
    color: string,
    width: number,
    opacity: number,
    r: number
  ) => {
    const v = Math.max(GAUGE_MIN, Math.min(value, GAUGE_MAX));
    const angle = angleForVal(v);
    const largeArc = v > GAUGE_MAX / 2 ? 1 : 0;

    const x0 = cx + r * Math.cos(-Math.PI);
    const y0 = cy + r * Math.sin(-Math.PI);
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);

    return (
      <path
        d={`M ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1}`}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        fill="none"
        opacity={opacity}
      />
    );
  };

  const safeCurrent = currentVal ?? 0;
  const safeForecast = forecastVal ?? 0;

  const currentStatus = classifyRmsISO(currentVal);
  const forecastStatus =
    forecastVal != null ? classifyRmsISO(forecastVal) : null;

  const currentGroup = isoGroupFromRms(currentVal);
  const forecastGroup = isoGroupFromRms(forecastVal);

  const currentColor = STATUS_COLOR[currentStatus];
  const forecastColor = forecastStatus ? STATUS_COLOR[forecastStatus] : "#6b7280";

  // Needle for current
  const needleAngle = angleForVal(safeCurrent);
  const needleLen = CURRENT_RADIUS - 20;
  const needleX = cx + needleLen * Math.cos(needleAngle);
  const needleY = cy + needleLen * Math.sin(needleAngle);

  // Tooltip text
  const tooltipParts: string[] = [];
  if (currentVal != null) {
    tooltipParts.push(
      `Current: ${currentVal.toFixed(3)} in/s (ISO G${
        currentGroup ?? "?"
      }, ${currentStatus.toUpperCase()})`
    );
  }
  if (forecastVal != null) {
    tooltipParts.push(
      `Forecast: ${forecastVal.toFixed(3)} in/s (ISO G${
        forecastGroup ?? "?"
      }, ${forecastStatus?.toUpperCase()})`
    );
  }
  const tooltip = tooltipParts.join(" | ");

  return (
    <div
      style={{ width: 300, margin: "0 auto", textAlign: "center" }}
      title={tooltip}
    >
      <svg width="300" height="300" viewBox="0 0 300 210">
        {/* Title */}
        <text
          x={cx}
          y={-15}
          textAnchor="middle"
          fill="#e5e7eb"
          fontSize="16"
          fontWeight="600"
        >
          {title}
        </text>

        {/* ==== BACKGROUND BANDS (ISO zones) ==== */}
        {bandArc(GAUGE_MIN, ISO_OK_LIMIT_IN, STATUS_COLOR.ok, BACKGROUND_RADIUS)}
        {bandArc(
          ISO_OK_LIMIT_IN,
          ISO_WARN_LIMIT_IN,
          STATUS_COLOR.warning,
          BACKGROUND_RADIUS
        )}
        {bandArc(
          ISO_WARN_LIMIT_IN,
          GAUGE_MAX,
          STATUS_COLOR.alarm,
          BACKGROUND_RADIUS
        )}

        {/* ==== CURRENT ARC (inner ring) ==== */}
        {safeCurrent > 0 &&
          valueArc(safeCurrent, currentColor, currentWidth, 1, CURRENT_RADIUS)}

        {/* ==== FORECAST ARC (outer ring) ==== */}
        {forecastVal != null &&
          forecastVal > 0 &&
          valueArc(
            safeForecast,
            forecastColor,
            forecastWidth,
            0.4,
            FORECAST_RADIUS
          )}

        {/* ==== NEEDLE ==== */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={currentColor}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill="#0f172a" stroke={currentColor} />

        {/* ==== TICKS ==== */}
        {tick(0, "0")}
        {tick(ISO_OK_LIMIT_IN, ISO_OK_LIMIT_IN.toFixed(2))}
        {tick(ISO_WARN_LIMIT_IN, ISO_WARN_LIMIT_IN.toFixed(2))}
        {tick(GAUGE_MAX, GAUGE_MAX.toFixed(2))}
      </svg>

      {/* Numeric + Status */}
      <div style={{ color: "#e5e7eb", marginTop: -75 }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>
          {safeCurrent.toFixed(3)} <span style={{ fontSize: 14 }}>in/s</span>
        </div>

        <div style={{ fontSize: 13, marginTop: 4 }}>
          Current:{" "}
          <span
            style={{
              color: currentColor,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {currentStatus}
          </span>
          {currentGroup && (
            <span style={{ marginLeft: 4, color: "#9ca3af", fontSize: 11 }}>
              
            </span>
          )}
          {forecastVal != null && (
            <>
              {" · "}Forecast:{" "}
              <span
                style={{
                  color: forecastColor,
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                {forecastStatus}
              </span>
              {forecastGroup && (
                <span
                  style={{ marginLeft: 4, color: "#9ca3af", fontSize: 11 }}
                >
                  
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// -----------------------------
// Wrapper: fetch + derive values
// -----------------------------

const VelRmsForecastGaugeInner: React.FC<Props> = ({
  sn,
  direction,
  directionLabel,
}) => {
  const { data, isLoading, error } = useEquipmentForecast({
    sn,
    metric: "rms_vel",
    direction,
    model: "linear",
    horizon_days: 7,
  });

  const { currentVal, forecastVal } = useMemo(() => {
    if (!data || !Array.isArray(data.history) || !Array.isArray(data.forecast)) {
      return {
        currentVal: null as number | null,
        forecastVal: null as number | null,
      };
    }

    const historyLast = [...data.history]
      .filter((p: any) => p.value != null)
      .slice(-1)[0];

    const forecastLast = data.forecast.slice(-1)[0];

    const currentVal = historyLast ? (historyLast.value as number) : null;
    let forecastVal: number | null = null;
    if (forecastLast) {
      if (forecastLast.upper != null) forecastVal = forecastLast.upper as number;
      else if (forecastLast.value != null) forecastVal = forecastLast.value as number;
    }

    return { currentVal, forecastVal };
  }, [data]);

  if (isLoading) return <div>Loading velocity RMS forecast…</div>;
  if (error || !data) return <div>Forecast unavailable</div>;

  return (
    <IsoRmsThreeArcGaugeSvg
      title={`Vel RMS Forecast - ${directionLabel}`}
      currentVal={currentVal}
      forecastVal={forecastVal}
    />
  );
};

// Export both named and default so existing imports keep working
export const VelRmsForecastGauge = VelRmsForecastGaugeInner;
export default VelRmsForecastGaugeInner;
