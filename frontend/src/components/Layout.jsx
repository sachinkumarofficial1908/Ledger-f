import React, { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Icon } from "./Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { clientsApi } from "../api/clients.js";

const links = [
  { to: "/", label: "Dashboard", icon: "grid", end: true },
  { label: "Paid by", icon: "users", action: "paidByMaster" },
  { to: "/reports", label: "Reports", icon: "chart" },
  { to: "/purchase-orders", label: "Purchase Orders", icon: "layers" },
];

const superAdminLinks = [{ to: "/users", label: "Users", icon: "users" }];

export function Layout({ children }) {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const clientId = location.pathname.startsWith("/clients/") ? location.pathname.split("/")[2] : null;
  const [theme, setTheme] = useState(() => localStorage.getItem("ledger-theme") || "dark");
  const [showPaidByMaster, setShowPaidByMaster] = useState(false);
  const [masterValues, setMasterValues] = useState([]); // array of names
  const [masterInput, setMasterInput] = useState("");
  const [masterBusy, setMasterBusy] = useState(false);
  const [masterError, setMasterError] = useState("");
  const [clientOptions, setClientOptions] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(clientId || "");

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navItems = isSuperAdmin ? [...links, ...superAdminLinks] : links;

  const loadClientOptions = async () => {
    try {
      const res = await clientsApi.list({ limit: 100 });
      const options = res?.data || [];
      setClientOptions(options);
      if (!selectedClientId && options.length) {
        setSelectedClientId(options[0]._id);
      }
      return options;
    } catch (err) {
      setClientOptions([]);
      return [];
    }
  };

  const loadPaidByMaster = async (targetClientId = selectedClientId) => {
    if (!targetClientId) {
      setMasterValues([]);
      return;
    }
    try {
      const res = await clientsApi.get(targetClientId);
      setMasterValues(res?.data?.paidByOptions || []);
    } catch (err) {
      setMasterValues([]);
    }
  };

  const openPaidByMaster = async () => {
    setMasterError("");
    const options = await loadClientOptions();
    const resolvedClientId = clientId || selectedClientId || options[0]?._id || "";
    if (resolvedClientId) {
      setSelectedClientId(resolvedClientId);
      await loadPaidByMaster(resolvedClientId);
    } else {
      setMasterValues("");
    }
    setShowPaidByMaster(true);
  };

  const handlePaidByMasterSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClientId) return;
    setMasterError("");
    setMasterBusy(true);

    const options = masterValues.map((v) => v.trim()).filter(Boolean);

    try {
      await clientsApi.update(selectedClientId, { paidByOptions: options });
      window.dispatchEvent(new CustomEvent("paidByMasterUpdated", { detail: { clientId: selectedClientId, paidByOptions: options } }));
      setShowPaidByMaster(false);
    } catch (err) {
      setMasterError("Could not save paid-by names.");
    } finally {
      setMasterBusy(false);
    }
  };

  const addMasterName = () => {
    const v = (masterInput || "").trim();
    if (!v) return;
    if (masterValues.includes(v)) {
      setMasterInput("");
      return;
    }
    setMasterValues((s) => [...s, v]);
    setMasterInput("");
  };

  const removeMasterName = (name) => {
    setMasterValues((s) => s.filter((x) => x !== name));
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ledger-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (clientId) {
      setSelectedClientId(clientId);
      loadPaidByMaster(clientId);
    }
  }, [clientId]);

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">
            <Icon name="wallet" size={16} />
          </span>
          LedgerBook
        </div>
        <nav>
          {navItems.map((l) =>
            l.action === "paidByMaster" ? (
              <button key={l.label} type="button" className="navLink" onClick={openPaidByMaster}>
                <Icon name={l.icon} size={17} />
                {l.label}
              </button>
            ) : (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => "navLink" + (isActive ? " active" : "")}
              >
                <Icon name={l.icon} size={17} />
                {l.label}
              </NavLink>
            )
          )}
        </nav>
        <div className="sidebar__footer">
          <div className="userChip">
            <span className="userChip__avatar">{initials}</span>
            <div>
              <div className="userChip__name">{user?.name}</div>
              <div className="userChip__role">{user?.role?.replace("_", " ")}</div>
            </div>
          </div>
          <button
            className="themeToggle"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            aria-label="Toggle theme"
            style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
          >
            {theme === "dark" ? "☀ Light" : "☾ Dark"}
          </button>
          <button className="logoutBtn" onClick={handleLogout}>
            <Icon name="logout" size={15} /> Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="brand" style={{ padding: 0 }}>
            <span className="brand__mark">
              <Icon name="wallet" size={15} />
            </span>
            LedgerBook
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="themeToggle" onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} aria-label="Toggle theme">
              {theme === "dark" ? "☀ Light" : "☾ Dark"}
            </button>
            <button className="iconBtn" onClick={handleLogout} aria-label="Log out">
              <Icon name="logout" size={15} />
            </button>
          </div>
        </div>

        <div className="mobileMenuBar">
          {navItems.map((l) =>
            l.action === "paidByMaster" ? (
              <button key={l.label} type="button" className="mobileMenuBar__item" onClick={openPaidByMaster}>
                <Icon name={l.icon} size={16} />
                {l.label}
              </button>
            ) : (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => "mobileMenuBar__item" + (isActive ? " active" : "")}
              >
                <Icon name={l.icon} size={16} />
                {l.label}
              </NavLink>
            )
          )}
        </div>

        {children}

        {showPaidByMaster && (
          <div className="modalOverlay" onMouseDown={(e) => e.target === e.currentTarget && setShowPaidByMaster(false)}>
            <form className="modal" onSubmit={handlePaidByMasterSubmit}>
              <div className="modal__head">
                <h2>Paid by master</h2>
                <button type="button" className="iconBtn" onClick={() => setShowPaidByMaster(false)} aria-label="Close">
                  <Icon name="close" size={15} />
                </button>
              </div>
              {masterError && <div className="banner banner--error">{masterError}</div>}
              <div className="field">
                <label htmlFor="paidbyclient">Client</label>
                <select
                  id="paidbyclient"
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    loadPaidByMaster(e.target.value);
                  }}
                >
                  {clientOptions.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="paidbymaster">Names of paid-by people</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    id="paidbymaster"
                    value={masterInput}
                    onChange={(e) => setMasterInput(e.target.value)}
                    placeholder="Enter a name and click Add"
                  />
                  <button type="button" className="btn btn--ghost" onClick={addMasterName} style={{ whiteSpace: "nowrap" }}>
                    Add
                  </button>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {masterValues.map((name) => (
                    <div key={name} className="pill" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span>{name}</span>
                      <button type="button" className="iconBtn" onClick={() => removeMasterName(name)} aria-label={`Remove ${name}`}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="hint">Use Add to add one name at a time. Click × to remove.</div>
              </div>
              <button className="btn btn--primary" type="submit" disabled={masterBusy} style={{ width: "100%", justifyContent: "center" }}>
                {masterBusy ? <span className="spinner" /> : "Save paid-by names"}
              </button>
            </form>
          </div>
        )}

        {/* Thumb-reachable bottom nav — one tap from anywhere, no hamburger to dig through */}
        <nav className="bottomNav">
          {navItems.map((l) =>
            l.action === "paidByMaster" ? (
              <button key={l.label} type="button" className="bottomNav__item" onClick={openPaidByMaster}>
                <Icon name={l.icon} size={19} />
                {l.label}
              </button>
            ) : (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => "bottomNav__item" + (isActive ? " active" : "")}
              >
                <Icon name={l.icon} size={19} />
                {l.label}
              </NavLink>
            )
          )}
        </nav>
      </main>
    </div>
  );
}
