"use client";

import { useMemo } from "react";
import Plot from "react-plotly.js";
import { useEquipmentAccSpectrum } from "../../lib/queries";

type SpectrumData = {
  freqs: number[];
  amps: number[];
};

function useDirAccSpectrum(
  sn: string,
  dir: number,
  maxN: number
): {
  data: SpectrumData | null;
  loading: boolean;
  error: boolean;
} {
  const { data, isLoading, error } = useEquipmentAccSpectrum(sn, dir, maxN);

  const shaped = useMemo(() => {
    if (!data || !Array.isArray(data.frequencies) || !Array.isArray(data.fft_acc)) {
      return null;
    }
    return {
      freqs: data.frequencies as number[],
      amps: data.fft_acc as number[],
    };
  }, [data]);

  return {
    data: shaped,
    loading: isLoading,
    error: !!error,
  };
}

// Direction labels (consistent everywhere)
const DIR_LABELS: Record<number, string> = {
  1: "Vertical",
  2: "Horizontal",
  3: "Axial",
};

export default function EquipmentAccSpectrum({ sn }: { sn: string }) {
  const maxN = 4096;

  // Load acceleration spectrum for each direction explicitly
  const d1 = useDirAccSpectrum(sn, 1, maxN);
  const d2 = useDirAccSpectrum(sn, 2, maxN);
  const d3 = useDirAccSpectrum(sn, 3, maxN);

  const anyLoading = d1.loading || d2.loading || d3.loading;
  const anyData =
    (d1.data && d1.data.freqs.length) ||
    (d2.data && d2.data.freqs.length) ||
    (d3.data && d3.data.freqs.length);
  const allError = !anyLoading && !anyData;

  if (anyLoading) {
    return <div style={{ marginTop: 24 }}>Loading acceleration spectrum…</div>;
  }

  if (allError) {
    return (
      <div style={{ marginTop: 24, color: "#EF4444" }}>
        Failed to load acceleration spectrum.
      </div>
    );
  }

  if (!anyData) {
    return (
      <div style={{ marginTop: 24, color: "#9CA3AF" }}>
        No acceleration spectrum data available.
      </div>
    );
  }

  // Build Plotly traces
  const traces: any[] = [];

  if (d1.data) {
    traces.push({
      x: d1.data.freqs,
      y: d1.data.amps,
      type: "scatter",
      mode: "lines",
      name: "Vertical",
      line: { color: "#22C55E", width: 1.3 },
      hovertemplate: "Vertical<br>f = %{x:.2f} Hz<br>Acc = %{y:.3f} g",
    });
  }

  if (d2.data) {
    traces.push({
      x: d2.data.freqs,
      y: d2.data.amps,
      type: "scatter",
      mode: "lines",
      name: "Horizontal",
      line: { color: "#FACC15", width: 1.2 },
      hovertemplate: "Horizontal<br>f = %{x:.2f} Hz<br>Acc = %{y:.3f} g",
    });
  }

  if (d3.data) {
    traces.push({
      x: d3.data.freqs,
      y: d3.data.amps,
      type: "scatter",
      mode: "lines",
      name: "Axial",
      line: { color: "#6366F1", width: 1.2 },
      hovertemplate: "Axial<br>f = %{x:.2f} Hz<br>Acc = %{y:.3f} g",
    });
  }

  // Determine overall max frequency across all directions
  const maxFreq = Math.max(
    d1.data?.freqs[d1.data.freqs.length - 1] || 0,
    d2.data?.freqs[d2.data.freqs.length - 1] || 0,
    d3.data?.freqs[d3.data?.freqs.length - 1] || 0
  );

  const initMax = maxFreq > 0 ? Math.min(1000, maxFreq) : 1000;

  return (
      <div style={{ marginTop: 32 }}>
        {/* Header */}
        <div
          style={{
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, color: "#9CA3AF" }}>
          </div>
        </div>
  
      <div
    style={{
      flex: 2,
      minWidth: 260,
      padding: "12px 14px",
      borderRadius: 8,
      backgroundColor: "#020617",
      border: "1px solid #1E293B",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      color: "#E5E7EB",
    }}
  >
    {/* Title */}
    <div style={{ fontSize: 20, fontWeight: 600, color: "#F3F4F6" }}>
      Acceleration Spectrum
    </div>
  
    {/* Plotly Spectrum */}
    <Plot
      data={traces}
      layout={{
        autosize: true,
        height: 350,
        margin: { l: 55, r: 20, t: 10, b: 45 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        xaxis: {
          title: "Frequency (Hz)",
          color: "#9CA3AF",
          gridcolor: "#1F2937",
          zeroline: false,
          range: [0, initMax],
        },
        yaxis: {
          title: "Velocity (mm/s)",
          color: "#9CA3AF",
          gridcolor: "#1F2937",
          zeroline: false,
        },
        legend: {
          orientation: "v",
          x: 0.9,
          y: 0.8,
          font: { size: 13, color: "#E5E7EB" },
        },
        hovermode: "closest",
      }}
      config={{
        displaylogo: false,
        responsive: true,
        scrollZoom: true,
        doubleClick: "reset",
        modeBarButtonsToRemove: [
          "lasso2d",
          "select2d",
          "toggleSpikelines",
        ],
      }}
      style={{ width: "100%", height: "100%" }}
    />
  </div>
  
      </div>
    );
  }