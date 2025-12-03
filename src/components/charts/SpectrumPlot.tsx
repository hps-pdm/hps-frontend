"use client";

import React, { useMemo, useState, useEffect } from "react";
import Plot from "react-plotly.js";
import { useEquipmentSpectrum, useEquipmentDiagnostics } from "../../lib/queries";

type SpectrumPlotProps = {
  sn: number;
  dir: number;          // 1,2,3
  rangeHz: number | null;
  onRangeChange: (val: number | null) => void;
  maxN?: number;
  rpmHz?: number | null;
  onFundamentalChange?: (hz: number) => void;
  controlsLeft?: React.ReactNode;
  showRangeControls?: boolean;
};

const DIR_LABELS: Record<number, string> = {
  1: "Vertical",
  2: "Horizontal",
  3: "Axial",
};

const RANGE_PRESETS: { label: string; maxHz: number | null }[] = [
  { label: "0–1 kHz", maxHz: 1000 },
  { label: "0–2.5 kHz", maxHz: 2500 },
  { label: "Full", maxHz: null },
];

// Normalize diagnostics shape (top-level vs diagnostics.metrics)
function useRpmDiagnostics(sn: number) {
  const { data, isLoading, error } = useEquipmentDiagnostics(sn);

  const metrics = useMemo(() => {
    if (!data) return null;
    // If backend wraps metrics as { serialNumber, metrics: {...} }
    if ((data as any).metrics) return (data as any).metrics;
    // Otherwise assume everything is top-level
    return data as any;
  }, [data]);

  const rpm_1x_hz =
    metrics && typeof metrics.rpm_1x_hz === "number" ? metrics.rpm_1x_hz : null;
  const rpm_1x_rpm =
    metrics && typeof metrics.rpm_1x_rpm === "number" ? metrics.rpm_1x_rpm : null;
  const rpm_sdr =
    metrics && typeof metrics.rpm_sdr === "number" ? metrics.rpm_sdr : null;
  const rpm_score_best =
    metrics && typeof metrics.rpm_score_best === "number"
      ? metrics.rpm_score_best
      : null;
  const rpm_score_second =
    metrics && typeof metrics.rpm_score_second === "number"
      ? metrics.rpm_score_second
      : null;
  const rpm_confidence =
    metrics && typeof metrics.rpm_confidence === "string"
      ? (metrics.rpm_confidence as "strong" | "medium" | "weak" | "unknown")
      : "unknown";

  return {
    isLoading,
    error,
    metrics,
    rpm_1x_hz,
    rpm_1x_rpm,
    rpm_sdr,
    rpm_score_best,
    rpm_score_second,
    rpm_confidence,
  };
}

// Fallback peak search for fundamental
function pickPeakF0(freqs: number[], amps: number[], minFreq = 1.0): number | null {
  if (!freqs.length || !amps.length) return null;
  let maxIdx = -1;
  let maxVal = -Infinity;
  for (let i = 0; i < amps.length; i++) {
    if (freqs[i] < minFreq) continue; // ignore DC/very-low drift
    if (amps[i] > maxVal) {
      maxVal = amps[i];
      maxIdx = i;
    }
  }
  if (maxIdx === -1) return null;
  return freqs[maxIdx] ?? null;
}

