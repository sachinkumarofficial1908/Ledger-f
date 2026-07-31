import React from "react";
import { AnimatedMoney } from "./AnimatedMoney.jsx";

function formatMoney(n) {
  return `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
}

// Fixed categorical order — never cycled/regenerated per render. "Other" is
// always the fold-in neutral, never a fourth hue (see dataviz skill guidance).
const SLOT_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];

/** data: [{ category, total }] — top categories, "Other" (if present) last. */
export function CategoryDonut({ data = [] }) {
  const total = data.reduce((sum, d) => sum + d.total, 0);

  if (!data.length || total <= 0) {
    return <div className="emptyState">No category spend yet.</div>;
  }

  let cumulative = 0;
  const stops = data.map((d, i) => {
    const start = (cumulative / total) * 360;
    cumulative += d.total;
    const end = (cumulative / total) * 360;
    const color = d.category === "Other" ? "var(--text-2)" : SLOT_COLORS[i] || "var(--text-2)";
    return `${color} ${start}deg ${end}deg`;
  });

  const top = data[0];

  return (
    <div className="donutWrap">
      <div className="donutChart" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
        <div className="donutChart__hole">
          <div className="donutChart__value">
            <AnimatedMoney value={top.total} />
          </div>
          <div className="donutChart__label">{top.category}</div>
        </div>
      </div>
      <ul className="donutLegend">
        {data.map((d, i) => (
          <li key={d.category}>
            <span
              className="donutLegend__swatch"
              style={{ background: d.category === "Other" ? "var(--text-2)" : SLOT_COLORS[i] || "var(--text-2)" }}
            />
            <span className="donutLegend__label">{d.category}</span>
            <span className="donutLegend__value">{formatMoney(d.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
