Vib SPA (Vite + React + TS)

Fast single‑page app to consume your Flask PdM API.

Quick start:
  1) npm i
  2) echo 'VITE_API_BASE=http://127.0.0.1:5000' > .env
  3) npm run dev
  4) npm run build && npm run preview

API endpoints used:
- GET /api/equipment?debug=0
- GET /api/bundle?sn=...&spec=1&wfm=1&diag=1&live=0&dir=0
- GET /api/history?sn=...&limit=1000

Key files:
- src/pages/SummaryPage.tsx (equipment list)
- src/pages/EquipmentPage.tsx (spectrum + RMS)
- src/components/SpectrumPlot.tsx (spectrum chart)
- src/components/RmsTrendPlot.tsx (RMS chart)
- src/lib/queries.ts (React Query hooks)
- src/lib/api.ts (fetch with timeout)
- vite.config.ts (dev proxy)
