import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import JobSheetSidebar from "./JobSheetSidebar";

const API = import.meta.env.VITE_API_URL;

const emptyForm = { name: "", state: "", city: "", code: "" };
const errMsg = (e) => e?.response?.data?.message || e?.message || "Something went wrong";

const CSS = `
.sm-top{background:#0f172a;color:#fff;padding:12px 24px;display:flex;align-items:center;gap:10px}
.sm-brand{font-weight:800;letter-spacing:1px}
.sm-page{font-size:13px;color:#94a3b8}
.sm-wrap{padding:20px 24px;max-width:1100px}
.sm-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:18px}
.sm-card h3{margin:0 0 12px;font-size:15px;font-weight:700;color:#0f172a}
.sm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.sm-field label{display:block;font-size:11.5px;font-weight:700;color:#475569;margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px}
.sm-input{width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;background:#fff;color:#0f172a}
.sm-input:focus{outline:2px solid #fecaca;border-color:#dc2626}
.sm-btn{padding:8px 16px;border:none;border-radius:8px;font-weight:700;font-size:13.5px;cursor:pointer;background:#dc2626;color:#fff}
.sm-btn:disabled{opacity:.55;cursor:not-allowed}
.sm-btn.ghost{background:#e2e8f0;color:#0f172a}
.sm-link{background:none;border:none;color:#dc2626;font-weight:700;font-size:12.5px;cursor:pointer;padding:0;margin-top:6px}
.sm-msg{padding:10px 14px;border-radius:8px;font-size:13.5px;margin-bottom:14px;font-weight:600}
.sm-msg.ok{background:#dcfce7;color:#166534}
.sm-msg.error{background:#fee2e2;color:#991b1b}
.sm-tablewrap{overflow-x:auto}
.sm-table{width:100%;border-collapse:collapse;font-size:14px}
.sm-table th{text-align:left;padding:9px 10px;background:#f8fafc;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #e2e8f0}
.sm-table td{padding:10px;border-bottom:1px solid #f1f5f9;color:#0f172a}
.sm-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:800}
.sm-badge.main{background:#0f172a;color:#fff;margin-left:8px}
.sm-badge.on{background:#dcfce7;color:#166534}
.sm-badge.off{background:#e2e8f0;color:#475569}
.sm-code{font-family:ui-monospace,Consolas,monospace;font-weight:700}
.sm-actions{display:flex;gap:8px;white-space:nowrap}
.sm-mini{padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;font-size:12.5px;font-weight:600;cursor:pointer;color:#0f172a}
.sm-modalbg{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1050;display:flex;align-items:center;justify-content:center;padding:16px}
.sm-modal{background:#fff;border-radius:14px;padding:22px;width:100%;max-width:520px}
.sm-hint{font-size:12px;color:#64748b;margin-top:4px}
`;