export default function SpectrumPlot({
  sn,
  dir,
  rangeHz,
  onRangeChange,
  maxN = 2048,
  rpmHz: rpmHzProp,
  onFundamentalChange,
  controlsLeft,
  showRangeControls = true,
}: SpectrumPlotProps) {
  const { data, isLoading, error } = useEquipmentSpectrum(sn, dir, maxN);

  // Full spectrum
  const { freqs, amps } = useMemo(() => {
    if (!data || !Array.isArray(data.frequencies) || !Array.isArray(data.fft_vel)) {
      return { freqs: [] as number[], amps: [] as number[] };
    }
    const f = data.frequencies as number[];
    const a = data.fft_vel as number[];
    const n = Math.min(f.length, a.length);
    return {
      freqs: f.slice(0, n),
      amps: a.slice(0, n),
    };
  }, [data]);

  // View window based on rangeHz
  const { freqsView, ampsView } = useMemo(() => {
    if (!freqs.length || !amps.length) {
      return { freqsView: [] as number[], ampsView: [] as number[] };
    }
    if (rangeHz == null) {
      return { freqsView: freqs, ampsView: amps };
    }
    const idxMax = freqs.findIndex((v) => v > rangeHz);
    const cut = idxMax === -1 ? freqs.length : idxMax;
    return {
      freqsView: freqs.slice(0, cut),
      ampsView: amps.slice(0, cut),
    };
  }, [freqs, amps, rangeHz]);

  const hasData = freqsView.length > 0 && ampsView.length > 0;

  // Top peaks from entire spectrum (still useful to display)
  const topPeaks = useMemo(() => {
    if (!freqs.length || !amps.length) return [];
    const pairs: { f: number; a: number }[] = [];
    for (let i = 1; i < freqs.length; i++) {
      pairs.push({ f: freqs[i], a: amps[i] });
    }
    pairs.sort((p, q) => q.a - p.a);
    return pairs.slice(0, 5);
  }, [freqs, amps]);

  // Decide fundamental: prefer provided rpmHz, fallback to tallest peak if missing
  const effectiveFundamental = useMemo(() => {
    if (rpmHzProp && rpmHzProp > 0) return rpmHzProp;
    const peakF0 = pickPeakF0(freqs, amps, 1.0);
    return peakF0 ?? null;
  }, [rpmHzProp, freqs, amps]);

  // Determine max freq displayed
  const maxFreqDisplayed = useMemo(() => {
    if (rangeHz != null) return rangeHz;
    if (!freqs.length) return null;
    return freqs[freqs.length - 1];
  }, [rangeHz, freqs]);

  // Compute harmonics within displayed range
  const harmonics = useMemo(() => {
    if (!effectiveFundamental || !maxFreqDisplayed || maxFreqDisplayed <= 0) return [];
    const arr: number[] = [];
    let n = 1;
    const maxHarmonics = 10; // safety cap
    while (n <= maxHarmonics && n * effectiveFundamental <= maxFreqDisplayed) {
      arr.push(n * effectiveFundamental);
      n++;
    }
    return arr;
  }, [effectiveFundamental, maxFreqDisplayed]);

  const shapesHarmonics = harmonics.map((hf, idx) => ({
    type: "line" as const,
    x0: hf,
    x1: hf,
    y0: 0,
    y1: 1,
    xref: "x",
    yref: "paper" as const,
    line: {
      color: idx === 0 ? "rgba(248,250,252,0.75)" : "rgba(248,250,252,0.35)",
      width: idx === 0 ? 1.5 : 1,
      dash: idx === 0 ? "solid" : "dot",
    },
    editable: true, // allow dragging any harmonic
  }));

  const shapes = [...shapesHarmonics];

  const annotations = [
    ...harmonics.map((hf, idx) => ({
      x: hf,
      y: 1,
      xref: "x",
      yref: "paper" as const,
      text: `${idx + 1}×`,
      showarrow: false,
      yanchor: "bottom" as const,
      textangle: -90,
      font: {
        size: 10,
        color: idx === 0 ? "#facc15" : "#93c5fd",
      },
    })),
  ];

  const directionLabel = DIR_LABELS[dir] ?? `Dir ${dir}`;

  const handleRelayout = (ev: any) => {
    // Detect any harmonic line drag. If harmonic k (1-based) moved to x, set fundamental = x / k.
    // relayoutData may include shapes array or keys like "shapes[2].x0"
    let candidate: { idx: number; x: number } | null = null;

    if (Array.isArray(ev?.shapes)) {
      ev.shapes.forEach((s: any, idx: number) => {
        const x0 = s?.x0;
        if (typeof x0 === "number" && isFinite(x0)) {
          candidate = { idx, x: x0 };
        }
      });
    } else {
      Object.keys(ev || {}).forEach((k) => {
        const match = k.match(/^shapes\[(\d+)\]\.x0$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          const val = ev[k];
          if (typeof val === "number" && isFinite(val)) {
            candidate = { idx, x: val };
          }
        }
      });
    }

    if (candidate) {
      const harmonicOrder = candidate.idx + 1; // idx 0 => 1×, 1 => 2×, etc.
      if (harmonicOrder > 0) {
        const newFund = candidate.x / harmonicOrder;
        if (isFinite(newFund) && newFund > 0) {
          onFundamentalChange?.(newFund);
        }
      }
    }
  };

  return (
    <div>
      {isLoading && <div>Loading velocity spectrum…</div>}
      {error && (
        <div style={{ color: "#f97373" }}>
          Failed to load spectrum: {(error as Error).message}
        </div>
      )}
      {!isLoading && !error && !hasData && (
        <div>No spectrum data available for this range/direction.</div>
      )}

      {!isLoading && !error && hasData && (
        <div style={{ position: "relative" }}>
          <Plot
            data={[
              {
                x: freqsView,
                y: ampsView,
                type: "scatter",
                mode: "lines",
                line: { width: 1 },
                name: `${directionLabel}`,
              },
            ]}
            layout={{
              autosize: true,
              height: 260,
              margin: { l: 60, r: 10, t: 30, b: 40 },
              paper_bgcolor: "rgba(0,0,0,0)",
              plot_bgcolor: "rgba(15,23,42,1)",
              font: { color: "#e5e7eb", size: 11 },
              dragmode: "zoom",
              uirevision: "spectrum-v1",
              xaxis: {
                title: "",
                showgrid: true,
                gridcolor: "rgba(55,65,81,0.6)",
                zeroline: false,
              },
              yaxis: {
                title: "",
                showgrid: true,
                gridcolor: "rgba(55,65,81,0.6)",
                zeroline: false,
              },
              title: {
                text: ``,
                x: 0,
                xanchor: "left",
                y: 0.98,
                yanchor: "top",
                font: { size: 13 },
              },
              shapes,
              annotations,
            }}
            style={{ width: "100%" }}
            config={{
              displaylogo: false,
              responsive: true,
              scrollZoom: true,
              modeBarButtonsToRemove: ["toImage"],
              editable: true,
              edits: {
                shapePosition: true,
                titleText: false,
                annotationText: false,
                axisTitleText: false,
                colorbarTitleText: false,
              },
            }}
            onRelayout={handleRelayout}
          />

          {/* Controls row */}
          {showRangeControls && (
            <div
              style={{
                position: "absolute",
                top: -26,
                left: 12,
                right: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "flex-end",
                pointerEvents: "none",
              }}
            >
              {controlsLeft}
              <div style={{ display: "flex", gap: 6, marginLeft: controlsLeft ? 12 : 0 }}>
                {RANGE_PRESETS.map((r) => {
                  const active = rangeHz === r.maxHz;
                  return (
                    <button
                      key={r.label}
                      onClick={() => onRangeChange(r.maxHz)}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 999,
                        border: active ? "1px solid #38bdf8" : "1px solid #4b5563",
                        backgroundColor: active ? "#0f172a" : "transparent",
                        color: "#cbd5f5",
                        fontSize: 11,
                        cursor: "pointer",
                        minWidth: 70,
                        pointerEvents: "auto",
                      }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
