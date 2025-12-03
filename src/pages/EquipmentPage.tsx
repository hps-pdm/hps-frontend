// src/pages/EquipmentPage.tsx
"use client";

import { useParams, Link } from "react-router-dom";
import EquipmentHeader from "../components/equipment/EquipmentHeader";
import EquipmentOverview from "../components/equipment/EquipmentOverview";
import EquipmentWaveform from "../components/equipment/EquipmentWaveform";
import EquipmentSpectrum from "../components/equipment/EquipmentSpectrum";
import EquipmentAccSpectrum from "../components/equipment/EquipmentAccSpectrum";
import EquipmentEnvSpectrum from "../components/equipment/EquipmentEnvSpectrum"; // 👈 NEW





export default function EquipmentPage() {
  const { sn } = useParams<{ sn: string }>();

  if (!sn) {
    return (
      <div className="container" style={{ padding: 20 }}>
        <p>Invalid equipment id.</p>
        <Link to="/summary" style={{ color: "#60A5FA" }}>
          ← Back to Summary
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 20 }}>
      <Link to="/summary" style={{ color: "#60A5FA" }}>
        ← Back to Summary
      </Link>

      <EquipmentHeader sn={sn} />
      <EquipmentOverview sn={sn} />
      <EquipmentWaveform sn={sn} />
      <EquipmentAccSpectrum sn={sn} />
      <EquipmentSpectrum sn={sn} />
      <EquipmentEnvSpectrum sn={sn} />   




      <div style={{ marginTop: 24, color: "#9CA3AF" }}>
        {/* Placeholder until we re-add tabs */}
        Equipment detail view is under construction…
      </div>
    </div>
  );
}