const StoreManagementPage = () => {
  const [stores, setStores] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [codeTouched, setCodeTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);                       // { type: "ok" | "error", text }
  const [addCity, setAddCity] = useState({ open: false, name: "", code: "" });
  const [editing, setEditing] = useState(null);               // store being edited
  const [editForm, setEditForm] = useState({ name: "", state: "", city: "" });

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const load = async () => {
    try {
      const [s, c] = await Promise.all([
        axios.get(`${API}/api/stores`),
        axios.get(`${API}/api/stores/cities`),
      ]);
      setStores(s.data);
      setStates(c.data.states);
      setCities(c.data.cities);
    } catch (e) {
      flash("error", errMsg(e));
    }
  };

  useEffect(() => { load(); }, []);

  // State / city select pannina store code auto-suggest (PDY01, PDY02 ...)
  useEffect(() => {
    if (!form.state || !form.city || codeTouched) return;
    let off = false;
    axios
      .get(`${API}/api/stores/suggest-code`, { params: { state: form.state, city: form.city } })
      .then((r) => { if (!off) setForm((f) => ({ ...f, code: r.data.code })); })
      .catch(() => {});
    return () => { off = true; };
  }, [form.state, form.city, codeTouched]);

  const stateCities = useMemo(() => cities.filter((c) => c.state === form.state), [cities, form.state]);
  const editCities = useMemo(() => cities.filter((c) => c.state === editForm.state), [cities, editForm.state]);

  const createStore = async () => {
    if (!form.name.trim() || !form.state || !form.city || !form.code.trim()) {
      return flash("error", "Name, state, city and code - ellam venum");
    }
    setSaving(true);
    try {
      await axios.post(`${API}/api/stores`, form);
      flash("ok", `Store "${form.name.trim()}" created`);
      setForm(emptyForm);
      setCodeTouched(false);
      await load();
    } catch (e) {
      flash("error", errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const saveCity = async () => {
    if (!addCity.name.trim()) return flash("error", "City name enter pannu");
    try {
      const r = await axios.post(`${API}/api/stores/cities`, {
        state: form.state,
        name: addCity.name,
        code: addCity.code,
      });
      await load();
      setForm((f) => ({ ...f, city: r.data.city.name }));
      setCodeTouched(false);
      setAddCity({ open: false, name: "", code: "" });
      flash("ok", r.data.alreadyExists ? "City already irukku - select pannittan" : `City "${r.data.city.name}" added`);
    } catch (e) {
      flash("error", errMsg(e));
    }
  };

  const openEdit = (s) => {
    setEditing(s);
    setEditForm({ name: s.name, state: s.state, city: s.city });
  };

  const saveEdit = async () => {
    try {
      await axios.put(`${API}/api/stores/${editing._id}`, editForm);
      setEditing(null);
      flash("ok", "Store updated");
      await load();
    } catch (e) {
      flash("error", errMsg(e));
    }
  };

  const toggleActive = async (s) => {
    const next = !s.active;
    if (!window.confirm(`${next ? "Activate" : "Deactivate"} "${s.name}"?`)) return;
    try {
      await axios.put(`${API}/api/stores/${s._id}`, { active: next });
      await load();
    } catch (e) {
      flash("error", errMsg(e));
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f1f5f9" }}>
      <style>{CSS}</style>
      <JobSheetSidebar />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="sm-top">
          <span className="sm-brand">RADNUS</span>
          <span className="sm-page">/ Store Management</span>
        </div>

        <div className="sm-wrap">
          {msg && <div className={`sm-msg ${msg.type}`}>{msg.text}</div>}

          {/* ===== ADD STORE ===== */}
          <div className="sm-card">
            <h3>Add Store</h3>
            <div className="sm-grid">
              <div className="sm-field">
                <label>Store Name</label>
                <input
                  className="sm-input"
                  value={form.name}
                  placeholder="Example: Chennai - Anna Nagar"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="sm-field">
                <label>State</label>
                <select
                  className="sm-input"
                  value={form.state}
                  onChange={(e) => {
                    setForm({ ...form, state: e.target.value, city: "", code: "" });
                    setCodeTouched(false);
                    setAddCity({ open: false, name: "", code: "" });
                  }}
                >
                  <option value="">Select state</option>
                  {states.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="sm-field">
                <label>City</label>
                <select
                  className="sm-input"
                  value={form.city}
                  disabled={!form.state}
                  onChange={(e) => { setForm({ ...form, city: e.target.value, code: "" }); setCodeTouched(false); }}
                >
                  <option value="">{form.state ? "Select city" : "Select state first"}</option>
                  {stateCities.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
                {form.state && !addCity.open && (
                  <button type="button" className="sm-link" onClick={() => setAddCity({ open: true, name: "", code: "" })}>
                    + Add city
                  </button>
                )}
              </div>

              <div className="sm-field">
                <label>Store Code</label>
                <input
                  className="sm-input sm-code"
                  value={form.code}
                  placeholder="PDY01"
                  maxLength={8}
                  onChange={(e) => { setCodeTouched(true); setForm({ ...form, code: e.target.value.toUpperCase() }); }}
                />
                <div className="sm-hint">Create aana apram maathakoodaadhu (job number-la varum)</div>
              </div>
            </div>

            {addCity.open && (
              <div className="sm-grid" style={{ marginTop: 14, alignItems: "end" }}>
                <div className="sm-field">
                  <label>New city in {form.state}</label>
                  <input
                    className="sm-input"
                    value={addCity.name}
                    placeholder="City name"
                    onChange={(e) => setAddCity({ ...addCity, name: e.target.value })}
                  />
                </div>
                <div className="sm-field">
                  <label>City code (2-4 letters)</label>
                  <input
                    className="sm-input sm-code"
                    value={addCity.code}
                    placeholder="Auto"
                    maxLength={4}
                    onChange={(e) => setAddCity({ ...addCity, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="sm-btn" onClick={saveCity}>Add City</button>
                  <button type="button" className="sm-btn ghost" onClick={() => setAddCity({ open: false, name: "", code: "" })}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <button type="button" className="sm-btn" disabled={saving} onClick={createStore}>
                {saving ? "Saving..." : "Create Store"}
              </button>
            </div>
          </div>

          {/* ===== STORE LIST ===== */}
          <div className="sm-card">
            <h3>Stores ({stores.length})</h3>
            <div className="sm-tablewrap">
              <table className="sm-table">
                <thead>
                  <tr>
                    <th>Store</th><th>State</th><th>City</th><th>Code</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {stores.length === 0 && (
                    <tr><td colSpan={6} style={{ color: "#64748b" }}>
                      Innum store illa. Backend-la <b>node seedStores.js --apply</b> run pannina Main Store create aagum.
                    </td></tr>
                  )}
                  {stores.map((s) => (
                    <tr key={s._id}>
                      <td>
                        {s.name}
                        {s.isDefault && <span className="sm-badge main">MAIN</span>}
                      </td>
                      <td>{s.state}</td>
                      <td>{s.city}</td>
                      <td className="sm-code">{s.code}</td>
                      <td><span className={`sm-badge ${s.active ? "on" : "off"}`}>{s.active ? "Active" : "Inactive"}</span></td>
                      <td>
                        <div className="sm-actions">
                          <button type="button" className="sm-mini" onClick={() => openEdit(s)}>Edit</button>
                          {!s.isDefault && (
                            <button type="button" className="sm-mini" onClick={() => toggleActive(s)}>
                              {s.active ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ===== EDIT MODAL ===== */}
      {editing && (
        <div className="sm-modalbg" onClick={() => setEditing(null)}>
          <div className="sm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Edit Store <span className="sm-code">({editing.code})</span></h3>
            <div className="sm-grid" style={{ gridTemplateColumns: "1fr" }}>
              <div className="sm-field">
                <label>Store Name</label>
                <input className="sm-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="sm-field">
                <label>State</label>
                <select
                  className="sm-input"
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value, city: "" })}
                >
                  {states.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="sm-field">
                <label>City</label>
                <select className="sm-input" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}>
                  <option value="">Select city</option>
                  {editCities.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button type="button" className="sm-btn ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" className="sm-btn" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreManagementPage;