"use client";

import { Routes, Route, Navigate, Link, useLocation, Outlet } from "react-router-dom";
import SummaryPage from "./pages/SummaryPage";
import EquipmentDetailPage from "./pages/EquipmentDetailPage";
import { useEquipment } from "./lib/queries";
import LoginPage from "./pages/LoginPage";

function NavLinkItem({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  const active =
    location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <Link
      to={to}
      style={{
        display: "block",
        padding: "8px 10px",
        borderRadius: 6,
        marginBottom: 6,
        fontSize: 14,
        textDecoration: "none",
        color: active ? "#e5e7eb" : "#9ca3af",
        backgroundColor: active ? "#111827" : "transparent",
      }}
    >
      {label}
    </Link>
  );
}

function EquipmentNavList() {
  const { data } = useEquipment();
  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 18, color: "#9ca3af", marginBottom: 6 }}>
        North Plant
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map((r) => (
          <Link
            key={r.id}
            to={`/equipment/${r.id}`}
            style={{
              display: "block",
              padding: "6px 8px",
              borderRadius: 6,
              fontSize: 13,
              textDecoration: "none",
              color: "#e5e7eb",
              backgroundColor: "rgba(30,41,59,0.7)",
              border: "1px solid rgba(148,163,184,0.2)",
            }}
          >
            {r.name ?? `Equipment ${r.id}`}
          </Link>
        ))}
      </div>
    </div>
  );
}

function isAuthed() {
  return (
    !!localStorage.getItem("auth_token") || !!sessionStorage.getItem("auth_token")
  );
}

function ShellLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617", // slate-950
        color: "#e5e7eb",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          height: 56,
          borderBottom: "1px solid rgba(148,163,184,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          backgroundColor: "#020617",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 18 }}>
          Horizon PdM{" "}
          <span style={{ opacity: 0.6 }}>· Vibration Analytics</span>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <nav
          style={{
            width: 240,
            borderRight: "1px solid rgba(148,163,184,0.15)",
            padding: "16px 12px",
            backgroundColor: "#020617",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(17,24,39,0.8)",
              border: "1px solid rgba(148,163,184,0.25)",
              borderRadius: 10,
              padding: 10,
              marginBottom: 10,
            }}
          >
            <NavLinkItem to="/summary" label="Fleet Summary" />
          </div>
          <div
            style={{
              backgroundColor: "#111827",
              border: "1px solid rgba(148,163,184,0.2)",
              borderRadius: 10,
              padding: 10,
              flex: 1,
            }}
          >
            <EquipmentNavList />
          </div>

          {/* Logout at bottom of sidebar */}
          <button
            onClick={() => {
              localStorage.removeItem("auth_token");
              sessionStorage.removeItem("auth_token");
              window.location.href = "/login";
            }}
            style={{
              marginTop: 12,
              padding: "10px 12px",
              backgroundColor: "#111827",
              border: "1px solid #475569",
              borderRadius: 8,
              color: "#E5E7EB",
              cursor: "pointer",
              fontSize: 14,
              width: "100%",
            }}
          >
            Logout
          </button>
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, padding: "16px 24px" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function RequireAuth() {
  if (!isAuthed()) {
    return <Navigate to="/login" replace />;
  }
  return <ShellLayout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/summary" replace />} />
        <Route path="/summary" element={<SummaryPage />} />
        <Route path="/equipment/:equipmentId" element={<EquipmentDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
