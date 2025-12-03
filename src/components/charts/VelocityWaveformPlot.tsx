"use client";

import React, { useMemo } from "react";
import Plot from "react-plotly.js";
import { useVelocityWaveform } from "../../lib/queries";

type VelocityWaveformPlotProps = {
  sn: number;
  dir: number;  // 1,2,3
};

const DIR_LABELS: Record<number, string> = {
  1: "Vertical",
  2: "Horizontal",
  3: "Axial",
};

export default function VelocityWaveformPlot({ sn, dir }: VelocityWaveformPlotProps) {
  const { data, isLoading, error } = useVelocityWaveform(sn, dir);

  const { times, signal, sampleRate } = useMemo(() => {
    if (!data || !Array.isArray(data.signal) || !data.signal.length) {
      return { times: [] as number[], signal: [] as number[], sampleRate: 0 };
    }
    const sig: number[] = data.signal;
    const sr = Number(data.sampleRate) || 0;
    const t =
      sr > 0 ? sig.map((_, i) => i / sr) : sig.map((_, i) => i); // fallback to index
    return { times: t, signal: sig, sampleRate: sr };
  }, [data]);

  const hasData = signal.length > 0;

  return (
    <div>
      {isLoading && <div>Loading velocity waveform…</div>}
      {error && (
        <div style={{ color: "#f97373" }}>
          Failed to load velocity waveform: {(error as Error).message}
        </div>
      )}
      {!isLoading && !error && !hasData && (
        <div>No velocity waveform data available for this direction.</div>
      )}

      {!isLoading && !error && hasData && (
        <Plot
          data={[
            {
              x: times,
              y: signal,
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
            xaxis: {
              title: "Time [s]",
              showgrid: true,
              gridcolor: "rgba(55,65,81,0.6)",
              zeroline: false,
            },
            yaxis: {
              title: "Velocity [units]",
              showgrid: true,
              gridcolor: "rgba(55,65,81,0.6)",
              zeroline: false,
            },
            title: {
              text:``,
              x: 0,
              xanchor: "left",
              y: 0.98,
              yanchor: "top",
              font: { size: 13 },
            },
          }}
          style={{ width: "100%" }}
          config={{
            displaylogo: false,
            responsive: true,
            scrollZoom: true,
            modeBarButtonsToRemove: ["toImage"],
          }}
        />
      )}
    </div>
  );
}
