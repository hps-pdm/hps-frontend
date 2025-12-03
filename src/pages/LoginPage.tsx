"use client";

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/hps_logo.png"; // <--- adjust path

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  // If already logged in, redirect
  useEffect(() => {
    const local = localStorage.getItem("auth_token");
    const session = sessionStorage.getItem("auth_token");
    if (local || session) {
      navigate("/summary", { replace: true });
    }
  }, [navigate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (username === "admin" && password === "1234") {
      if (remember) {
        localStorage.setItem("auth_token", "demo_token_123");
      } else {
        sessionStorage.setItem("auth_token", "demo_token_123");
      }

      const redirectTo = location.state?.from?.pathname || "/summary";
      navigate(redirectTo, { replace: true });
    } else {
      setError("Invalid username or password");
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        background: "linear-gradient(180deg, #0F172A 0%, #0C1220 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        padding: 20,
      }}
    >
      <div
        style={{
          width: 380,
          padding: 28,
          backgroundColor: "#1E293B",
          borderRadius: 12,
          boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        {/* Logo */}
        <img src={logo} alt="Logo" style={{ width: 250, marginBottom: 4 }} />

        {/* Title */}
        <h2 style={{ margin: 0 }}>Maintenance Intelligence Center</h2>
        <div style={{ marginTop: 0, opacity: 0.7 }}>
          AI-Powered Condition Monitoring
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {error && (
            <div style={{ color: "#EF4444", fontSize: 12, textAlign: "center" }}>
              {error}
            </div>
          )}

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: 6,
              border: "1px solid #475569",
              backgroundColor: "#0F172A",
              color: "white",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: 6,
              border: "1px solid #475569",
              backgroundColor: "#0F172A",
              color: "white",
            }}
          />

          {/* Remember Me + Forgot Password */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>

            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "#60A5FA",
                cursor: "pointer",
                fontSize: 13,
              }}
              onClick={() => alert("Password reset coming soon!")}
            >
              Forgot password?
            </button>
          </div>

          {/* Login button */}
          <button
            type="submit"
            style={{
              padding: "12px",
              marginTop: 6,
              backgroundColor: "#10B981",
              border: "none",
              borderRadius: 6,
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            Login
          </button>
        </form>

        {/* Footer */}
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
          © {new Date().getFullYear()} Horizon Predictive Solutions Inc.
        </div>
      </div>
    </div>
  );
}
