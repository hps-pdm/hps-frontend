"use client";

import React, { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import FFT from "fft.js";
import { useEquipmentWaveform, useEquipmentDiagnostics } from "../../lib/queries";

type EnvelopePlotProps = {
  sn: number;
  dir: number;           // 1,2,3
  rangeHz: number | null;
  rpmHz?: number | null;
  onFundamentalChange?: (hz: number) => void;
};

const DIR_LABELS: Record<number, string> = {
  1: "Vertical",
  2: "Horizontal",
  3: "Axial",
};

// same computeEnvelopeSpectrum as before
function computeEnvelopeSpectrum(
  signal: number[],
  sampleRate: number
): { freqs: number[]; amps: number[] } {
  const N0 = signal.length;
  if (!N0 || !sampleRate || N0 < 16) {
    return { freqs: [], amps: [] };
  }

  let N = 1;
  while (N < N0) N <<= 1;

  const fft = new FFT(N);

  const input = fft.createComplexArray();
  const spectrum = fft.createComplexArray();

  for (let i = 0; i < N; i++) {
    input[2 * i] = i < N0 ? signal[i] : 0;
    input[2 * i + 1] = 0;
  }

  fft.transform(spectrum, input);

  const H = new Array<number>(N).fill(0);
  if (N % 2 === 0) {
    H[0] = 1;
    H[N / 2] = 1;
    for (let k = 1; k < N / 2; k++) H[k] = 2;
  } else {
    H[0] = 1;
    for (let k = 1; k < (N + 1) / 2; k++) H[k] = 2;
  }

  const hilbertSpec = fft.createComplexArray();
  for (let k = 0; k < N; k++) {
    const re = spectrum[2 * k];
    const im = spectrum[2 * k + 1];
    const h = H[k];
    hilbertSpec[2 * k] = re * h;
    hilbertSpec[2 * k + 1] = im * h;
  }

  const analytic = fft.createComplexArray();
  fft.inverseTransform(analytic, hilbertSpec);

  const env = new Array<number>(N);
  for (let i = 0; i < N; i++) {
    const re = analytic[2 * i] / N;
    const im = analytic[2 * i + 1] / N;
    env[i] = Math.sqrt(re * re + im * im);
  }

  const envIn = fft.createComplexArray();
  const envSpec = fft.createComplexArray();
  for (let i = 0; i < N; i++) {
    envIn[2 * i] = env[i];
    envIn[2 * i + 1] = 0;
  }
  fft.transform(envSpec, envIn);

  const half = Math.floor(N / 2);
  const freqs: number[] = [];
  const amps: number[] = [];
  for (let k = 0; k <= half; k++) {
    const re = envSpec[2 * k];
    const im = envSpec[2 * k + 1];
    const mag = (2 / N) * Math.sqrt(re * re + im * im);
    freqs.push((k * sampleRate) / N);
    amps.push(mag);
  }

  return { freqs, amps };
}

export default function EnvelopePlot({ sn, dir, rangeHz, rpmHz, onFundamentalChange }: EnvelopePlotProps) {
  const { data, isLoading, error } = useEquipmentWaveform(sn, dir);
  const { data: diag } = useEquipmentDiagnostics(sn);
  const [fundamentalOverride, setFundamentalOverride] = useState<number | null>(null);

  const { freqs, amps } = useMemo(() => {
    if (!data || !Array.isArray(data.signal) || !data.signal.length) {
      return { freqs: [] as number[], amps: [] as number[] };
    }
    const sig: number[] = data.signal;
    const sr = Number(data.sampleRate) || 0;
    return computeEnvelopeSpectrum(sig, sr);
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

  const fundamentalHz = useMemo(() => {
    const rpm = rpmHz ?? (diag as any)?.rpm_1x_hz ?? (diag as any)?.metrics?.rpm_1x_hz;
    if (rpm && rpm > 0) return rpm;
    if (!freqs.length || !amps.length) return null;
    let maxIdx = 0;
    for (let i = 1; i < freqs.length; i++) {
      if (amps[i] > amps[maxIdx]) maxIdx = i;
    }
    return freqs[maxIdx] ?? null;
  }, [diag, freqs, amps]);

  const effectiveFundamental = fundamentalOverride ?? fundamentalHz;

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
    const x0 =
      ev?.["shapes[0].x0"] ??
      ev?.["shapes[1].x0"] ??
      null;
    if (typeof x0 === "number" && isFinite(x0)) {
      setFundamentalOverride(x0);
      onFundamentalChange?.(x0);
    }
  };

  return (
    <div>
      {isLoading && <div>Loading envelope spectrum…</div>}
      {error && (
        <div style={{ color: "#f97373" }}>
          Failed to load envelope spectrum: {(error as Error).message}
        </div>
      )}
      {!isLoading && !error && !hasData && (
        <div>No envelope spectrum data available (waveform missing or too short).</div>
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
              name: DIR_LABELS[dir],
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
            uirevision: "env-spectrum-v1",
            xaxis: {
              title: "Frequency [Hz]",
              showgrid: true,
              gridcolor: "rgba(55,65,81,0.6)",
              zeroline: false,
            },
            yaxis: {
              title: "Envelope amplitude [units]",
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
            edits: { shapePosition: true },
          }}
          onRelayout={handleRelayout}
        />
      )}
    </div>
  );
}
