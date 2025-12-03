import React from "react";

type Status = "ok" | "warning" | "alarm";

type Props = {
  current: number;            // current RMS (in/s)
  forecast: number | null;    // forecast RMS (in/s)
  okLimit: number;            // ISO 10816 OK→Warning boundary
  warnLimit: number;          // ISO 10816 Warning→Alarm boundary
  max: number;                // gauge maximum (in/s)
  title?: string;
};

export function IsoRmsThreeArcGauge({
  current,
  forecast,
  okLimit,
  warnLimit,
  max,
  title = "Velocity RMS",
}: Props) {

  // Helper: convert value → angle in radians for the arc
  const valToAngle = (v: number) => {
    const clamped = Math.max(0, Math.min(v, max));
    return (-Math.PI + (clamped / max) * Math.PI); // -180° to 0°
  };

  // Arc generator for a semicircle sweep
  const makeArc = (value: number, stroke: string, width: number, opacity = 1) => {
    const angle = valToAngle(value);
    const largeArc = angle > -Math.PI / 2 ? 1 : 0; // when > halfway
    const x = 150 + 120 * Math.cos(angle);
    const y = 150 + 120 * Math.sin(angle);

    return (
      <path
        d={`M 30 150 A 120 120 0 ${largeArc} 1 ${x} ${y}`}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        fill="none"
        opacity={opacity}
      />
    );
  };

  // Full band segments (background): OK / WARNING / ALARM
  const okAngle = valToAngle(okLimit);
  const warnAngle = valToAngle(warnLimit);

  const bandArc = (from: number, to: number, color: string) => {
    const a0 = valToAngle(from);
    const a1 = valToAngle(to);
    const largeArc = Math.abs(a1 - a0) > Math.PI / 2 ? 1 : 0;

    const x0 = 150 + 120 * Math.cos(a0);
    const y0 = 150 + 120 * Math.sin(a0);

    const x1 = 150 + 120 * Math.cos(a1);
    const y1 = 150 + 120 * Math.sin(a1);

    return (
      <path
        d={`M ${x0} ${y0} A 120 120 0 ${largeArc} 1 ${x1} ${y1}`}
        stroke={color}
        strokeWidth={18}
        fill="none"
        strokeLinecap="round"
        opacity={0.35}
      />
    );
  };

  // Colors
  const COLORS = {
    ok: "#22c55e",
    warning: "#eab308",
    alarm: "#ef4444",
  };

  // Determine current + forecast status by thresholds
  const classify = (v: number): Status => {
    if (v < okLimit) return "ok";
    if (v < warnLimit) return "warning";
    return "alarm";
  };

  const currentStatus = classify(current);
  const forecastStatus = forecast != null ? classify(forecast) : null;

  return (
    <div style={{ width: 300, margin: "0 auto", textAlign: "center" }}>
      <svg width="300" height="180" viewBox="0 0 300 180">

        {/* ========== BACKGROUND BANDS (3 arcs) ========== */}
        {bandArc(0, okLimit, COLORS.ok)}
        {bandArc(okLimit, warnLimit, COLORS.warning)}
        {bandArc(warnLimit, max, COLORS.alarm)}

        {/* ========== CURRENT ARC (solid) ========== */}
        {makeArc(current, COLORS[currentStatus], 10, 1)}

        {/* ========== FORECAST ARC (semi-transparent) ========== */}
        {forecast != null &&
          makeArc(forecast, COLORS[forecastStatus!], 7, 0.35)}

      </svg>

      {/* Readout */}
      <div style={{ color: "#e5e7eb", marginTop: -10 }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>
          {current.toFixed(3)} in/s
        </div>

        <div style={{ fontSize: 14, marginTop: 5 }}>
          Current:{" "}
          <span style={{ color: COLORS[currentStatus], fontWeight: 600 }}>
            {currentStatus.toUpperCase()}
          </span>
          {forecast != null && (
            <>
              {" · "}Forecast:{" "}
              <span
                style={{
                  color: COLORS[forecastStatus!],
                  fontWeight: 600,
                }}
              >
                {forecastStatus!.toUpperCase()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
