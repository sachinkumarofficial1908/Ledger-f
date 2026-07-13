import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, marginBottom: 10 }}>Page not found</h1>
      <p style={{ color: "var(--text-1)", marginBottom: 20 }}>The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn--primary" style={{ display: "inline-flex" }}>
        Back to dashboard
      </Link>
    </div>
  );
}
