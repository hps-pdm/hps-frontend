"use client";

import Plot from "react-plotly.js";

type HistoryPoint = {
  date: string;
  rms_vel_d1: number;
  rms_vel_d2: number;
  rms_vel_d3: number;
};

type Thresholds = {
  ok: number;
  warn: number;
} | null;

export default function TrendPlot({
  data,
  thresholds = null,
}: {
  data: HistoryPoint[];
  thresholds?: Thresholds;
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "#9ca3af" }}>
        No trend data available.
      </div>
    );
  }

  const times = data.map((d) => d.date);

  const shapes = [];
  const annotations = [];
  if (thresholds) {
    const x0 = times[0];
    const x1 = times[times.length - 1];
    // OK band (0 -> ok)
    shapes.push({
      type: "rect",
      x0,
      x1,
      y0: 0,
      y1: thresholds.ok,
      xref: "x",
      yref: "y",
      fillcolor: "rgba(34,197,94,0.06)", // greenish
      line: { width: 0 },
    });
    // Warning band (ok -> warn)
    shapes.push({
      type: "rect",
      x0,
      x1,
      y0: thresholds.ok,
      y1: thresholds.warn,
      xref: "x",
      yref: "y",
      fillcolor: "rgba(250,204,21,0.06)", // amber
      line: { width: 0 },
    });
    shapes.push({
      type: "line",
      x0,
      x1,
      y0: thresholds.ok,
      y1: thresholds.ok,
      xref: "x",
      yref: "y",
      line: { color: "rgba(34,197,94,0.9)", dash: "dot", width: 2 },
    });
    shapes.push({
      type: "line",
      x0,
      x1,
      y0: thresholds.warn,
      y1: thresholds.warn,
      xref: "x",
      yref: "y",
      line: { color: "rgba(250,204,21,0.9)", dash: "dot", width: 2 },
    });
    annotations.push(
      {
        x: x1,
        y: thresholds.ok,
        xanchor: "left",
        yanchor: "bottom",
        text: thresholds.ok.toFixed(2),
        showarrow: false,
        font: { color: "rgba(34,197,94,0.9)", size: 10 },
        bgcolor: "rgba(15,23,42,0.6)",
        borderpad: 2,
      },
      {
        x: x1,
        y: thresholds.warn,
        xanchor: "left",
        yanchor: "bottom",
        text: thresholds.warn.toFixed(2),
        showarrow: false,
        font: { color: "rgba(250,204,21,0.9)", size: 10 },
        bgcolor: "rgba(15,23,42,0.6)",
        borderpad: 2,
      }
    );
  }

  // Filled bands under each series for better visibility
  const filledTraces = [
    {
      x: times,
      y: data.map((d) => d.rms_vel_d1),
      mode: "lines",
      name: "V",
      line: { color: "rgba(217,70,239,1)", width: 2 },
      fill: "tozeroy",
      fillcolor: "rgba(217,70,239,0.08)",
      hoverinfo: "x+y+name",
    },
    {
      x: times,
      y: data.map((d) => d.rms_vel_d2),
      mode: "lines",
      name: "H",
      line: { color: "rgba(96,165,250,1)", width: 2 },
      fill: "tozeroy",
      fillcolor: "rgba(96,165,250,0.08)",
      hoverinfo: "x+y+name",
    },
    {
      x: times,
      y: data.map((d) => d.rms_vel_d3),
      mode: "lines",
      name: "A",
      line: { color: "rgba(203,213,225,1)", width: 2 },
      fill: "tozeroy",
      fillcolor: "rgba(203,213,225,0.08)",
      hoverinfo: "x+y+name",
    },
  ];

  // Explicit threshold line traces (so they always render)
  const thresholdTraces =
    thresholds
      ? [
          {
            x: [times[0], times[times.length - 1]],
            y: [thresholds.ok, thresholds.ok],
            mode: "lines",
            name: "OK thr",
            showlegend: false,
            hoverinfo: "skip",
            line: { color: "rgba(34,197,94,0.9)", dash: "dot", width: 2 },
          },
          {
            x: [times[0], times[times.length - 1]],
            y: [thresholds.warn, thresholds.warn],
            mode: "lines",
            name: "Warn thr",
            showlegend: false,
            hoverinfo: "skip",
            line: { color: "rgba(250,204,21,0.9)", dash: "dot", width: 2 },
          },
        ]
      : [];

  return (
    <Plot
      data={[...filledTraces, ...thresholdTraces]}
      layout={{
        autosize: true,
        height: 240,
        margin: { l: 50, r: 10, t: 24, b: 32 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#e5e7eb" },
        xaxis: {
          title: "Date",
          type: "date",
          gridcolor: "rgba(148,163,184,0.2)",
        },
        yaxis: {
          title: "Velocity [mm/s]",
          gridcolor: "rgba(148,163,184,0.2)",
        },
        shapes,
        legend: {
          orientation: "h",
          x: 0,
          xanchor: "left",
          y: 1.15,
        },
        annotations,
      }}
      config={{
        displaylogo: false,
        responsive: true,
        modeBarButtonsToRemove: ["toImage"],
      }}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
