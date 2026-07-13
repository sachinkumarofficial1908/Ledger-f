import React, { useEffect, useState, useCallback } from "react";
import { reportsApi } from "../api/reports.js";
import { ApiClientError } from "../api/client.js";

function formatMoney(n) {
  const sign = n < 0 ? "–" : "";
  return `${sign}₹${Math.abs(n).toLocaleString("en-IN")}`;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState({ dateFrom: "", dateTo: "" });

  const load = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const res = await reportsApi.summary(params);
      setData(res?.data || null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't load the report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyRange = (e) => {
    e.preventDefault();
    load(range);
  };

  // Group category rows by category name for a compact table
  const categoryRows = {};
  (data?.categoryWise || []).forEach((row) => {
    const key = row._id.category;
    if (!categoryRows[key]) categoryRows[key] = { credit: 0, debit: 0 };
    categoryRows[key][row._id.type] = row.total;
  });

  const maxMonthly = Math.max(1, ...(data?.monthly || []).map((m) => m.total));

  return (
    <div>
      <div className="pageHead">
        <div>
          <h1>Reports</h1>
          <p>Totals across every client you have access to.</p>
        </div>
      </div>

      <form className="formRow formRow--2" onSubmit={applyRange} style={{ marginBottom: 24, alignItems: "end" }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>From</label>
          <input type="date" value={range.dateFrom} onChange={(e) => setRange((r) => ({ ...r, dateFrom: e.target.value }))} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>To</label>
          <input type="date" value={range.dateTo} onChange={(e) => setRange((r) => ({ ...r, dateTo: e.target.value }))} />
        </div>
        <button className="btn btn--primary" type="submit" style={{ height: 42 }}>
          Apply
        </button>
      </form>

      {error && <div className="banner banner--error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <span className="spinner" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid--3" style={{ marginBottom: 28 }}>
            <div className="card">
              <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>Total credit</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: "var(--credit)" }}>
                {formatMoney(data.totalCredit)}
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>Total debit</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: "var(--debit)" }}>
                {formatMoney(data.totalDebit)}
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>Net balance</div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 22,
                  color: data.netBalance < 0 ? "var(--debit)" : "var(--credit)",
                }}
              >
                {formatMoney(data.netBalance)}
              </div>
            </div>
          </div>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, marginBottom: 12 }}>By category</h2>
          {Object.keys(categoryRows).length ? (
            <div className="tableWrap" style={{ marginBottom: 30 }}>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Credit</th>
                    <th>Debit</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(categoryRows).map(([cat, vals]) => (
                    <tr key={cat}>
                      <td>{cat}</td>
                      <td className="amountCell" style={{ color: "var(--credit)" }}>
                        {formatMoney(vals.credit || 0)}
                      </td>
                      <td className="amountCell" style={{ color: "var(--debit)" }}>
                        {formatMoney(vals.debit || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="emptyState panel" style={{ marginBottom: 30 }}>No category data for this range.</div>
          )}

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, marginBottom: 12 }}>Monthly trend</h2>
          {data.monthly?.length ? (
            <div className="panel" style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 160, overflowX: "auto" }}>
              {data.monthly.map((m) => (
                <div
                  key={`${m._id.year}-${m._id.month}-${m._id.type}`}
                  title={`${MONTH_NAMES[m._id.month - 1]} ${m._id.year} · ${m._id.type} · ${formatMoney(m.total)}`}
                  style={{
                    width: 26,
                    height: `${Math.max(6, (m.total / maxMonthly) * 130)}px`,
                    borderRadius: 5,
                    background: m._id.type === "credit" ? "var(--credit)" : "var(--debit)",
                    opacity: 0.85,
                    flex: "0 0 auto",
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="emptyState panel">No monthly data for this range.</div>
          )}
        </>
      ) : null}
    </div>
  );
}
