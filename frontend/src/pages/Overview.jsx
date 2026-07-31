import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon.jsx";
import { Tilt3D } from "../components/Tilt3D.jsx";
import { StatTile } from "../components/StatTile.jsx";
import { SpendingBarChart } from "../components/SpendingBarChart.jsx";
import { CategoryDonut } from "../components/CategoryDonut.jsx";
import { reportsApi } from "../api/reports.js";
import { clientsApi } from "../api/clients.js";
import { ApiClientError } from "../api/client.js";

function formatMoney(n) {
  const sign = n < 0 ? "–" : "";
  return `${sign}₹${Math.abs(Math.round(n || 0)).toLocaleString("en-IN")}`;
}

function AddTransactionModal({ onClose }) {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await clientsApi.list({ limit: 100 });
        const options = res?.data || [];
        setClients(options);
        if (options.length) setSelected(options[0]._id);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Couldn't load clients.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleContinue = (e) => {
    e.preventDefault();
    if (!selected) return;
    navigate(`/clients/${selected}?add=1`);
  };

  return (
    <div className="modalOverlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleContinue}>
        <div className="modal__head">
          <h2>Add transaction</h2>
          <button type="button" className="iconBtn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={15} />
          </button>
        </div>
        {error && <div className="banner banner--error">{error}</div>}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "30px 0" }}>
            <span className="spinner" />
          </div>
        ) : clients.length === 0 ? (
          <div className="emptyState">No clients yet — add one first.</div>
        ) : (
          <>
            <div className="field">
              <label htmlFor="txnClientPick">Which client is this for?</label>
              <select id="txnClientPick" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn--primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>
              Continue
            </button>
          </>
        )}
      </form>
    </div>
  );
}

export default function Overview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddTxn, setShowAddTxn] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await reportsApi.overview();
      setData(res?.data || null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't load the overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <div className="pageHead">
        <div>
          <h1>Overview</h1>
          <p>{today}</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowAddTxn(true)}>
          <Icon name="plus" size={16} /> Add Transaction
        </button>
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <span className="spinner" />
        </div>
      ) : !data ? null : (
        <>
          <div className="grid grid--4" style={{ marginBottom: 18 }}>
            <Tilt3D max={6}>
              <StatTile icon="wallet" label="Total Balance" value={data.totalBalance} deltaPct={undefined} />
            </Tilt3D>
            <Tilt3D max={6}>
              <StatTile
                icon="arrowUp"
                label="Income"
                value={data.income}
                deltaPct={data.incomeChangePct}
                goodDirection="up"
              />
            </Tilt3D>
            <Tilt3D max={6}>
              <StatTile
                icon="arrowDown"
                label="Expenses"
                value={data.expenses}
                deltaPct={data.expensesChangePct}
                goodDirection="down"
              />
            </Tilt3D>
            <Tilt3D max={6}>
              <StatTile icon="target" label="Savings Rate" value={data.savingsRate} isCurrency={false} />
            </Tilt3D>
          </div>

          <div className="overviewGrid" style={{ marginBottom: 18 }}>
            <div className="panel chartPanel">
              <div className="chartPanel__head">
                <h2>Spending Overview</h2>
              </div>
              <SpendingBarChart data={data.monthlySpending} />
            </div>
            <div className="panel chartPanel">
              <div className="chartPanel__head">
                <h2>Top Categories</h2>
              </div>
              <CategoryDonut data={data.topCategories} />
            </div>
          </div>

          <div className="overviewGrid">
            <div className="panel">
              <div className="chartPanel__head">
                <h2>Recent Transactions</h2>
                <Link to="/reports" className="btn btn--ghost btn--sm">
                  View reports
                </Link>
              </div>
              {data.recentTransactions.length === 0 ? (
                <div className="emptyState">No transactions yet.</div>
              ) : (
                <ul className="txnList">
                  {data.recentTransactions.map((t) => (
                    <li className="txnRow" key={t.id}>
                      <div>
                        <div className="txnRow__title">{t.description}</div>
                        <div className="txnRow__meta">
                          {t.clientName} · {new Date(t.date).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                      <div
                        className="amountCell"
                        style={{ color: t.type === "credit" ? "var(--credit)" : "var(--debit)" }}
                      >
                        {t.type === "debit" ? "–" : "+"}
                        {formatMoney(t.amount)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="panel">
              <div className="chartPanel__head">
                <h2>Goals</h2>
              </div>
              {data.goals.length === 0 ? (
                <div className="emptyState">
                  No savings goals set yet. Add one from a client's Edit form.
                </div>
              ) : (
                <div>
                  {data.goals.map((g) => {
                    const pct = Math.max(0, Math.min(100, (g.balance / g.goalAmount) * 100));
                    return (
                      <div className="goalCard" key={g.id}>
                        <div className="goalCard__top">
                          <span>{g.name}</span>
                          <span>{formatMoney(g.goalAmount)}</span>
                        </div>
                        <div className="goalCard__bar">
                          <div className="goalCard__fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="goalCard__meta">{Math.round(pct)}% achieved</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showAddTxn && <AddTransactionModal onClose={() => setShowAddTxn(false)} />}
    </div>
  );
}
