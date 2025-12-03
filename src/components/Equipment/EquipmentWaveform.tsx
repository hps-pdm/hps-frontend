"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEquipmentWaveform } from "../../lib/queries";

type WaveformPoint = {
  t: number;
  y: number;
};

export default function EquipmentWaveform({ sn }: { sn: string }) {
  const [dir, setDir] = useState<number>(0); // 0 = auto, 1/2/3 = explicit

  const {
    data,
    isLoading,
    error,
  } = useEquipmentWaveform(sn, dir);

  const { points, sampleRate, actualDir } = useMemo(() => {
    if (!data || !data.signal || !Array.isArray(data.signal) || !data.sampleRate) {
      return { points: [] as WaveformPoint[], sampleRate: null as number | null, actualDir: data?.direction ?? null };
    }

    const sr = Number(data.sampleRate) || 0;
    const sig = data.signal as number[];
    const pts: WaveformPoint[] = sig.map((y: number, i: number) => ({
      t: sr > 0 ? i / sr : i,
      y,
    }));

    return { points: pts, sampleRate: sr, actualDir: data.direction ?? null };
  }, [data]);

  if (isLoading) {
    return <div style={{ marginTop: 24 }}>Loading waveform…</div>;
  }

  if (error || !data) {
    return (
      <div style={{ marginTop: 24, color: "#EF4444" }}>
        Failed to load waveform.
      </div>
    );
  }

  if (!points.length) {
    return (
      <div style={{ marginTop: 24, color: "#9CA3AF" }}>
        No waveform data available.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 32 }}>
      <div
        style={{
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>Waveform</h3>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ color: "#9CA3AF" }}>Direction:</span>
          {["Auto", "D1", "D2", "D3"].map((label, idx) => {
            const value = idx === 0 ? 0 : idx; // 0,1,2,3
            const isActive = dir === value;
            return (
              <button
                key={label}
                onClick={() => setDir(value)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: isActive ? "1px solid #10B981" : "1px solid #374151",
                  backgroundColor: isActive ? "#064E3B" : "#020617",
                  color: isActive ? "#ECFDF5" : "#E5E7EB",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {label}
              </button>
            );
          })}
          {actualDir && (
            <span style={{ color: "#9CA3AF" }}>
              (showing D{actualDir})
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          height: 260,
          padding: 12,
          borderRadius: 8,
          backgroundColor: "#020617",
          border: "1px solid #1E293B",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              label={{
                value: "Time (s)",
                position: "insideBottomRight",
                offset: -4,
                fill: "#9CA3AF",
                fontSize: 11,
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9CA3AF" }}
              label={{
                value: "Acceleration (g)",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                fill: "#9CA3AF",
                fontSize: 11,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #334155",
                fontSize: 12,
              }}
              labelFormatter={(v) => `t = ${Number(v).toFixed(4)} s`}
              formatter={(value: any) => [`${Number(value).toFixed(4)} g`, "Acc"]}
            />
            <Line
              type="monotone"
              dataKey="y"
              dot={false}
              stroke="#38BDF8"
              strokeWidth={1}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF" }}>
        Sample rate: {sampleRate ?? "–"} Hz · Points: {points.length}
      </div>
    </div>
  );
}
