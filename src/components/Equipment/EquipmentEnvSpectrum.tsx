// src/components/equipment/EquipmentEnvSpectrum.tsx
"use client";

import { useMemo } from "react";
import Plot from "react-plotly.js";
import { useEquipmentEnvSpectrum } from "../../lib/queries";

type SpectrumData = {
  freqs: number[];
  amps: number[];
};

function useDirEnvSpectrum(
  sn: string,
  dir: number,
  maxN: number
): {
  data: SpectrumData | null;
  loading: boolean;
  error: boolean;
} {
  const { data, isLoading, error } = useEquipmentEnvSpectrum(sn, dir, maxN);

  const shaped = useMemo(() => {
    if (!data || !Array.isArray(data.frequencies) || !Array.isArray(data.fft_env)) {
      return null;
    }
    return {
      freqs: data.frequencies as number[],
      amps: data.fft_env as number[],
    };
  }, [data]);

  return {
    data: shaped,
    loading: isLoading,
    error: !!error,
  };
}

const DIR_LABELS: Record<number, string> = {
  1: "Vertical",
  2: "Horizontal",
  3: "Axial",
};

export default function EquipmentEnvSpectrum({ sn }: { sn: string }) {
  const maxN = 4096;

  // Load envelope spectrum for each direction explicitly
  const d1 = useDirEnvSpectrum(sn, 1, maxN);
  const d2 = useDirEnvSpectrum(sn, 2, maxN);
  const d3 = useDirEnvSpectrum(sn, 3, maxN);

  const anyLoading = d1.loading || d2.loading || d3.loading;
  const anyData =
    (d1.data && d1.data.freqs.length) ||
    (d2.data && d2.data.freqs.length) ||
    (d3.data && d3.data.freqs.length);
  const allError = !anyLoading && !anyData;

  if (anyLoading) {
    return <div style={{ marginTop: 24 }}>Loading envelope spectrum…</div>;
  }

  if (allError) {
    return (
      <div style={{ marginTop: 24, color: "#EF4444" }}>
        Failed to load envelope spectrum.
      </div>
    );
  }

  if (!anyData) {
    return (
      <div style={{ marginTop: 24, color: "#9CA3AF" }}>
        No envelope spectrum data available.
      </div>
    );
  }

  const traces: any[] = [];

  if (d1.data) {
    traces.push({
      x: d1.data.freqs,
      y: d1.data.amps,
      type: "scatter",
      mode: "lines",
      name: DIR_LABELS[1],
      line: { color: "#22C55E", width: 1.3 },
      hovertemplate: `${DIR_LABELS[1]}<br>f = %{x:.2f} Hz<br>Env = %{y:.3f}`,
    });
  }

  if (d2.data) {
    traces.push({
      x: d2.data.freqs,
      y: d2.data.amps,
      type: "scatter",
      mode: "lines",
      name: DIR_LABELS[2],
      line: { color: "#FACC15", width: 1.2 },
      hovertemplate: `${DIR_LABELS[2]}<br>f = %{x:.2f} Hz<br>Env = %{y:.3f}`,
    });
  }

  if (d3.data) {
    traces.push({
      x: d3.data.freqs,
      y: d3.data.amps,
      type: "scatter",
      mode: "lines",
      name: DIR_LABELS[3],
      line: { color: "#6366F1", width: 1.2 },
      hovertemplate: `${DIR_LABELS[3]}<br>f = %{x:.2f} Hz<br>Env = %{y:.3f}`,
    });
  }

  const maxFreq = Math.max(
    d1.data?.freqs[d1.data.freqs.length - 1] || 0,
    d2.data?.freqs[d2.data.freqs.length - 1] || 0,
    d3.data?.freqs[d3.data?.freqs.length - 1] || 0
  );

  const initMax = maxFreq > 0 ? Math.min(1000, maxFreq) : 1000;

  return (
    <div style={{ marginTop: 32 }}>
      <div
        style={{
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h3 style={{ margin: 0 }}>Envelope Spectrum (Acceleration)</h3>
        <div style={{ fontSize: 13, color: "#9CA3AF" }}>
          All directions overlaid (Vertical, Horizontal, Axial) · Initial view 0–1000 Hz
        </div>
      </div>

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
            title: "Envelope amplitude",
            color: "#9CA3AF",
            gridcolor: "#1F2937",
            zeroline: false,
          },
          legend: {
            orientation: "h",
            x: 0,
            y: 1.02,
            font: { size: 11, color: "#E5E7EB" },
          },
          hovermode: "closest",
        }}
        config={{
          displaylogo: false,
          responsive: true,
          scrollZoom: true,
          doubleClick: "reset",
          modeBarButtonsToRemove: ["lasso2d", "select2d", "toggleSpikelines"],
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
