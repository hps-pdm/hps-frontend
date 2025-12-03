"use client";

import React, { useMemo } from "react";
import { useEquipmentForecast } from "../../lib/queries";
import {
  getIsoVelocityThresholdsIn,
  getIsoAccThresholds,
  mmPerSecToInPerSec,
} from "../../constants/isoThresholds";

type Status = "ok" | "warning" | "alarm";

const STATUS_COLOR: Record<Status, string> = {
  ok: "#49fb03ff",      // green
  warning: "#facc15", // amber
  alarm: "#ef4444",   // red
};

type CardProps = {
  sn: number | string;
  direction: "d1" | "d2" | "d3";
  directionLabel: string;
  isoGroup?: number | null; // ISO 10816/20816 group 1..4
  rpmHz?: number | null;     // backend-estimated 1× speed (Hz) to drive bearing thresholds
  thresholdsConfig?: any;    // optional thresholds/matrix from backend/config
};

type MetricGaugeProps = {
  sn: number | string;
  direction: "d1" | "d2" | "d3";
  directionLabel: string;
  metric: string;      // "rms_vel" or "rms_acc"
  title: string;       // e.g. "Vel RMS - Vertical"
  units: string;       // "in/s" or "g"
  okLimit: number;     // OK → Warning boundary (in units)
  warnLimit: number;   // Warning → Alarm boundary
  max: number;         // gauge max (in units)
  min?: number;        // usually 0
};

// Bearing beta curve (matches backend get_bearing_fault_rms)
const BETA_POINTS = [
  { rpm: 200, beta: 0.2 },
  { rpm: 600, beta: 0.6 },
  { rpm: 1200, beta: 0.95 },
  { rpm: 1800, beta: 1.3 },
  { rpm: 3600, beta: 2.5 },
];

function interpBeta(rpm: number): number {
  if (!Number.isFinite(rpm)) return BETA_POINTS[0].beta;
  if (rpm <= BETA_POINTS[0].rpm) return BETA_POINTS[0].beta;
  for (let i = 0; i < BETA_POINTS.length - 1; i++) {
    const a = BETA_POINTS[i];
    const b = BETA_POINTS[i + 1];
    if (rpm <= b.rpm) {
      const t = (rpm - a.rpm) / (b.rpm - a.rpm);
      return a.beta + t * (b.beta - a.beta);
    }
  }
  return BETA_POINTS[BETA_POINTS.length - 1].beta;
}

// ---------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------

function classifyByLimits(
  value: number | null | undefined,
  okLimit: number,
  warnLimit: number
): Status {
  if (value == null || Number.isNaN(value)) return "ok";
  const v = Number(value);
  if (v < okLimit) return "ok";
  if (v < warnLimit) return "warning";
  return "alarm";
}

function severityLabel(s: Status | null | undefined) {
  if (!s) return "UNKNOWN";
  return s.toUpperCase();
}

// ---------------------------------------------------------------------
// SVG gauge – three arcs, same style for all metrics
// ---------------------------------------------------------------------

function valueToAngle(value: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(value, max));
  const frac = (clamped - min) / (max - min || 1);
  // map min..max → -π..0 (left to right semicircle)
  return -Math.PI + frac * Math.PI;
}

type GaugeSvgProps = {
  title: string;
  units: string;
  currentVal: number | null;
  forecastVal: number | null;
  okLimit: number;
  warnLimit: number;
  min: number;
  max: number;
};

