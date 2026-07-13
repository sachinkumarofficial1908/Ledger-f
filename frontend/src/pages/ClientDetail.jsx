import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon.jsx";
import { Tilt3D } from "../components/Tilt3D.jsx";
import { AnimatedMoney } from "../components/AnimatedMoney.jsx";
import { clientsApi } from "../api/clients.js";
import { transactionsApi, CATEGORIES } from "../api/transactions.js";
import { ApiClientError } from "../api/client.js";
import { ClientFormModal } from "../components/ClientFormModal.jsx";
import { TransactionFormModal } from "../components/TransactionFormModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function formatMoney(n) {
  const sign = n < 0 ? "–" : "";
  return `${sign}₹${Math.abs(n).toLocaleString("en-IN")}`;
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [txnLoading, setTxnLoading] = useState(true);

  const [filters, setFilters] = useState({ type: "", category: "", dateFrom: "", dateTo: "" });

  const [showEditClient, setShowEditClient] = useState(false);
  const [showAddSubclient, setShowAddSubclient] = useState(false);
  const [txnModal, setTxnModal] = useState(null); // { mode: "create" | "edit", data }

  const loadClient = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await clientsApi.get(id);
      setClient(res?.data || null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't load this client.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTransactions = useCallback(
    async (page = 1) => {
      setTxnLoading(true);
      try {
        const res = await transactionsApi.listForClient(id, { ...filters, page, limit: 15 });
        setTransactions(res?.data || []);
        setPagination(res?.pagination || { page: 1, pages: 1 });
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Couldn't load transactions.");
      } finally {
        setTxnLoading(false);
      }
    },
    [id, filters]
  );

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  useEffect(() => {
    const handlePaidByMasterUpdated = (event) => {
      if (event.detail?.clientId === id) {
        setClient((current) => (current ? { ...current, paidByOptions: event.detail.paidByOptions } : current));
      }
    };

    window.addEventListener("paidByMasterUpdated", handlePaidByMasterUpdated);
    return () => window.removeEventListener("paidByMasterUpdated", handlePaidByMasterUpdated);
  }, [id]);

  useEffect(() => {
    loadTransactions(1);
  }, [loadTransactions]);

  const handleDeleteClient = async () => {
    if (!window.confirm(`Move "${client.name}" to trash? A Super Admin can restore it later.`)) return;
    try {
      await clientsApi.remove(id);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't delete this client.");
    }
  };

  const handleDeleteTxn = async (txnId) => {
    if (!window.confirm("Move this transaction to trash?")) return;
    try {
      await transactionsApi.remove(txnId);
      loadTransactions(pagination.page);
      loadClient();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't delete this transaction.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
        <span className="spinner" />
      </div>
    );
  }

  if (!client) {
    return <div className="banner banner--error">{error || "Client not found."}</div>;
  }

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/">
          <Icon name="arrowLeft" size={14} style={{ verticalAlign: "-2px" }} /> Clients
        </Link>
      </div>

      <div className="pageHead">
        <div>
          <h1>{client.name}</h1>
          <p>{client.companyName || "No company name set"}{client.location ? ` · ${client.location}` : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn--ghost" onClick={() => setShowEditClient(true)}>
            <Icon name="edit" size={15} /> Edit
          </button>
          {isSuperAdmin && (
            <button className="btn btn--danger" onClick={handleDeleteClient}>
              <Icon name="trash" size={15} /> Delete
            </button>
          )}
        </div>
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      {/* ---- balance summary ---- */}
      <div className="grid grid--3" style={{ marginBottom: 26 }}>
        <Tilt3D max={6}>
          <div className="card">
            <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>Total credit</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, color: "var(--credit)" }}>
              <AnimatedMoney value={client.totalCredit || 0} />
            </div>
          </div>
        </Tilt3D>
        <Tilt3D max={6}>
          <div className="card">
            <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>Total debit</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, color: "var(--debit)" }}>
              <AnimatedMoney value={client.totalDebit || 0} />
            </div>
          </div>
        </Tilt3D>
        <Tilt3D max={6}>
          <div className="card">
            <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>Balance</div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 20,
                color: client.balance < 0 ? "var(--debit)" : "var(--credit)",
              }}
            >
              <AnimatedMoney value={client.balance || 0} />
            </div>
          </div>
        </Tilt3D>
      </div>

      {/* ---- subclients ---- */}
      <div className="pageHead" style={{ marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 18 }}>Subclients</h1>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={() => setShowAddSubclient(true)}>
          <Icon name="plus" size={14} /> Add subclient
        </button>
      </div>
      {client.subclients?.length ? (
        <div className="grid grid--3" style={{ marginBottom: 30 }}>
          {client.subclients.map((s) => (
            <Link to={`/clients/${s._id}`} className="clientCard" key={s._id}>
              <div className="clientCard__top">
                <span className="clientCard__name">{s.name}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
                {s.companyName || "Independent ledger"}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="emptyState panel" style={{ marginBottom: 30 }}>
          No subclients under this site yet.
        </div>
      )}

      {/* ---- transactions ---- */}
      <div className="pageHead" style={{ marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 18 }}>Transactions</h1>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setTxnModal({ mode: "create" })}>
          <Icon name="plus" size={14} /> Add transaction
        </button>
      </div>

      <div className="formRow formRow--2" style={{ marginBottom: 14, gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
            <option value="">All types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
        </div>
      </div>

      {txnLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <span className="spinner" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="emptyState panel">No transactions match these filters.</div>
      ) : (
        <>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Paid to</th>
                  <th>Paid by</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id}>
                    <td>{new Date(t.date).toLocaleDateString("en-IN")}</td>
                    <td>
                      <span className={`pill pill--${t.type}`}>{t.type}</span>
                    </td>
                    <td>{t.category}</td>
                    <td>{t.description}</td>
                    <td>{t.paidTo}</td>
                    <td>{t.paidBy || "—"}</td>
                    <td className="amountCell" style={{ color: t.type === "credit" ? "var(--credit)" : "var(--debit)" }}>
                      {formatMoney(t.amount)}
                    </td>
                    <td>
                      <div className="rowActions">
                        <button className="iconBtn" onClick={() => setTxnModal({ mode: "edit", data: t })} aria-label="Edit transaction">
                          <Icon name="edit" size={14} />
                        </button>
                        {isSuperAdmin && (
                          <button className="iconBtn" onClick={() => handleDeleteTxn(t._id)} aria-label="Delete transaction">
                            <Icon name="trash" size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
              <button
                className="btn btn--ghost btn--sm"
                disabled={pagination.page <= 1}
                onClick={() => loadTransactions(pagination.page - 1)}
              >
                Previous
              </button>
              <span style={{ alignSelf: "center", fontSize: 13, color: "var(--text-1)" }}>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="btn btn--ghost btn--sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => loadTransactions(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showEditClient && (
        <ClientFormModal
          initial={client}
          onClose={() => setShowEditClient(false)}
          onSaved={() => {
            setShowEditClient(false);
            loadClient();
          }}
        />
      )}
      {showAddSubclient && (
        <ClientFormModal
          parentClient={client._id}
          onClose={() => setShowAddSubclient(false)}
          onSaved={() => {
            setShowAddSubclient(false);
            loadClient();
          }}
        />
      )}
      {txnModal && (
        <TransactionFormModal
          clientId={id}
          initial={txnModal.mode === "edit" ? txnModal.data : null}
          paidByOptions={client?.paidByOptions || []}
          paidToOptions={client?.paidToOptions || []}
          onClose={() => setTxnModal(null)}
          onSaved={() => {
            setTxnModal(null);
            loadTransactions(pagination.page);
            loadClient();
          }}
        />
      )}
    </div>
  );
}
