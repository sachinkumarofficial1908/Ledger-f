import React, { useState } from "react";
import { Icon } from "./Icon.jsx";
import { transactionsApi, CATEGORIES } from "../api/transactions.js";
import { ApiClientError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionFormModal({ clientId, initial = null, paidByOptions = [], paidToOptions = [], onClose, onSaved }) {
  const { user } = useAuth();
  const isEdit = Boolean(initial);
  const availablePaidByOptions = Array.from(new Set([...(paidByOptions || []), initial?.paidBy].filter(Boolean)));
  const availablePaidToOptions = Array.from(new Set([...(paidToOptions || []), initial?.paidTo].filter(Boolean)));
  // One key for the lifetime of this modal — if handleSubmit is called again
  // after a failed attempt (e.g. the user hits a network error and clicks
  // "Add transaction" again without closing the modal), it's still the same
  // logical submission, so it should reuse the same key rather than mint a new one.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({
    date: initial?.date ? initial.date.slice(0, 10) : todayIso(),
    amount: initial?.amount || "",
    type: initial?.type || "debit",
    category: initial?.category || CATEGORIES[0],
    description: initial?.description || "",
    paidTo: initial?.paidTo || (availablePaidToOptions.length ? availablePaidToOptions[0] : ""),
    paidBy: initial?.paidBy || (availablePaidByOptions.length ? availablePaidByOptions[0] : ""),
    nameOfCompany: initial?.nameOfCompany || "",
    companyName: initial?.companyName || "",
  });
  const isCredit = form.type === "credit";
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (isEdit) {
        await transactionsApi.update(initial._id, payload);
      } else {
        await transactionsApi.create(clientId, { ...payload }, idempotencyKey);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't save this transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal__head">
          <h2>{isEdit ? "Edit transaction" : "Add transaction"}</h2>
          <button type="button" className="iconBtn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={15} />
          </button>
        </div>

        {error && <div className="banner banner--error">{error}</div>}

        <div className="formRow formRow--2">
          <div className="field">
            <label htmlFor="tdate">Date</label>
            <input id="tdate" type="date" required value={form.date} onChange={update("date")} />
          </div>
          <div className="field">
            <label htmlFor="tamount">Amount (₹)</label>
            <input
              id="tamount"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.amount}
              onChange={update("amount")}
            />
          </div>
        </div>

        <div className="formRow formRow--2">
          <div className="field">
            <label htmlFor="ttype">Credit / Debit</label>
            <select id="ttype" value={form.type} onChange={update("type")}>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="tcategory">Category</label>
            <select id="tcategory" value={form.category} onChange={update("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="tdesc">Description</label>
          <textarea id="tdesc" required value={form.description} onChange={update("description")} />
        </div>

        <div className="formRow formRow--2">
          <div className="field">
            <label htmlFor={isCredit ? "tpaidby" : "tpaidto"}>{isCredit ? "Paid by" : "Paid to"}</label>
            <input
              id={isCredit ? "tpaidby" : "tpaidto"}
              required
              value={isCredit ? form.paidBy : form.paidTo}
              onChange={update(isCredit ? "paidBy" : "paidTo")}
            />
          </div>
          <div className="field">
            <label htmlFor={isCredit ? "tpaidto" : "tpaidby"}>{isCredit ? "Paid to" : "Paid by"}</label>
            {isCredit ? (
              availablePaidToOptions.length ? (
                <select id="tpaidto" required value={form.paidTo} onChange={update("paidTo")}>
                  <option value="" disabled>
                    Select payee
                  </option>
                  {availablePaidToOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input id="tpaidto" required value={form.paidTo} onChange={update("paidTo")} placeholder="Enter payee name" />
                  <div className="hint">Payee names are saved for future credit entries.</div>
                </>
              )
            ) : (
              <>
                <select id="tpaidby" value={form.paidBy} onChange={update("paidBy")}>
                  {availablePaidByOptions.length === 0 ? (
                    <option value="" disabled>
                      No paid-by names configured
                    </option>
                  ) : (
                    <>
                      <option value="" disabled>
                        Select paid by
                      </option>
                      {availablePaidByOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {availablePaidByOptions.length === 0 && (
                  <div className="hint">No paid-by names found — open Paid by menu to add names.</div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="tcompany">Company name</label>
          <input id="tcompany" value={form.companyName} onChange={update("companyName")} />
        </div>

        <button
          className="btn btn--primary"
          type="submit"
          disabled={submitting}
          style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
        >
          {submitting ? <span className="spinner" /> : isEdit ? "Save changes" : "Add transaction"}
        </button>
      </form>
    </div>
  );
}
