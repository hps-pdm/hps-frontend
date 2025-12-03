// src/lib/queries.ts
import { useQuery } from "@tanstack/react-query";
import { fetchJSON } from "./api";
import type { DiagnosticsResponse } from "./types";
import {
  fetchEquipmentForecast,
  EquipmentForecastResponse,
} from "./api";
import { FleetDiagRow } from "../components/TopCriticalEquipment";


// ------------------------------------------------------------------
// Equipment list + bundle + history
// ------------------------------------------------------------------
export function useEquipment() {
  return useQuery({
    queryKey: ["equipment"],
    queryFn: () => fetchJSON("/api/equipment?debug=0"),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useBundle(
  sn: number,
  opts?: { live?: boolean; dir?: number }
) {
  return useQuery({
    queryKey: ["bundle", sn, opts?.live ?? 0, opts?.dir ?? 0],
    queryFn: () =>
      fetchJSON(
        `/api/bundle?sn=${sn}&spec=1&wfm=1&diag=1&live=${opts?.live ? 1 : 0}&dir=${
          opts?.dir ?? 0
        }`
      ),
    enabled: !!sn,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// optional type, adjust field names to match your backend
export type HistoryPoint = {
  date: string;   // or "ts" etc.
  rms_v: number;
  rms_h: number;
  rms_a: number;
};

export function useHistory(sn: number, since?: string) {
  const qs = since ? `&since=${encodeURIComponent(since)}` : "";
  return useQuery<HistoryPoint[]>({
    queryKey: ["history", sn, since ?? ""],
    queryFn: async () => {
      const res: any = await fetchJSON(`/api/history?sn=${sn}${qs}&limit=300`);

      // If backend returns an array directly:
      if (Array.isArray(res)) return res;

      // If backend wraps it in { items: [...] }:
      if (Array.isArray(res?.items)) return res.items;

      // Fallback: no data
      return [];
    },
    enabled: !!sn,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// ------------------------------------------------------------------
// Diagnostics: summary + fleet + per-equipment
// ------------------------------------------------------------------
export function useDiagnosticsSummary() {
  return useQuery({
    queryKey: ["diagnostics-summary"],
    queryFn: () => fetchJSON("/api/diagnostics/summary"),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export type FleetDiagnosticsResponse = {
  status: string;
  items: any[]; // raw items from API; we'll map them in SummaryPage
};

async function fetchFleetDiagnostics(): Promise<FleetDiagnosticsResponse> {
  const res = await fetch("/api/diagnostics/fleet");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching /api/diagnostics/fleet`);
  }
  return res.json();
}

export function useFleetDiagnostics() {
  return useQuery<FleetDiagnosticsResponse>({
    queryKey: ["fleet-diagnostics"],
    queryFn: fetchFleetDiagnostics,
    staleTime: 15_000,
  });
}

// Waveform + spectra
// ------------------------------------------------------------------
export function useEquipmentWaveform(
  sn: string | number | undefined,
  dir: number
) {
  return useQuery({
    queryKey: ["equipment-waveform", sn, dir],
    enabled: !!sn,
    queryFn: () => fetchJSON(`/api/waveform?sn=${sn}&dir=${dir}`),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useEquipmentSpectrum(
  sn: string | number | undefined,
  dir: number,
  maxN: number = 2048
) {
  return useQuery({
    queryKey: ["equipment-spectrum", sn, dir, maxN],
    enabled: !!sn,
    queryFn: () => {
      const params = new URLSearchParams({
        sn: String(sn),
        dir: String(dir),
        max_n: String(maxN),
      });
      return fetchJSON(`/api/spectrum?${params.toString()}`);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useEquipmentAccSpectrum(
  sn: string | number | undefined,
  dir: number,
  maxN: number = 2048
) {
  return useQuery({
    queryKey: ["equipment-acc-spectrum", sn, dir, maxN],
    enabled: !!sn,
    queryFn: () => {
      const params = new URLSearchParams({
        sn: String(sn),
        dir: String(dir),
        max_n: String(maxN),
      });
      return fetchJSON(`/api/spectrum_acc?${params.toString()}`);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// Envelope spectrum (Hilbert)
export function useEquipmentEnvSpectrum(
  sn: string | number | undefined,
  dir: number,
  maxN: number = 2048
) {
  return useQuery({
    queryKey: ["envSpectrum", sn, dir, maxN],
    enabled: !!sn,
    queryFn: () => {
      const params = new URLSearchParams({
        sn: String(sn),
        dir: String(dir),
        max_n: String(maxN),
      });
      return fetchJSON(`/api/spectrum_env?${params.toString()}`);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useVelocityWaveform(
  sn: string | number | undefined,
  dir: number
) {
  return useQuery({
    queryKey: ["velocity-waveform", sn, dir],
    enabled: !!sn,
    queryFn: () => fetchJSON(`/api/waveform_vel?sn=${sn}&dir=${dir}`),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useEquipmentDiagnostics(sn: number | undefined) {
  return useQuery<DiagnosticsResponse>({
    queryKey: ["diagnostics", sn],
    queryFn: () => fetchJSON(`/api/diagnostics?sn=${sn}`),
    enabled: sn != null,
    staleTime: 10_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useEquipmentForecast(opts: {
  sn: number | string;
  metric?: "rms_vel" | "rms_acc";
  direction: "d1" | "d2" | "d3";
  model?: "linear" | "arima";
  horizon_days?: number;
}) {
  const {
    sn,
    metric = "rms_vel",
    direction,
    model = "linear",
    horizon_days = 7,
  } = opts;

  return useQuery<EquipmentForecastResponse>({
    queryKey: ["equipmentForecast", sn, metric, direction, model, horizon_days],
    queryFn: () =>
      fetchEquipmentForecast({ sn, metric, direction, model, horizon_days }),
    staleTime: 5 * 60 * 1000,
  });
}
