import React, { useEffect, useState, useCallback } from "react";
import { Icon } from "../components/Icon.jsx";
import { usersApi } from "../api/users.js";
import { ApiClientError } from "../api/client.js";
import { UserFormModal } from "../components/UserFormModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { mode: "create" | "edit", data }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await usersApi.list();
      setUsers(res?.data || []);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this user? They will lose access immediately.")) return;
    try {
      await usersApi.remove(id);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't remove this user.");
    }
  };

  return (
    <div>
      <div className="pageHead">
        <div>
          <h1>Users</h1>
          <p>Admins and Super Admins with access to this ledger.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModal({ mode: "create" })}>
          <Icon name="plus" size={16} /> Add user
        </button>
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <span className="spinner" />
        </div>
      ) : users.length === 0 ? (
        <div className="emptyState panel">No users yet.</div>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td style={{ textTransform: "capitalize" }}>{u.role.replace("_", " ")}</td>
                  <td>
                    <span className={`pill ${u.isActive ? "pill--credit" : "pill--debit"}`}>
                      {u.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td>
                    <div className="rowActions">
                      <button className="iconBtn" onClick={() => setModal({ mode: "edit", data: u })} aria-label="Edit user">
                        <Icon name="edit" size={14} />
                      </button>
                      {u._id !== currentUser?._id && (
                        <button className="iconBtn" onClick={() => handleDelete(u._id)} aria-label="Remove user">
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
      )}

      {modal && (
        <UserFormModal
          initial={modal.mode === "edit" ? modal.data : null}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}
