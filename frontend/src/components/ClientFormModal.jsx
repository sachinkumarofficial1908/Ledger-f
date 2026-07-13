import React, { useState } from "react";
import { Icon } from "./Icon.jsx";
import { clientsApi } from "../api/clients.js";
import { ApiClientError } from "../api/client.js";

function parsePaidByOptions(value) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function ClientFormModal({ parentClient = null, initial = null, onClose, onSaved }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState({
    name: initial?.name || "",
    companyName: initial?.companyName || "",
    location: initial?.location || "",
    description: initial?.description || "",
    openingBalance: initial?.openingBalance || 0,
    openingBalanceType: initial?.openingBalanceType || "credit",
    paidByOptionsText: (initial?.paidByOptions || []).join(", "),
    paidToOptionsText: (initial?.paidToOptions || []).join(", "),
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        openingBalance: Number(form.openingBalance) || 0,
        paidByOptions: parsePaidByOptions(form.paidByOptionsText),
        paidToOptions: parsePaidByOptions(form.paidToOptionsText),
        ...(parentClient ? { parentClient } : {}),
      };
      if (isEdit) {
        await clientsApi.update(initial._id, payload);
      } else {
        await clientsApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't save this client.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal__head">
          <h2>{isEdit ? "Edit client" : parentClient ? "Add subclient" : "Add client"}</h2>
          <button type="button" className="iconBtn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={15} />
          </button>
        </div>

        {error && <div className="banner banner--error">{error}</div>}

        <div className="field">
          <label htmlFor="cname">Name</label>
          <input id="cname" required value={form.name} onChange={update("name")} placeholder="e.g. Delhi Arhat" />
        </div>
        <div className="formRow formRow--2">
          <div className="field">
            <label htmlFor="ccompany">Company name</label>
            <input id="ccompany" value={form.companyName} onChange={update("companyName")} />
          </div>
          <div className="field">
            <label htmlFor="clocation">Location</label>
            <input id="clocation" value={form.location} onChange={update("location")} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="cdesc">Description</label>
          <textarea id="cdesc" value={form.description} onChange={update("description")} />
        </div>
        <div className="field">
          <label htmlFor="cpaidbyoptions">Paid by options (admin master)</label>
          <input
            id="cpaidbyoptions"
            value={form.paidByOptionsText}
            onChange={update("paidByOptionsText")}
            placeholder="Admin, Cash, Bank"
          />
          <div className="hint">Separate each option with a comma. These values will appear in the transaction form.</div>
        </div>
        <div className="field">
          <label htmlFor="cpaidtooptions">Paid to options</label>
          <input
            id="cpaidtooptions"
            value={form.paidToOptionsText}
            onChange={update("paidToOptionsText")}
            placeholder="Delhi Arhat, Sunil Hardware"
          />
          <div className="hint">Use this to save common payee names for credit transactions.</div>
        </div>
        {!parentClient && (
          <div className="formRow formRow--2">
            <div className="field">
              <label htmlFor="cob">Opening balance</label>
              <input
                id="cob"
                type="number"
                min="0"
                step="0.01"
                value={form.openingBalance}
                onChange={update("openingBalance")}
              />
            </div>
            <div className="field">
              <label htmlFor="cobtype">Opening balance type</label>
              <select id="cobtype" value={form.openingBalanceType} onChange={update("openingBalanceType")}>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </div>
          </div>
        )}

        <button className="btn btn--primary" type="submit" disabled={submitting} style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
          {submitting ? <span className="spinner" /> : isEdit ? "Save changes" : "Create client"}
        </button>
      </form>
    </div>
  );
}
