// src/lib/api.ts

// In dev, we always call relative /api/... and let Vite proxy to the backend.
const API_BASE = "";  // same-origin

export async function fetchJSON(path: string, ms = 8000, init?: RequestInit) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);

  const rel = path.startsWith("/") ? path : `/${path}`;

  try {
    const res = await fetch(`${API_BASE}${rel}`, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`HTTP error on ${rel}:`, res.status, text);
      throw new Error(`${rel} ${res.status}`);
    }

    // Note: since curl shows Content-Type: application/json, this is valid.
    return res.json();
  } finally {
    clearTimeout(id);
  }
}

export type HistoryPoint = {
  date: string;          // "YYYY-MM-DD"
  value: number | null;
};

export type ForecastPoint = {
  date: string;          // "YYYY-MM-DD"
  forecast: number;
  lower: number;
  upper: number;
};

export type EquipmentForecastResponse = {
  sn: number | string;
  metric: "rms_vel" | "rms_acc";
  direction: "d1" | "d3" | "d2";
  model: "linear" | "arima";
  horizon_days: number;
  history: HistoryPoint[];
  forecast: ForecastPoint[];
};

export async function fetchEquipmentForecast(opts: {
  sn: number | string;
  metric?: "rms_vel" | "rms_acc";
  direction: "d1" | "d2" | "d3";
  model?: "linear" | "arima";
  horizon_days?: number;
}): Promise<EquipmentForecastResponse> {
  const {
    sn,
    metric = "rms_vel",
    direction,
    model = "linear",
    horizon_days = 7,
  } = opts;

  const params = new URLSearchParams({
    metric,
    direction,
    model,
    horizon: String(horizon_days),
  });

  const path = `/api/equipment/${sn}/forecast?${params.toString()}`;
  const base = API_BASE || "";
  const url = base ? `${base}${path}` : path;


  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`forecast failed: ${text}`);
  }
  return res.json();
}
