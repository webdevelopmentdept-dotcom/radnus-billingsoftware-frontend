import React, { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import { Wrench, X, Plus, Pencil, Trash2, Check, ListPlus } from "lucide-react";

/* ================= THEME (matches rest of app) ================= */
const BLUE = "#2563EB";
const BLUE_SOFT_BG = "#EFF6FF";
const GREEN = "#16A34A";
const RED = "#DC2626";
const GRAY_TEXT = "#6B7280";
const BORDER = "#E5E7EB";

const selectStyles = {
  control: (base) => ({ ...base, minHeight: 32, height: 32, borderColor: "#CBD5E1" }),
  valueContainer: (base) => ({ ...base, height: 30, padding: "0 8px" }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  placeholder: (base) => ({ ...base, color: "#6B7280", fontWeight: 500, fontSize: 13 }),
  singleValue: (base) => ({ ...base, color: "#111827", fontWeight: 500, fontSize: 13 }),
  input: (base) => ({ ...base, color: "#111827", margin: 0, padding: 0 }),
  option: (base, state) => ({
    ...base,
    color: "#111827",
    fontWeight: 500,
    fontSize: 13,
    background: state.isFocused ? BLUE_SOFT_BG : "#fff",
  }),
};

const iconBtnStyle = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 13,
  padding: "2px 5px",
  borderRadius: 4,
  lineHeight: 1,
};

const SparePopup = ({ onClose, setSpareCharge, setSpareItems, existingItems = [] }) => {
  const today = new Date().toISOString().split("T")[0];
  const API = import.meta.env.VITE_API_URL;

  // ✅ searchable master list of spare names (backend-driven, like Physical Condition / Accessories)
  const [spareList, setSpareList] = useState([]);
  const [name, setName] = useState(""); // holds the currently selected spare name
  const [addingNewMode, setAddingNewMode] = useState(false); // true while typing a brand-new spare name
  const [customName, setCustomName] = useState("");
  const [addingSpare, setAddingSpare] = useState(false);

  // ✅ Manage Spares panel — separate from the Select dropdown so edit/delete
  // clicks are plain DOM buttons, not fighting react-select's own click handling.
  const [showManage, setShowManage] = useState(false);

  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState("");
  const [date, setDate] = useState(today);
  const [items, setItems] = useState(existingItems);

  // ✅ In-app feedback banner — replaces window.alert()
  const [feedback, setFeedback] = useState(null); // { type: 'error' | 'success', text }
  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    window.clearTimeout(showFeedback._t);
    showFeedback._t = window.setTimeout(() => setFeedback(null), 3000);
  };

  // ✅ Inline rename — replaces window.prompt()
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  // ✅ Inline delete confirm — replaces window.confirm()
  const [deletingId, setDeletingId] = useState(null);

  const fetchSpares = () => {
    axios.get(`${API}/api/spares`)
      .then(res => setSpareList(res.data))
      .catch(err => console.error("Spare list fetch error:", err));
  };

  useEffect(() => {
    fetchSpares();
  }, []);

  // ✅ FIX — auto-close the Manage panel once the list becomes empty, so a stray
  // "No spares saved yet" box never lingers on screen with no toggle to dismiss it.
  useEffect(() => {
    if (spareList.length === 0 && showManage) setShowManage(false);
  }, [spareList.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const spareOptions = [
    ...spareList.map(s => ({ label: s.name, value: s.name })),
    { label: "Add New Spare", value: "__custom" },
  ];

  const handleAddCustomSpare = async () => {
    const val = customName.trim();
    if (!val) return;

    // ✅ Duplicate check — case-insensitive, don't allow adding a spare that already exists
    const duplicate = spareList.find(s => s.name.toLowerCase() === val.toLowerCase());
    if (duplicate) {
      showFeedback("error", `"${duplicate.name}" already exists in the list`);
      setName(duplicate.name); // just select the existing one instead
      setCustomName("");
      setAddingNewMode(false);
      return;
    }

    setAddingSpare(true);
    try {
      const res = await axios.post(`${API}/api/spares`, { name: val });
      setSpareList(prev => {
        const exists = prev.some(s => s.name.toLowerCase() === res.data.name.toLowerCase());
        return exists ? prev : [res.data, ...prev];
      });
      setName(res.data.name); // select the newly-created spare
      setCustomName("");
      setAddingNewMode(false);
      showFeedback("success", `"${res.data.name}" added`);
    } catch (err) {
      console.error(err);
      showFeedback("error", "Failed to add spare");
    } finally {
      setAddingSpare(false);
    }
  };

  // ✅ Rename — starts inline edit mode for that row in the Manage panel
  const startEdit = (spare) => {
    setDeletingId(null);
    setEditingId(spare._id);
    setEditValue(spare.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const confirmEdit = async (spare) => {
    const newName = editValue.trim();
    if (!newName || newName === spare.name) {
      cancelEdit();
      return;
    }

    // ✅ Duplicate check — case-insensitive, block renaming to a name that already exists
    const duplicate = spareList.find(
      s => s._id !== spare._id && s.name.toLowerCase() === newName.toLowerCase()
    );
    if (duplicate) {
      showFeedback("error", `"${duplicate.name}" already exists in the list`);
      return;
    }

    try {
      const res = await axios.put(`${API}/api/spares/${spare._id}`, { name: newName });
      setSpareList(prev => prev.map(s => (s._id === spare._id ? res.data : s)));
      if (name === spare.name) setName(res.data.name);
      showFeedback("success", `Renamed to "${res.data.name}"`);
    } catch (err) {
      console.error(err);
      showFeedback("error", "Rename failed");
    } finally {
      cancelEdit();
    }
  };

  // ✅ Delete — starts inline confirm mode for that row in the Manage panel
  const startDelete = (spare) => {
    setEditingId(null);
    setDeletingId(spare._id);
  };

  const cancelDelete = () => setDeletingId(null);

  const confirmDelete = async (spare) => {
    try {
      await axios.delete(`${API}/api/spares/${spare._id}`);
      setSpareList(prev => prev.filter(s => s._id !== spare._id));
      if (name === spare.name) setName("");
      showFeedback("success", `"${spare.name}" deleted`);
    } catch (err) {
      console.error(err);
      showFeedback("error", "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const amount = Number(qty || 0) * Number(rate || 0);
  const canAddItem = !addingNewMode && !!name && Number(rate) > 0 && !!date;

  const handleAdd = () => {
    if (!name || !rate) {
      showFeedback("error", "Enter Spare Name & Rate");
      return;
    }
    if (!date) {
      showFeedback("error", "Select a date");
      return;
    }

    const newItem = {
      name,
      qty: Number(qty),
      rate: Number(rate),
      amount,
      date,   // per-item date
    };

    setItems([...items, newItem]);

    setName("");
    setCustomName("");
    setAddingNewMode(false);
    setQty(1);
    setRate("");
    setDate(today);   // reset to today for next entry
  };

  const removeItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  const handleSave = () => {
    setSpareCharge(total);
    setSpareItems(items);
    onClose();
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>

        {/* ===== HEADER ===== */}
        <div style={headerBar}>
          <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 8 }}>
            <Wrench size={17} /> Add Spare Items
          </h5>
          <button type="button" onClick={onClose} style={closeBtn} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        {/* ✅ IN-APP FEEDBACK BANNER — replaces window.alert() */}
        {feedback && (
          <div
            style={{
              margin: "12px 20px 0",
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              background: feedback.type === "error" ? "#FEF2F2" : "#F0FDF4",
              color: feedback.type === "error" ? "#991B1B" : "#166534",
              border: `1px solid ${feedback.type === "error" ? "#FECACA" : "#BBF7D0"}`,
            }}
          >
            {feedback.text}
          </div>
        )}

        <div style={{ padding: "16px 20px 20px" }}>

          {/* ===== ADD SPARE CARD ===== */}
          <div style={addCard}>

            {/* Row 1 — Spare Name gets its own full-width row so the optional
                "type new name" sub-row never pushes/misaligns the fields below */}
            <div style={{ marginBottom: 10 }}>
              <label style={label}>Spare Name</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Select
                    options={spareOptions}
                    value={!addingNewMode && name ? { label: name, value: name } : null}
                    onChange={(selected) => {
                      if (!selected) {
                        setName("");
                        setAddingNewMode(false);
                      } else if (selected.value === "__custom") {
                        setAddingNewMode(true);
                        setName("");
                      } else {
                        setName(selected.value);
                        setAddingNewMode(false);
                        setCustomName("");
                      }
                    }}
                    placeholder="Search or add a spare..."
                    isClearable
                    styles={{
                      ...selectStyles,
                      menuPortal: (base) => ({ ...base, zIndex: 99999 }),
                    }}
                    menuPortalTarget={document.body}
                  />
                </div>
                {!addingNewMode && spareList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowManage(prev => !prev)}
                    style={{ ...manageBtn, display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <ListPlus size={13} /> {showManage ? "Hide list" : `Manage (${spareList.length})`}
                  </button>
                )}
              </div>

              {addingNewMode && (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input
                    autoFocus
                    placeholder="Type new spare name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomSpare(); } }}
                    style={{ ...input, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSpare}
                    disabled={addingSpare || !customName.trim()}
                    style={{ ...primaryBtn, opacity: (addingSpare || !customName.trim()) ? 0.6 : 1, display: "flex", alignItems: "center", gap: 5 }}
                  >
                    {addingSpare ? "Adding..." : (<><Plus size={13} /> Add to list</>)}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingNewMode(false); setCustomName(""); }}
                    style={{ ...ghostBtn, display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <X size={13} /> Cancel
                  </button>
                </div>
              )}
            </div>

            {/* ✅ MANAGE SPARES PANEL — only ever shown when there's something to manage */}
            {showManage && spareList.length > 0 && (
              <div style={managePanel}>
                {spareList.map((s) => (
                  <div key={s._id} style={{ ...manageRow, background: deletingId === s._id ? "#FEF2F2" : "#fff" }}>
                    {deletingId === s._id ? (
                      <>
                        <span style={{ color: "#991B1B", fontWeight: 500, fontSize: 13 }}>Delete "{s.name}"?</span>
                        <span style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => confirmDelete(s)} style={{ ...iconBtnStyle, background: RED, color: "#fff", padding: "3px 10px", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Check size={12} /> Yes</button>
                          <button type="button" onClick={cancelDelete} style={{ ...iconBtnStyle, background: "#E5E7EB", color: "#374151", padding: "3px 10px", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><X size={12} /> Cancel</button>
                        </span>
                      </>
                    ) : editingId === s._id ? (
                      <>
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); confirmEdit(s); }
                            if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
                          }}
                          style={{ flex: 1, fontSize: 12.5, padding: "3px 6px", border: "1px solid #93C5FD", borderRadius: 4 }}
                        />
                        <span style={{ display: "flex", gap: 4 }}>
                          <button type="button" onClick={() => confirmEdit(s)} style={{ ...iconBtnStyle, background: GREEN, color: "#fff", padding: "3px 8px", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Check size={12} /> Update</button>
                          <button type="button" onClick={cancelEdit} style={{ ...iconBtnStyle, background: "#E5E7EB", color: "#374151", padding: "3px 8px", fontWeight: 600 }}><X size={12} /></button>
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: 13 }}>{s.name}</span>
                        <span style={{ display: "flex", gap: 2 }}>
                          <button type="button" title="Rename" onClick={() => startEdit(s)} style={{ ...iconBtnStyle, color: "#000000", display: "flex", alignItems: "center" }}><Pencil size={13} /></button>
                          <button type="button" title="Delete" onClick={() => startDelete(s)} style={{ ...iconBtnStyle, color: RED, display: "flex", alignItems: "center" }}><Trash2 size={13} /></button>
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Row 2 — Qty / Rate / Amount / Date / Add, all top-aligned so nothing
                shifts or leaves dead space when Row 1 grows taller */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ width: 70 }}>
                <label style={label}>Qty</label>
                <input type="number" min="1" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} style={smallInput} />
              </div>
              <div style={{ width: 100 }}>
                <label style={label}>Rate ₹</label>
                <input type="number" placeholder="Rate" value={rate} onChange={(e) => setRate(e.target.value)} style={smallInput} />
              </div>
              <div style={{ width: 100 }}>
                <label style={label}>Amount ₹</label>
                <input value={amount} readOnly placeholder="0" style={{ ...smallInput, background: "#F3F4F6", color: "#6B7280" }} />
              </div>
              <div style={{ width: 150 }}>
                <label style={label}>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={smallInput} />
              </div>
              <div style={{ paddingTop: 18 }}>
                <button
                  onClick={handleAdd}
                  style={{ ...primaryBtn, opacity: canAddItem ? 1 : 0.6, display: "flex", alignItems: "center", gap: 5 }}
                  disabled={!canAddItem}
                >
                  <Plus size={13} /> Add Item
                </button>
              </div>
            </div>
          </div>

          {/* ===== ITEMS TABLE ===== */}
          <div style={itemsCard}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Qty</th>
                  <th style={th}>Rate ₹</th>
                  <th style={th}>Amount ₹</th>
                  <th style={th}>Date</th>
                  <th style={{ ...th, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...td, textAlign: "center", color: "#9CA3AF", padding: "18px 6px" }}>
                      No spare items added yet
                    </td>
                  </tr>
                ) : items.map((i, index) => (
                  <tr key={index}>
                    <td style={td}>{i.name}</td>
                    <td style={td}>{i.qty}</td>
                    <td style={td}>{i.rate}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{i.amount}</td>
                    <td style={td}>{i.date ? String(i.date).slice(0, 10) : "-"}</td>
                    <td style={td}>
                      <button onClick={() => removeItem(index)} style={{ ...deleteBtn, display: "flex", alignItems: "center", justifyContent: "center" }} title="Remove">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTAL */}
          <div style={{ textAlign: "right", marginTop: 10, fontWeight: 700, fontSize: 15, color: "#111827" }}>
            Total : <span style={{ color: GREEN }}>₹ {total}</span>
          </div>

        </div>

        {/* ===== ACTION BUTTONS ===== */}
        <div style={footerBar}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button onClick={handleSave} style={saveBtn}>Save</button>
        </div>

      </div>
    </div>
  );
};

export default SparePopup;

/* ===== STYLES ===== */
const overlay = {
  position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
  background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "center",
  alignItems: "center", zIndex: 999
};
const modal = {
  background: "#fff", borderRadius: 12, width: "780px", maxWidth: "95vw",
  maxHeight: "90vh", overflowY: "auto",
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
};
const headerBar = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "16px 20px", borderBottom: `1px solid ${BORDER}`,
};
const closeBtn = {
  border: "none", background: "#F3F4F6", color: "#374151",
  width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 14, lineHeight: 1,
  display: "flex", alignItems: "center", justifyContent: "center",
};
const addCard = {
  border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, marginBottom: 16, background: "#FAFBFC",
};
const itemsCard = {
  border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden",
};
const managePanel = {
  border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 12, maxHeight: 170, overflowY: "auto", background: "#fff",
};
const manageRow = {
  padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between",
  gap: 8, borderBottom: `1px solid #F1F5F9`,
};
const manageBtn = {
  border: `1px solid ${BLUE}`, background: BLUE_SOFT_BG, color: BLUE, fontWeight: 600,
  fontSize: 12, padding: "0 12px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap", height: 32,
};
const label = { fontSize: 11.5, color: GRAY_TEXT, fontWeight: 700, display: "block", marginBottom: 3, letterSpacing: 0.2 };
const input = { padding: "6px 8px", width: "100%", height: 32, border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 13, boxSizing: "border-box" };
const smallInput = { ...input };
const primaryBtn = { background: BLUE, color: "#fff", border: "none", padding: "0 14px", height: 32, borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" };
const ghostBtn = { background: "#fff", color: "#374151", border: `1px solid ${BORDER}`, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 };
const saveBtn = { background: GREEN, color: "#fff", border: "none", padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 };
const deleteBtn = { background: RED, color: "#fff", border: "none", width: 24, height: 24, borderRadius: 5, cursor: "pointer", fontSize: 11, lineHeight: 1 };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "8px 10px", background: "#F9FAFB", color: "#374151", fontSize: 12, fontWeight: 700, borderBottom: `1px solid ${BORDER}` };
const td = { padding: "8px 10px", fontSize: 13, color: "#111827", borderBottom: `1px solid #F1F5F9` };
const footerBar = {
  display: "flex", justifyContent: "flex-end", gap: 10,
  padding: "14px 20px", borderTop: `1px solid ${BORDER}`,
};