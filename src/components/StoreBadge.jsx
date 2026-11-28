import React, { useEffect, useState } from "react";
import axios from "axios";
import { getActiveStoreId, setActiveStoreId } from "../activeStore";

// Sidebar header-la store info.
//   Admin      -> store selector (All Stores / Main / ...). Maathina page reload aagum.
//   Matravanga -> avanga store name badge (maatha mudiyaadhu)
//
// Module-level cache (token-ku mattum): component remount aanaalum flicker / thirumba fetch illa.
let cache = { token: null, mine: null, stores: null, pMine: null, pStores: null };
const sync = () => {
  const token = sessionStorage.getItem("token");
  if (cache.token !== token) cache = { token, mine: null, stores: null, pMine: null, pStores: null };
  return cache;
};

const load = (kind, url) => {
  const c = sync();
  if (!c.token) return null;
  if (c[kind]) return Promise.resolve(c[kind]);
  const pk = kind === "mine" ? "pMine" : "pStores";
  if (c[pk]) return c[pk];
  c[pk] = axios.get(url)
    .then((r) => { c[kind] = r.data; return r.data; })
    .catch(() => { c[pk] = null; return null; });
  return c[pk];
};

const box = (open, children) => (
  <span
    style={{
      display: "block",
      height: 20,
      lineHeight: "20px",
      overflow: "hidden",
      opacity: open ? 1 : 0,
      maxWidth: open ? 170 : 0,
      transition: "opacity 0.3s ease, max-width 0.38s cubic-bezier(0.22, 1, 0.36, 1)",
    }}
  >
    {children}
  </span>
);

const StoreBadge = ({ open = true }) => {
  const API = import.meta.env.VITE_API_URL;
  const isAdmin = JSON.parse(sessionStorage.getItem("user") || "{}").role === "admin";
  const active = getActiveStoreId();                       // null = All Stores

  const [mine, setMine] = useState(sync().mine);
  const [stores, setStores] = useState(sync().stores);

  useEffect(() => {
    let alive = true;
    if (isAdmin) {
      if (!stores) load("stores", `${API}/api/stores`).then((d) => {
        if (!alive || !d) return;
        const list = d.filter((s) => s.active);
        cache.stores = list;
        setStores(list);
      });
    } else if (!mine) {
      load("mine", `${API}/api/stores/mine`).then((d) => { if (alive && d) setMine(d); });
    }
    return () => { alive = false; };
  }, []);

  // Select pannina store ippo illa / inactive aagiduchu -> All Stores-ku thirumbu (app udaiyaama irukka)
  useEffect(() => {
    if (isAdmin && stores && active && !stores.some((s) => String(s._id) === String(active))) {
      setActiveStoreId("all");
      window.location.reload();
    }
  }, [stores]);

  /* ---------------- ADMIN: selector ---------------- */
  if (isAdmin) {
    const list = stores || [];
    return box(open,
      <select
        value={active || "all"}
        onChange={(e) => { setActiveStoreId(e.target.value); window.location.reload(); }}
        title="Store select pannu"
        style={{
          width: "100%",
          height: 20,
          fontSize: 11,
          fontWeight: 700,
          borderRadius: 999,
          padding: "0 6px",
          border: "1px solid rgba(255,255,255,0.18)",
          background: active ? "rgba(220,38,38,0.3)" : "rgba(255,255,255,0.12)",
          color: active ? "#fecaca" : "#e2e8f0",
          outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="all" style={{ color: "#000" }}>🏬 All Stores</option>
        {list.map((s) => (
          <option key={s._id} value={s._id} style={{ color: "#000" }}>
            {s.name} ({s.code})
          </option>
        ))}
      </select>
    );
  }

  /* ---------------- STORE MANAGER / USER: badge ---------------- */
  let label = "";
  if (mine && !mine.legacy && mine.store) {
    label = `${mine.store.name}${mine.store.code ? ` (${mine.store.code})` : ""}`;
  }
  return box(open,
    label ? (
      <span
        title={label}
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: 16,
          lineHeight: "16px",
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 0.3,
          padding: "0 8px",
          borderRadius: 999,
          background: "rgba(220,38,38,0.25)",
          color: "#fecaca",
          whiteSpace: "nowrap",
          verticalAlign: "middle",
        }}
      >
        🏬 {label}
      </span>
    ) : null
  );
};

export default StoreBadge;