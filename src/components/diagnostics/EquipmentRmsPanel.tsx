// src/components/diagnostics/EquipmentRmsPanel.tsx

"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Props = {
  rmsVels?: number[];
  rmsAccs?: number[];
};

export default function EquipmentRmsPanel({ rmsVels, rmsAccs }: Props) {
  if (!rmsVels && !rmsAccs) {
    return (
      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
        No RMS values available.
      </div>
    );
  }

  const v = rmsVels ?? [];
  const a = rmsAccs ?? [];

  const data = [1, 2, 3].map((dir) => ({
    dirLabel: dir === 1 ? "V" : dir === 2 ? "H" : "A",
    vel: v[dir - 1] ?? 0,
    acc: a[dir - 1] ?? 0,
  }));

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
        RMS per direction (Velocity & Acceleration)
      </div>
      <div style={{ width: "100%", height: 120 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="dirLabel" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #4b5563",
                fontSize: 11,
              }}
              labelStyle={{ color: "#e5e7eb" }}
            />
            <Bar dataKey="vel" name="Vel" fill="#38bdf8" radius={[3, 3, 0, 0]} />
            <Bar dataKey="acc" name="Acc" fill="#a855f7" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
