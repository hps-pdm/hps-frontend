"use client";

import React, { useMemo, useEffect } from "react";
import Plot from "react-plotly.js";
import { useEquipmentAccSpectrum, useEquipmentDiagnostics } from "../../lib/queries";

type AccSpectrumPlotProps = {
  sn: number;
  dir: number;          // 1,2,3
  rangeHz: number | null;
  maxN?: number;
  rpmHz?: number | null;
  onFundamentalChange?: (hz: number) => void;
};

const DIR_LABELS: Record<number, string> = {
  1: "Vertical",
  2: "Horizontal",
  3: "Axial",
};

export default function AccSpectrumPlot({
  sn,
  dir,
  rangeHz,
  maxN = 2048,
  rpmHz,
  onFundamentalChange,
}: AccSpectrumPlotProps) {
  const { data, isLoading, error } = useEquipmentAccSpectrum(sn, dir, maxN);
  const { data: diag } = useEquipmentDiagnostics(sn);

  const { freqs, amps } = useMemo(() => {
    if (!data || !Array.isArray(data.frequencies) || !Array.isArray(data.fft_acc)) {
      return { freqs: [] as number[], amps: [] as number[] };
    }
    const f = data.frequencies as number[];
    const a = data.fft_acc as number[];
    const n = Math.min(f.length, a.length);
    return {
      freqs: f.slice(0, n),
      amps: a.slice(0, n),
    };
  }, [data]);

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

  const effectiveFundamental = useMemo(() => {
    const rpm = rpmHz ?? (diag as any)?.rpm_1x_hz ?? (diag as any)?.metrics?.rpm_1x_hz;
    if (rpm && rpm > 0) return rpm;
    // fallback: tallest peak
    if (!freqs.length || !amps.length) return null;
    let maxIdx = 0;
    for (let i = 1; i < freqs.length; i++) {
      if (amps[i] > amps[maxIdx]) maxIdx = i;
    }
    return freqs[maxIdx] ?? null;
  }, [rpmHz, diag, freqs, amps]);

  const maxFreqDisplayed = useMemo(() => {
    if (rangeHz != null) return rangeHz;
    if (!freqs.length) return null;
    return freqs[freqs.length - 1];
  }, [rangeHz, freqs]);

  const harmonics = useMemo(() => {
    if (!effectiveFundamental || !maxFreqDisplayed || maxFreqDisplayed <= 0) return [];
    const arr: number[] = [];
    let n = 1;
    const maxHarmonics = 10;
    while (n <= maxHarmonics && n * effectiveFundamental <= maxFreqDisplayed) {
      arr.push(n * effectiveFundamental);
      n++;
    }
    return arr;
  }, [effectiveFundamental, maxFreqDisplayed]);

  const shapes = harmonics.map((hf, idx) => ({
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

  const annotations = harmonics.map((hf, idx) => ({
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
  }));

  const handleRelayout = (ev: any) => {
    // Allow dragging any harmonic; if harmonic k moves to x, set fundamental = x / k
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
      const harmonicOrder = candidate.idx + 1;
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
      {isLoading && <div>Loading acceleration spectrum…</div>}
      {error && (
        <div style={{ color: "#f97373" }}>
          Failed to load acceleration spectrum: {(error as Error).message}
        </div>
      )}
      {!isLoading && !error && !hasData && (
        <div>No acceleration spectrum data available for this range/direction.</div>
      )}

      {!isLoading && !error && hasData && (
        <Plot
          data={[
            {
              x: freqsView,
              y: ampsView,
              type: "scatter",
              mode: "lines",
              line: { width: 1 },
              name: `${DIR_LABELS[dir]}`,
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
            uirevision: "acc-spectrum-v1",
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
      )}
    </div>
  );
}
