"use client";
import Plot from "react-plotly.js";

export default function RmsTrendPlot({ series }: { series: Array<any> }) {
  const t = series?.map(p => p.time);
  const v1 = series?.map(p => p.rms_vel_d1);
  const v2 = series?.map(p => p.rms_vel_d2);
  const v3 = series?.map(p => p.rms_vel_d3);
  return (
    <Plot
      data={[
        { x: t, y: v1, type: "scattergl", mode: "lines", name: "Vel d1 [in/s]" },
        { x: t, y: v2, type: "scattergl", mode: "lines", name: "Vel d2 [in/s]" },
        { x: t, y: v3, type: "scattergl", mode: "lines", name: "Vel d3 [in/s]" },
      ]}
      layout={{
        autosize: true, margin: { l: 50, r: 20, t: 10, b: 40 },
        xaxis: { title: "Time", type: "date" },
        yaxis: { title: "RMS Velocity [in/s]" },
        paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
        hovermode: "x unified",
      }}
      style={{ width: "100%", height: 380 }}
      config={{ displayModeBar: false, responsive: true }}
    />
  );
}
