// src/components/charts/ForecastGauge.tsx
import Plot from "react-plotly.js";

type Zone = {
  from: number;
  to: number;
  color: string;
};

export type ForecastGaugeProps = {
  sn: number | string;
  current: number | null;
  forecastLow: number | null;
  forecastHigh: number | null;
  min: number;
  max: number;
  zones: Zone[];
  title?: string;
  units?: string;
  barColor?: string;           // NEW: needle color
  forecastBandColor?: string;  // NEW: forecast band color
};

export function ForecastGauge({
  sn,
  current,
  forecastLow,
  forecastHigh,
  min,
  max,
  zones,
  title = "RMS Forecast",
  units = "",
  barColor,
  forecastBandColor,
}: ForecastGaugeProps) {
  const domain = { x: [0, 1], y: [0, 1] };

  const safeCurrent = current ?? 0;

  const baseGauge: any = {
    type: "indicator",
    mode: "gauge+number",
    value: safeCurrent,
    domain,
    title: {
      text: `${title}<br><span style="font-size:0.8em">SN ${sn}</span>`,
    },
    number: {
      suffix: units ? ` ${units}` : "",
      font: { size: 24 },
    },
    gauge: {
      shape: "angular",
      axis: { range: [min, max] },
      bar: { color: barColor || "blue" }, // use severity color if provided
      steps: zones.map((z) => ({
        range: [z.from, z.to],
        color: z.color,
      })),
    },
  };

  const hasForecastSlice =
    forecastLow != null &&
    forecastHigh != null &&
    forecastHigh > forecastLow;

  const forecastBand: any = hasForecastSlice
    ? {
        type: "indicator",
        mode: "gauge",
        value: forecastHigh,
        domain,
        gauge: {
          shape: "angular",
          axis: { range: [min, max] },
          bgcolor: "rgba(0,0,0,0)",
          bar: { color: "rgba(0,0,0,0)" },
          steps: [
            {
              range: [forecastLow, forecastHigh],
              color: forecastBandColor || "rgba(0, 0, 255, 0.35)",
            },
          ],
        },
        showlegend: false,
      }
    : null;

  const data = forecastBand ? [baseGauge, forecastBand] : [baseGauge];

  return (
    <Plot
      data={data}
      layout={{
        margin: { t: 40, r: 40, b: 20, l: 40 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
      }}
      config={{
        displaylogo: false,
        responsive: true,
      }}
      style={{ width: "100%", height: 260 }}
    />
  );
}
