"use client";

import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const localToken = localStorage.getItem("auth_token");
  const sessionToken = sessionStorage.getItem("auth_token");
  const token = localToken || sessionToken;

  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
