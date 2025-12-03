"use client";

import { memo, useMemo } from "react";
import Plot from "./charts/_Plot";

export default memo(function SpectrumPlot({
  frequencies,
  amplitudes,
  rpmHz,
  title
}: {
  frequencies: number[];
  amplitudes: number[];
  rpmHz?: number;
  title?: string;
}) {
  const shapes = useMemo(() => {
    if (!rpmHz) return [];
    return [1,2,3,4].map(n => ({
      type: "line" as const, x0: n*rpmHz, x1: n*rpmHz, y0: 0, y1: 1,
      xref: "x", yref: "paper", line: { dash: "dot", width: 1 }
    }));
  }, [rpmHz]);

  const data = useMemo(() => ([
    { x: frequencies, y: amplitudes, type: "scattergl" as const, mode: "lines", name: "Velocity Spectrum", line: { simplify: true } }
  ]), [frequencies, amplitudes]);

  const layout = useMemo(() => ({
    title: title ?? "",
    uirevision: "keep",
    autosize: true, margin: { l: 50, r: 20, t: 10, b: 40 },
    xaxis: { title: "Frequency [Hz]" },
    yaxis: { title: "Velocity [in/s]" },
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    shapes
  }), [title, shapes]);

  return (
    <div className="card">
      <Plot
        data={data}
        layout={layout as any}
        style={{ width: "100%", height: 420 }}
        config={{ displayModeBar: false, responsive: true }}
      />
    </div>
  );
});
