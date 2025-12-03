"use client";

import React, { useMemo } from "react";
import Plot from "react-plotly.js";
import FFT from "fft.js";
import { useEquipmentWaveform } from "../../lib/queries";

type EnvelopeTimePlotProps = {
  sn: number;
  dir: number;  // 1,2,3
};

const DIR_LABELS: Record<number, string> = {
  1: "Vertical",
  2: "Horizontal",
  3: "Axial",
};

function computeEnvelopeTime(
  signal: number[],
  sampleRate: number
): { times: number[]; env: number[] } {
  const N0 = signal.length;
  if (!N0 || !sampleRate || N0 < 16) {
    return { times: [], env: [] };
  }

  // Zero-pad to next power-of-two for efficient FFT/Hilbert
  let N = 1;
  while (N < N0) N <<= 1;

  const fft = new FFT(N);

  // ---- Step 1: FFT(signal) ----
  const input = fft.createComplexArray();
  const spectrum = fft.createComplexArray();

  for (let i = 0; i < N; i++) {
    input[2 * i] = i < N0 ? signal[i] : 0;
    input[2 * i + 1] = 0;
  }

  fft.transform(spectrum, input);

  // ---- Step 2: Apply Hilbert filter H(k) ----
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

  // ---- Step 3: IFFT to get analytic signal ----
  const analytic = fft.createComplexArray();
  fft.inverseTransform(analytic, hilbertSpec);

  // FFT.js iFFT is unnormalized → divide by N
  const env = new Array<number>(N0);
  for (let i = 0; i < N0; i++) {
    const re = analytic[2 * i] / N;
    const im = analytic[2 * i + 1] / N;
    env[i] = Math.sqrt(re * re + im * im);
  }

  // ---- Step 4: time axis ----
  const times = env.map((_, i) => i / sampleRate);

  return { times, env };
}

export default function EnvelopeTimePlot({ sn, dir }: EnvelopeTimePlotProps) {
  const { data, isLoading, error } = useEquipmentWaveform(sn, dir);

  const { times, env } = useMemo(() => {
    if (!data || !Array.isArray(data.signal) || !data.signal.length) {
      return { times: [] as number[], env: [] as number[] };
    }
    const sig: number[] = data.signal;
    const sr = Number(data.sampleRate) || 0;
    return computeEnvelopeTime(sig, sr);
  }, [data]);

  const hasData = times.length > 0 && env.length > 0;

  return (
    <div>
      {isLoading && <div>Loading envelope time waveform…</div>}
      {error && (
        <div style={{ color: "#f97373" }}>
          Failed to load envelope time waveform: {(error as Error).message}
        </div>
      )}
      {!isLoading && !error && !hasData && (
        <div>No envelope time waveform available (waveform missing or too short).</div>
      )}

      {!isLoading && !error && hasData && (
        <Plot
          data={[
            {
              x: times,
              y: env,
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
            xaxis: {
              title: "Time [s]",
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
