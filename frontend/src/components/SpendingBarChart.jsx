import React, { useState } from "react";

function formatMoney(n) {
  return `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
}

/** data: [{ label, total, isCurrent }] — trailing months of expense totals. */
export function SpendingBarChart({ data = [] }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.total));

  if (!data.length) {
    return <div className="emptyState">No spending data yet.</div>;
  }

  return (
    <div className="barChart">
      {data.map((d, i) => (
        <div
          key={`${d.label}-${i}`}
          className="barChart__col"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
        >
          {hovered === i && (
            <div className="barChart__tooltip">
              {formatMoney(d.total)}
              <span>{d.label}</span>
            </div>
          )}
          <div className="barChart__track">
            <div
              className={`barChart__bar${d.isCurrent ? " barChart__bar--current" : ""}`}
              style={{ height: `${Math.max(3, (d.total / max) * 100)}%` }}
            />
          </div>
          <div className="barChart__label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}
