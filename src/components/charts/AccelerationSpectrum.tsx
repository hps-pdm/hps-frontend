"use client";

import Plot from "react-plotly.js";

export default function AccelerationSpectrum({ data }: any) {
  if (!data) return <div>No acceleration spectrum available</div>;

  const { freq, vertical, horizontal, axial } = data;

  return (
    <Plot
      data={[
        {
          x: freq,
          y: vertical,
          type: "scatter",
          mode: "lines",
          name: "Vertical",
        },
        {
          x: freq,
          y: horizontal,
          type: "scatter",
          mode: "lines",
          name: "Horizontal",
        },
        {
          x: freq,
          y: axial,
          type: "scatter",
          mode: "lines",
          name: "Axial",
        }
      ]}
      layout={{
        title: "Acceleration Spectrum (g)",
        xaxis: { title: "Frequency (Hz)", range: [0, 1000] },
        yaxis: { title: "Amplitude (g)" },
        height: 500,
        showlegend: true,
        paper_bgcolor: "#111",
        plot_bgcolor: "#111",
        font: { color: "white" }
      }}
      config={{
        responsive: true,
        scrollZoom: true,
      }}
      style={{ width: "100%" }}
    />
  );
}
