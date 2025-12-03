"use client";

import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { useEquipmentSpectrum } from "../../lib/queries";

type SpectrumData = {
  freqs: number[];
  amps: number[];
  bpfi?: number;
  bpfo?: number;
  carrierHz?: number;
};

// ---------------- Helper functions ----------------

function findNearestIndex(freqs: number[], target: number): number {
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < freqs.length; i++) {
    const diff = Math.abs(freqs[i] - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// Very simple harmonic-scoring fundamental detector
function detectFundamental(freqs: number[], amps: number[]): number {
  if (!freqs.length) return 30;

  const minF = 5;
  const maxF = 120;
  const maxFreq = freqs[freqs.length - 1];
  const nHarm = 6;

  let bestF = 30;
  let bestScore = -Infinity;

  for (let i = 0; i < freqs.length; i++) {
    const f0 = freqs[i];
    if (f0 < minF || f0 > maxF) continue;

    let score = 0;
    for (let k = 1; k <= nHarm; k++) {
      const target = f0 * k;
      if (target > maxFreq) break;
      const idx = findNearestIndex(freqs, target);
      score += Math.max(amps[idx], 0);
    }

    if (score > bestScore) {
      bestScore = score;
      bestF = f0;
    }
  }

  return bestF;
}

// ---------------- Hook for one direction ----------------

function useDirSpectrum(
  sn: string,
  dir: number,
  maxN: number
): {
  data: SpectrumData | null;
  loading: boolean;
  error: boolean;
} {
  const { data, isLoading, error } = useEquipmentSpectrum(sn, dir, maxN);

  const shaped = useMemo(() => {
    if (
      !data ||
      !Array.isArray(data.frequencies) ||
      !Array.isArray(data.fft_vel)
    ) {
      return null;
    }

    const freqs = (data.frequencies as any[]).map(Number);
    const amps = (data.fft_vel as any[]).map(Number);

    const anyData: any = data;
    const bpfi =
      anyData.bpfi_hz ?? anyData.BPFI_hz ?? anyData.bpfi ?? undefined;
    const bpfo =
      anyData.bpfo_hz ?? anyData.BPFO_hz ?? anyData.bpfo ?? undefined;
    const carrierHz =
      anyData.carrier_hz ??
      anyData.carrierHz ??
      bpfi ??
      bpfo ??
      undefined;

    return {
      freqs,
      amps,
      bpfi: typeof bpfi === "number" ? bpfi : undefined,
      bpfo: typeof bpfo === "number" ? bpfo : undefined,
      carrierHz: typeof carrierHz === "number" ? carrierHz : undefined,
    };
  }, [data]);

  return {
    data: shaped,
    loading: isLoading,
    error: !!error,
  };
}

// ---------------- Main component ----------------

export default function EquipmentSpectrum({ sn }: { sn: string }) {
  const maxN = 4096;

  // ---- HOOKS (must be at top, no early returns above) ----

  const d1 = useDirSpectrum(sn, 1, maxN);
  const d2 = useDirSpectrum(sn, 2, maxN);
  const d3 = useDirSpectrum(sn, 3, maxN);

  // pick base spectrum (highest energy) for analytics
  const baseSpectrum: SpectrumData | null = useMemo(() => {
    const candidates = [d1.data, d2.data, d3.data].filter(
      (d): d is SpectrumData => !!d
    );
    if (!candidates.length) return null;

    let best = candidates[0];
    let bestScore = best.amps.reduce((s, v) => s + v * v, 0);

    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i];
      const score = c.amps.reduce((s, v) => s + v * v, 0);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }, [d1.data, d2.data, d3.data]);

  // draggable harmonic / carrier / sideband state
  const [f0, setF0] = useState<number>(30); // fundamental
  const [carrier, setCarrier] = useState<number>(77); // carrier (init ~77 Hz)
  const [sidebandDelta, setSidebandDelta] = useState<number>(30); // Δf

  const [f0Initialized, setF0Initialized] = useState(false);
  const [carrierInitialized, setCarrierInitialized] = useState(false);

  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);

  const [showHarmonics, setShowHarmonics] = useState(true);
  const [showSidebands, setShowSidebands] = useState(true);
  const [showCarrier, setShowCarrier] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const nHarmonics = 8;
  const nSidebands = 3;
  const TOL = 1e-6;

  // ---- Auto-init f0 and carrier from data (run once) ----

  useEffect(() => {
    if (!baseSpectrum) return;

    if (!f0Initialized) {
      const guess = detectFundamental(baseSpectrum.freqs, baseSpectrum.amps);
      if (isFinite(guess) && guess > 0) setF0(guess);
      setF0Initialized(true);
    }

    if (!carrierInitialized) {
      let cGuess =
        baseSpectrum.carrierHz ??
        baseSpectrum.bpfi ??
        baseSpectrum.bpfo ??
        77;
      if (!isFinite(cGuess) || cGuess <= 0) cGuess = 77;
      setCarrier(cGuess);
      setCarrierInitialized(true);
    }
  }, [baseSpectrum, f0Initialized, carrierInitialized]);

  // ---- Build shapes + annotations (harmonics, carrier, sidebands) ----

  const { shapes, annotations } = useMemo(() => {
    const s: any[] = [];
    const a: any[] = [];

    let shapeIndex = 0;

    // HARMONICS (including fundamental)
    for (let i = 0; i < nHarmonics; i++) {
      const order = i + 1;
      const x = order * f0;

      const isFundamental = i === 0;
      const visible = isFundamental || showHarmonics;
      const isHighlighted = highlightIdx === shapeIndex;

      s.push({
        type: "line",
        xref: "x",
        yref: "paper",
        x0: x,
        x1: x,
        y0: 0,
        y1: 1,
        visible,
        line: isFundamental
          ? {
              color: isHighlighted ? "#fb923c" : "#f97316",
              width: isHighlighted ? 3 : 2,
            }
          : {
              color: isHighlighted ? "#fde047" : "#facc15",
              width: isHighlighted ? 2 : 1,
              dash: "dot",
            },
      });

      if (showLabels && visible) {
        const labelColor = isFundamental ? "#F97316" : "#FACC15";
        const labelText = isFundamental
          ? `f₀\n${x.toFixed(1)} Hz`
          : `${order}x\n${x.toFixed(1)} Hz`;

        a.push({
          x,
          y: 1.02,
          xref: "x",
          yref: "paper",
          text: labelText,
          showarrow: false,
          font: { size: 8, color: labelColor },
          textangle: -90,
          xanchor: "center",
          xshift: 6,
        });
      }

      shapeIndex++;
    }

    // CARRIER
    const carrierShapeIndex = shapeIndex;
    const carrierVisible = showCarrier;
    const carrierHighlighted = highlightIdx === carrierShapeIndex;

    s.push({
      type: "line",
      xref: "x",
      yref: "paper",
      x0: carrier,
      x1: carrier,
      y0: 0,
      y1: 1,
      visible: carrierVisible,
      line: {
        color: carrierHighlighted ? "#4ade80" : "#22c55e",
        width: carrierHighlighted ? 3 : 2,
      },
    });

    if (showLabels && carrierVisible) {
      a.push({
        x: carrier,
        y: 1.06,
        xref: "x",
        yref: "paper",
        text: `fᶜ\n${carrier.toFixed(1)} Hz`,
        showarrow: false,
        font: { size: 9, color: "#22C55E" },
        textangle: -90,
        xanchor: "center",
        xshift: 8,
      });
    }

    shapeIndex++;

    // SIDEBANDS
    for (let k = 1; k <= nSidebands; k++) {
      const plus = carrier + k * sidebandDelta;
      const minus = carrier - k * sidebandDelta;

      const plusIdx = shapeIndex;
      const minusIdx = shapeIndex + 1;

      const plusHighlighted = highlightIdx === plusIdx;
      const minusHighlighted = highlightIdx === minusIdx;

      // fᶜ + kΔf
      s.push({
        type: "line",
        xref: "x",
        yref: "paper",
        x0: plus,
        x1: plus,
        y0: 0,
        y1: 1,
        visible: showSidebands,
        line: {
          color: plusHighlighted ? "#7dd3fc" : "#38bdf8",
          width: plusHighlighted ? 2 : 1,
          dash: "dash",
        },
      });

      if (showLabels && showSidebands) {
        a.push({
          x: plus,
          y: 1.03,
          xref: "x",
          yref: "paper",
          text: `fᶜ+${k}Δf\n${plus.toFixed(1)} Hz`,
          showarrow: false,
          font: { size: 8, color: "#38BDF8" },
          textangle: -90,
          xanchor: "center",
          xshift: 6,
        });
      }

      // fᶜ - kΔf
      s.push({
        type: "line",
        xref: "x",
        yref: "paper",
        x0: minus,
        x1: minus,
        y0: 0,
        y1: 1,
        visible: showSidebands,
        line: {
          color: minusHighlighted ? "#7dd3fc" : "#38bdf8",
          width: minusHighlighted ? 2 : 1,
          dash: "dash",
        },
      });

      if (showLabels && showSidebands) {
        a.push({
          x: minus,
          y: 1.03,
          xref: "x",
          yref: "paper",
          text: `fᶜ-${k}Δf\n${minus.toFixed(1)} Hz`,
          showarrow: false,
          font: { size: 8, color: "#38BDF8" },
          textangle: -90,
          xanchor: "center",
          xshift: 6,
        });
      }

      shapeIndex += 2;
    }

    return { shapes: s, annotations: a };
  }, [
    f0,
    carrier,
    sidebandDelta,
    showCarrier,
    showSidebands,
    showHarmonics,
    showLabels,
    nHarmonics,
    nSidebands,
    highlightIdx,
  ]);

  const carrierIndex = nHarmonics;

  // ---- Handle draggable lines (relayout) ----

  const handleRelayout = (ev: any) => {
    let newF0 = f0;
    let newCarrier = carrier;
    let newDelta = sidebandDelta;
    let changed = false;

    try {
      Object.entries(ev).forEach(([key, value]) => {
        const match = key.match(/^shapes\[(\d+)\]\.x0$/);
        if (!match) return;

        const idx = Number(match[1]);
        const x = typeof value === "number" ? value : NaN;
        if (!isFinite(x)) return;

        if (idx < nHarmonics) {
          // Dragged harmonic (including fundamental)
          const order = idx + 1;
          const candidate = x / order;
          if (candidate > 0 && Math.abs(candidate - newF0) > TOL) {
            newF0 = candidate;
            changed = true;
          }
        } else if (idx === carrierIndex) {
          if (Math.abs(x - newCarrier) > TOL) {
            newCarrier = x;
            changed = true;
          }
        } else if (idx > carrierIndex) {
          const sbRaw = idx - (carrierIndex + 1); // 0..2*nSidebands-1
          const k = Math.floor(sbRaw / 2) + 1;
          const candidate = Math.abs(x - newCarrier) / k;
          if (candidate > 0 && Math.abs(candidate - newDelta) > TOL) {
            newDelta = candidate;
            changed = true;
          }
        }
      });

      if (changed) {
        setF0(newF0);
        setCarrier(newCarrier);
        setSidebandDelta(newDelta);
      }
    } catch (err) {
      console.error("Error in onRelayout for EquipmentSpectrum:", err);
    }
  };

  // ---- Hover highlight: nearest line to cursor ----

  const handleHover = (ev: any) => {
    try {
      const pt = ev?.points?.[0];
      if (!pt) return;
      const x = typeof pt.x === "number" ? pt.x : NaN;
      if (!isFinite(x)) return;

      const candidates: { idx: number; freq: number }[] = [];

      // harmonics
      for (let i = 0; i < nHarmonics; i++) {
        const order = i + 1;
        candidates.push({ idx: i, freq: f0 * order });
      }

      // carrier
      candidates.push({ idx: carrierIndex, freq: carrier });

      // sidebands
      let sbIdx = carrierIndex + 1;
      for (let k = 1; k <= nSidebands; k++) {
        candidates.push({
          idx: sbIdx++,
          freq: carrier + k * sidebandDelta,
        });
        candidates.push({
          idx: sbIdx++,
          freq: carrier - k * sidebandDelta,
        });
      }

      let bestIdx: number | null = null;
      let bestDiff = Infinity;
      for (const c of candidates) {
        const d = Math.abs(c.freq - x);
        if (d < bestDiff) {
          bestDiff = d;
          bestIdx = c.idx;
        }
      }

      setHighlightIdx(bestIdx);
    } catch (err) {
      console.error("Error in onHover for EquipmentSpectrum:", err);
    }
  };

  const handleUnhover = () => setHighlightIdx(null);

  // ---- After hooks: now handle loading / errors ----

  const anyLoading = d1.loading || d2.loading || d3.loading;
  const anyData =
    (d1.data && d1.data.freqs.length) ||
    (d2.data && d2.data.freqs.length) ||
    (d3.data && d3.data.freqs.length);
  const allError = !anyLoading && !anyData;

  if (anyLoading) {
    return <div style={{ marginTop: 24 }}>Loading spectrum…</div>;
  }

  if (allError || !anyData) {
    return (
      <div style={{ marginTop: 24, color: allError ? "#EF4444" : "#9CA3AF" }}>
        {allError ? "Failed to load spectrum." : "No spectrum data available."}
      </div>
    );
  }

  // ---- Build traces (velocity spectrum + harmonic markers) ----

  const traces: any[] = [];

  if (d1.data) {
    traces.push({
      x: d1.data.freqs,
      y: d1.data.amps,
      type: "scatter",
      mode: "lines",
      name: "Vertical",
      line: { color: "#22C55E", width: 1.3 },
      hovertemplate: "Vertical<br>f = %{x:.2f} Hz<br>Vel = %{y:.3f} mm/s",
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
      hovertemplate: "Horizontal<br>f = %{x:.2f} Hz<br>Vel = %{y:.3f} mm/s",
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
      hovertemplate: "Axial<br>f = %{x:.2f} Hz<br>Vel = %{y:.3f} mm/s",
    });
  }

  // harmonic intensity markers on base spectrum
  if (baseSpectrum) {
    const markerXs: number[] = [];
    const markerYs: number[] = [];
    const maxFreq = baseSpectrum.freqs[baseSpectrum.freqs.length - 1];

    for (let order = 1; order <= nHarmonics; order++) {
      const target = order * f0;
      if (target > maxFreq) break;
      const idx = findNearestIndex(baseSpectrum.freqs, target);
      markerXs.push(baseSpectrum.freqs[idx]);
      markerYs.push(baseSpectrum.amps[idx]);
    }

    if (markerXs.length) {
      traces.push({
        x: markerXs,
        y: markerYs,
        type: "scatter",
        mode: "markers",
        name: "Harmonic intensity",
        marker: {
          size: 8,
          symbol: "circle-open",
          line: { width: 1.5 },
        },
        hovertemplate: "Harmonic<br>f = %{x:.2f} Hz<br>Amp = %{y:.3f}",
        showlegend: false,
      });
    }
  }

  const maxFreq = Math.max(
    d1.data?.freqs[d1.data.freqs.length - 1] || 0,
    d2.data?.freqs[d2.data.freqs.length - 1] || 0,
    d3.data?.freqs[d3.data.freqs.length - 1] || 0
  );
  const initMax = maxFreq > 0 ? Math.min(1000, maxFreq) : 1000;

  // ---- Render ----

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
        <div style={{ fontSize: 13, color: "#9CA3AF" }}>
          f₀ = {f0.toFixed(2)} Hz | fᶜ = {carrier.toFixed(2)} Hz | Δf ={" "}
          {sidebandDelta.toFixed(2)} Hz
        </div>

        <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={showHarmonics}
              onChange={(e) => setShowHarmonics(e.target.checked)}
            />
            &nbsp;Harmonics
          </label>
          <label>
            <input
              type="checkbox"
              checked={showSidebands}
              onChange={(e) => setShowSidebands(e.target.checked)}
            />
            &nbsp;Sidebands
          </label>
          <label>
            <input
              type="checkbox"
              checked={showCarrier}
              onChange={(e) => setShowCarrier(e.target.checked)}
            />
            &nbsp;Carrier
          </label>
          <label>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            &nbsp;Labels
          </label>
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
        <div style={{ fontSize: 20, fontWeight: 600, color: "#F3F4F6" }}>
          Velocity Spectrum (Draggable Harmonics & Sidebands)
        </div>

        <Plot
          data={traces}
          layout={{
            autosize: true,
            height: 350,
            margin: { l: 55, r: 20, t: 32, b: 48 },
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
            shapes,
            annotations,
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
            editable: true,
            edits: { shapePosition: true },
          }}
          style={{ width: "100%", height: "100%" }}
          onRelayout={handleRelayout}
          onHover={handleHover}
          onUnhover={handleUnhover}
        />
      </div>
    </div>
  );
}
