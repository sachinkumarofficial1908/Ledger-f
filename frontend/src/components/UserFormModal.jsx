import React, { useState } from "react";
import { Icon } from "./Icon.jsx";
import { usersApi } from "../api/users.js";
import { ApiClientError } from "../api/client.js";

export function UserFormModal({ initial = null, onClose, onSaved }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState({
    name: initial?.name || "",
    email: initial?.email || "",
    password: "",
    role: initial?.role || "admin",
    isActive: initial?.isActive ?? true,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isEdit) {
        await usersApi.update(initial._id, {
          name: form.name,
          role: form.role,
          isActive: form.isActive,
        });
      } else {
        await usersApi.create({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't save this user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal__head">
          <h2>{isEdit ? "Edit user" : "Add admin user"}</h2>
          <button type="button" className="iconBtn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={15} />
          </button>
        </div>

        {error && <div className="banner banner--error">{error}</div>}

        <div className="field">
          <label htmlFor="uname">Name</label>
          <input id="uname" required value={form.name} onChange={update("name")} />
        </div>
        <div className="field">
          <label htmlFor="uemail">Email</label>
          <input
            id="uemail"
            type="email"
            required
            disabled={isEdit}
            value={form.email}
            onChange={update("email")}
          />
        </div>
        {!isEdit && (
          <div className="field">
            <label htmlFor="upassword">Password</label>
            <input
              id="upassword"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={update("password")}
            />
            <span className="hint">At least 8 characters.</span>
          </div>
        )}
        <div className="formRow formRow--2">
          <div className="field">
            <label htmlFor="urole">Role</label>
            <select id="urole" value={form.role} onChange={update("role")}>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          {isEdit && (
            <div className="field">
              <label htmlFor="uactive">Status</label>
              <select
                id="uactive"
                value={form.isActive ? "active" : "inactive"}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === "active" }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
            </div>
          )}
        </div>

        <button
          className="btn btn--primary"
          type="submit"
          disabled={submitting}
          style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
        >
          {submitting ? <span className="spinner" /> : isEdit ? "Save changes" : "Create user"}
        </button>
      </form>
    </div>
  );
}
