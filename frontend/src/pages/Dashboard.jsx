import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icon.jsx";
import { Tilt3D } from "../components/Tilt3D.jsx";
import { AnimatedMoney } from "../components/AnimatedMoney.jsx";
import { clientsApi } from "../api/clients.js";
import { ApiClientError } from "../api/client.js";
import { ClientFormModal } from "../components/ClientFormModal.jsx";

function formatMoney(n) {
  const sign = n < 0 ? "–" : "";
  return `${sign}₹${Math.abs(n).toLocaleString("en-IN")}`;
}

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async (searchTerm) => {
    setLoading(true);
    setError("");
    try {
      const res = await clientsApi.list({ search: searchTerm, limit: 50 });
      setClients(res?.data || []);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't load clients.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  useEffect(() => {
    const id = setTimeout(() => load(search), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div>
      <div className="pageHead">
        <div>
          <h1>Clients</h1>
          <p>Every site's credit, debit, and running balance, at a glance.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size={16} /> Add client
        </button>
      </div>

      <div className="field" style={{ maxWidth: 340, marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <Icon
            name="search"
            size={16}
            style={{ position: "absolute", left: 12, top: 12, color: "var(--text-2)" }}
          />
          <input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <span className="spinner" />
        </div>
      ) : clients.length === 0 ? (
        <div className="emptyState panel">No clients yet. Add your first site to get started.</div>
      ) : (
        <div className="grid grid--3">
          {clients.map((c) => (
            <Tilt3D key={c._id}>
              <Link to={`/clients/${c._id}`} className="clientCard">
                <div className="clientCard__top">
                  <span className="clientCard__name">{c.name}</span>
                  <span className="clientCard__tag">{c.transactionCount || 0} txns</span>
                </div>
                <div
                  className="clientCard__balance"
                  style={{ color: c.balance < 0 ? "var(--debit)" : "var(--credit)" }}
                >
                  <AnimatedMoney value={c.balance || 0} />
                </div>
                <div className="clientCard__row">
                  <span>Credit {formatMoney(c.totalCredit || 0)}</span>
                  <span>Debit {formatMoney(c.totalDebit || 0)}</span>
                </div>
              </Link>
            </Tilt3D>
          ))}
        </div>
      )}

      {showCreate && (
        <ClientFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load(search);
          }}
        />
      )}
    </div>
  );
}