const MetricThreeArcGaugeSvg: React.FC<GaugeSvgProps> = ({
  title,
  units,
  currentVal,
  forecastVal,
  okLimit,
  warnLimit,
  min,
  max,
}) => {
  const cx = 150;
  const cy = 150;

  const BACKGROUND_RADIUS = 120; // base ISO bands
  const CURRENT_RADIUS = 104;    // current arc
  const FORECAST_RADIUS = 135;   // forecast arc

  const bandWidth = 10;
  const currentWidth = 10;
  const forecastWidth = 10;

  const tickRadius = BACKGROUND_RADIUS + 28;
  const tickStyle: React.CSSProperties = { fontSize: 18, fill: "#9ca3af" };

  const angleForVal = (v: number) => valueToAngle(v, min, max);

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

  const valueArc = (
    value: number,
    color: string,
    width: number,
    opacity: number,
    r: number
  ) => {
    const v = Math.max(min, Math.min(value, max));
    const angle = angleForVal(v);
    // For a semicircle gauge, the sweep is never > 180°, so largeArc = 0
    const largeArc = 0;

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

  const safeCurrent = currentVal ?? min;
  const safeForecast = forecastVal ?? min;

  const currentStatus = classifyByLimits(safeCurrent, okLimit, warnLimit);
  const forecastStatus =
    forecastVal != null ? classifyByLimits(safeForecast, okLimit, warnLimit) : null;

  const currentColor = STATUS_COLOR[currentStatus];
  const forecastColor = forecastStatus ? STATUS_COLOR[forecastStatus] : "#6b7280";

  // Needle for current
  const needleAngle = angleForVal(safeCurrent);
  const needleLen = CURRENT_RADIUS - 20;
  const needleX = cx + needleLen * Math.cos(needleAngle);
  const needleY = cy + needleLen * Math.sin(needleAngle);

  return (
    <div
      style={{ width: 300, margin: "0 auto", textAlign: "center" }}
      title={`${title} | Current: ${
        currentVal != null ? currentVal.toFixed(3) : "n/a"
      } ${units}${
        forecastVal != null
          ? ` · Forecast: ${forecastVal.toFixed(3)} ${units}`
          : ""
      }`}
    >
      <svg width="360" height="300" viewBox="0 0 360 200" style={{overflow: "visible"}} >
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

        {/* Background bands */}
        {bandArc(min, okLimit, STATUS_COLOR.ok, BACKGROUND_RADIUS)}
        {bandArc(okLimit, warnLimit, STATUS_COLOR.warning, BACKGROUND_RADIUS)}
        {bandArc(warnLimit, max, STATUS_COLOR.alarm, BACKGROUND_RADIUS)}

        {/* Current arc */}
        {safeCurrent > min &&
          valueArc(safeCurrent, currentColor, currentWidth, 1, CURRENT_RADIUS)}

        {/* Forecast arc */}
        {forecastVal != null &&
          forecastVal > min &&
          valueArc(
            safeForecast,
            forecastColor,
            forecastWidth,
            0.4,
            FORECAST_RADIUS
          )}

        {/* Needle */}
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

        {/* Ticks */}
        {tick(min, min.toFixed(2))}
        {tick(okLimit, okLimit.toFixed(2))}
        {tick(warnLimit, warnLimit.toFixed(2))}
        {tick(max, max.toFixed(2))}
      </svg>

      {/* Numeric + Status */}
      <div style={{ color: "#e5e7eb", marginTop: -75 }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>
          {safeCurrent.toFixed(3)}{" "}
          <span style={{ fontSize: 14 }}>{units}</span>
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
            {severityLabel(currentStatus)}
          </span>
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
                {severityLabel(forecastStatus)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// One metric gauge wrapper: fetch + map forecast → SVG
// ---------------------------------------------------------------------

const MetricGauge: React.FC<MetricGaugeProps> = ({
  sn,
  direction,
  directionLabel,
  metric,
  title,
  units,
  okLimit,
  warnLimit,
  max,
  min = 0,
}) => {
  const { data, isLoading, error } = useEquipmentForecast({
    sn,
    metric,
    direction,
    model: "linear",
    horizon_days: 7,
  });

  const { currentVal, forecastVal } = useMemo(() => {
    if (!data) {
      return {
        currentVal: null as number | null,
        forecastVal: null as number | null,
      };
    }

    const history = (data as any).history as Array<{ value: number | null }> | undefined;
    const forecast = (data as any).forecast as Array<{
      value?: number | null;
      upper?: number | null;
    }> | undefined;

    if (!Array.isArray(history) || !Array.isArray(forecast)) {
      return {
        currentVal: null as number | null,
        forecastVal: null as number | null,
      };
    }

    const historyLast = [...history].filter((p) => p.value != null).slice(-1)[0];
    const forecastLast = forecast.slice(-1)[0];

    const currentVal = historyLast ? (historyLast.value as number) : null;
    let forecastVal: number | null = null;
    if (forecastLast) {
      if (forecastLast.upper != null) forecastVal = forecastLast.upper as number;
      else if (forecastLast.value != null) forecastVal = forecastLast.value as number;
    }

    return { currentVal, forecastVal };
  }, [data]);

  if (isLoading) return <div>Loading {title}…</div>;
  if (error || !data) return <div>{title} forecast unavailable</div>;

  return (
    <MetricThreeArcGaugeSvg
      title={title}
      units={units}
      currentVal={currentVal}
      forecastVal={forecastVal}
      min={min}
      okLimit={okLimit}
      warnLimit={warnLimit}
      max={max}
    />
  );
};

// ---------------------------------------------------------------------
// Card: Velocity + Acceleration Gauges side-by-side
// ---------------------------------------------------------------------

export const RmsGaugesCard: React.FC<CardProps> = ({
  sn,
  direction,
  directionLabel,
  isoGroup,
  rpmHz,
  thresholdsConfig,
}) => {
  const g = isoGroup ?? 2; // default Group 2 if undefined

  // Velocity thresholds: prefer config threshold_matrix.vel_rms_mm_s; fallback to ISO
  const vel = useMemo(() => {
    // Per-asset override (highest priority)
    const asset = thresholdsConfig?.asset_thresholds?.vel_rms_mm_s;
    if (asset?.ok != null && asset?.warning != null && asset?.alarm != null) {
        return {
          ok_in_s: mmPerSecToInPerSec(Number(asset.ok)),
          warn_in_s: mmPerSecToInPerSec(Number(asset.warning)),
          max_in_s: mmPerSecToInPerSec(Number(asset.alarm)),
        };
    }

    const matrix = thresholdsConfig?.threshold_matrix?.vel_rms_mm_s;
    if (Array.isArray(matrix)) {
      const match =
        matrix.find((row: any) => row?.group === g) ||
        matrix.find((row: any) => row?.group == null);
      if (match?.ok != null && match?.warning != null && match?.alarm != null) {
        return {
          ok_in_s: mmPerSecToInPerSec(Number(match.ok)),
          warn_in_s: mmPerSecToInPerSec(Number(match.warning)),
          max_in_s: mmPerSecToInPerSec(Number(match.alarm)),
        };
      }
    }
    return getIsoVelocityThresholdsIn(g); // fallback
  }, [thresholdsConfig, g]);

  const accFallback = getIsoAccThresholds(g); // g

  const accThresholds = useMemo(() => {
    // Per-asset override (highest priority)
    const asset = thresholdsConfig?.asset_thresholds?.acc_rms_g;
    if (asset?.ok != null && asset?.warning != null && asset?.alarm != null) {
      return {
        ok: Number(asset.ok),
        warn: Number(asset.warning),
        max: Number(asset.alarm),
      };
    }

    if (rpmHz != null && Number.isFinite(rpmHz)) {
      const beta = interpBeta(rpmHz * 60.0); // curve is in RPM
      const ok = beta * 0.5;
      const warn = beta;
      const max = Math.max(accFallback.max_g, warn * 1.6);
      return { ok, warn, max };
    }
    const accCfg = thresholdsConfig?.thresholds?.acc_rms_g;
    if (accCfg?.ok != null && accCfg?.warning != null) {
      const ok = Number(accCfg.ok);
      const warn = Number(accCfg.warning);
      const max = Math.max(accFallback.max_g, warn * 1.5);
      return { ok, warn, max };
    }
    return { ok: accFallback.ok_g, warn: accFallback.warn_g, max: accFallback.max_g };
  }, [rpmHz, accFallback, thresholdsConfig]);

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        flexWrap: "wrap",
        justifyContent: "space-between",
      }}
    >
      <MetricGauge
        sn={sn}
        direction={direction}
        directionLabel={directionLabel}
        metric="rms_vel"
        title={`Vel RMS x10 - ${directionLabel}`}
        units="in/s"
        min={0}
        okLimit={vel.ok_in_s}
        warnLimit={vel.warn_in_s}
        max={vel.max_in_s}
      />

      <MetricGauge
        sn={sn}
        direction={direction}
        directionLabel={directionLabel}
        metric="rms_acc"
        title={`Acc RMS x10 - ${directionLabel}`}
        units="g"
        min={0}
        okLimit={accThresholds.ok}
        warnLimit={accThresholds.warn}
        max={accThresholds.max}
      />
    </div>
  );
};

export default RmsGaugesCard;
