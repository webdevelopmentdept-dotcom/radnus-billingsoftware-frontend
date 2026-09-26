import React, { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import { Package, X, Plus, Pencil, Trash2, Check, ListPlus, RotateCcw, Undo2 } from "lucide-react";

/* ================= THEME — amber, matches the old Raw Spare section ================= */
const AMBER = "#D97706";
const AMBER_SOFT_BG = "#FFFBEB";
const AMBER_BORDER = "#FDE9C0";
const BLUE = "#2563EB";
const BLUE_SOFT_BG = "#EFF6FF";
const GREEN = "#16A34A";
const RED = "#DC2626";
const RED_SOFT_BG = "#FEF2F2";
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

/* =====================================================
   RawSparePopup — shop-level purchase log for THIS job sheet.
   Same master spare-name list as SparePopup (/api/spares), same
   Manage (rename/delete) panel. Does NOT hit the DB directly —
   "Save" here only updates the Job Sheet's rawSpareItems state via
   setRawSpareItems, exactly like SparePopup does for spareItems.
   Actual DB persistence happens when the Job Sheet "Update" button
   is clicked (rawSpareItems is already appended in handleSave/handleUpdate).

   ✅ rawSpareBaselineAmount prop: the CUMULATIVE raw-spare total that
   existed the exact moment the job was last rebilled (comes from
   JobSheetPage's rawSpareBaselineRef.current, itself loaded from
   service.rawSpareBaseline, set by the backend /rebill route). Exactly the
   same amount-based "before rebill" split SparePopup already does for
   spareItems — walks rawItems IN ORDER and marks an item "before rebill" as
   long as the running sum-so-far is still under this baseline.

   ✅ RETURN. A Raw Spare purchase entry can be marked Returned (e.g. bought
   wrong part, sent back to the supplier), exactly like Spare Used already
   supports. Same checkbox-select → Return bar (date + remark) →
   Confirm/Undo workflow as SparePopup, same isReturned/returnDate/
   returnReason fields on the item.
   A returned raw item:
   - is excluded from the Spare Report (handled in SpareReportPage.jsx)
   - is excluded from "available stock" in SparePopup's "From Raw Stock" tab
     (handled in SparePopup.jsx)
   - shows up in the Spare Return Report (already scans rawSpareItems there)

   ✅ SYNCED RETURN — real two-way sync (moved to SparePopup.jsx). When a
   "From Raw Stock" Spare Used item is Returned in SparePopup, SparePopup
   now directly mutates its own live copy of rawSpareItems (matching by
   name + qty) and marks the corresponding Raw Spare purchase entry as
   Returned too — and vice-versa on Undo. Both popups' "Save" writes the
   same synced array back to the job, so this popup needs NO extra logic
   for that: it just displays whatever rawSpareItems it's handed, same as
   before. (Earlier this component tried to compute its own "back in
   stock" badge from a `spareUsedItems` prop that was never actually
   passed in — that's removed now; the real sync in SparePopup makes it
   redundant, since a truly-synced item just shows here as "Returned".)
===================================================== */
const RawSparePopup = ({
  onClose,
  setRawSpareItems,
  existingRawItems = [],
  rawSpareBaselineAmount = 0,
}) => {
  const today = new Date().toISOString().split("T")[0];
  const API = import.meta.env.VITE_API_URL;

  const [spareList, setSpareList] = useState([]);
  const [showManage, setShowManage] = useState(false);

  const [feedback, setFeedback] = useState(null);
  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    window.clearTimeout(showFeedback._t);
    showFeedback._t = window.setTimeout(() => setFeedback(null), 3000);
  };

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchSpares = () => {
    axios.get(`${API}/api/spares`)
      .then(res => setSpareList(res.data))
      .catch(err => console.error("Spare list fetch error:", err));
  };

  useEffect(() => {
    fetchSpares();
  }, []);

  useEffect(() => {
    if (spareList.length === 0 && showManage) setShowManage(false);
  }, [spareList.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const spareOptions = [
    ...spareList.map(s => ({ label: s.name, value: s.name })),
    { label: "Add New Spare", value: "__custom" },
  ];

  const [rawName, setRawName] = useState("");
  const [rawAddingNewMode, setRawAddingNewMode] = useState(false);
  const [rawCustomName, setRawCustomName] = useState("");
  const [rawAddingSpare, setRawAddingSpare] = useState(false);

  const [rawQty, setRawQty] = useState(1);
  const [rawRate, setRawRate] = useState("");
  const [rawDate, setRawDate] = useState(today);
  const [rawItems, setRawItems] = useState(existingRawItems);

  // ✅ return workflow state, same pattern as SparePopup
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [returnDateInput, setReturnDateInput] = useState(today);
  const [returnReasonInput, setReturnReasonInput] = useState("");

  const handleAddCustomRawSpare = async () => {
    const val = rawCustomName.trim();
    if (!val) return;

    const duplicate = spareList.find(s => s.name.toLowerCase() === val.toLowerCase());
    if (duplicate) {
      showFeedback("error", `"${duplicate.name}" already exists in the list`);
      setRawName(duplicate.name);
      setRawCustomName("");
      setRawAddingNewMode(false);
      return;
    }

    setRawAddingSpare(true);
    try {
      const res = await axios.post(`${API}/api/spares`, { name: val });
      setSpareList(prev => {
        const exists = prev.some(s => s.name.toLowerCase() === res.data.name.toLowerCase());
        return exists ? prev : [res.data, ...prev];
      });
      setRawName(res.data.name);
      setRawCustomName("");
      setRawAddingNewMode(false);
      showFeedback("success", `"${res.data.name}" added`);
    } catch (err) {
      console.error(err);
      showFeedback("error", "Failed to add spare");
    } finally {
      setRawAddingSpare(false);
    }
  };

  const rawAmount = Number(rawQty || 0) * Number(rawRate || 0);
  const canAddRawItem = !rawAddingNewMode && !!rawName && Number(rawRate) > 0 && !!rawDate;

  const handleAddRaw = () => {
    if (!rawName || !rawRate) {
      showFeedback("error", "Enter Spare Name & Rate for Raw Spare");
      return;
    }
    if (!rawDate) {
      showFeedback("error", "Select a Raw Spare date");
      return;
    }

    const newItem = {
      name: rawName, qty: Number(rawQty), rate: Number(rawRate), amount: rawAmount, date: rawDate,
      isReturned: false, returnDate: null, returnReason: "",
    };
    setRawItems([...rawItems, newItem]);

    setRawName("");
    setRawCustomName("");
    setRawAddingNewMode(false);
    setRawQty(1);
    setRawRate("");
    setRawDate(today);
  };

  const removeRawItem = (index) => {
    setRawItems(rawItems.filter((_, i) => i !== index));
    setSelectedIndices(prev => prev.filter(i => i !== index).map(i => (i > index ? i - 1 : i)));
  };

  /* ===================================================================
     RETURN WORKFLOW (mirrors SparePopup)
  =================================================================== */
  const toggleSelect = (index) => {
    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const activeSelectableIndices = rawItems
    .map((it, idx) => (!it.isReturned ? idx : null))
    .filter(idx => idx !== null);

  const allActiveSelected =
    activeSelectableIndices.length > 0 &&
    activeSelectableIndices.every(idx => selectedIndices.includes(idx));

  const toggleSelectAll = () => {
    if (allActiveSelected) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(activeSelectableIndices);
    }
  };

  const quickReturnOne = (index) => {
    setSelectedIndices([index]);
    setReturnDateInput(today);
    setReturnReasonInput("");
  };

  const cancelReturnBar = () => {
    setSelectedIndices([]);
    setReturnDateInput(today);
    setReturnReasonInput("");
  };

  const confirmReturn = () => {
    if (selectedIndices.length === 0) return;
    if (!returnDateInput) {
      showFeedback("error", "Select a Return Date");
      return;
    }
    const chosenSet = new Set(selectedIndices);
    setRawItems(prev => prev.map((it, i) =>
      chosenSet.has(i)
        ? { ...it, isReturned: true, returnDate: returnDateInput, returnReason: returnReasonInput.trim() }
        : it
    ));
    showFeedback("success", selectedIndices.length > 1
      ? `${selectedIndices.length} items marked as Returned`
      : "Marked as Returned");
    setSelectedIndices([]);
    setReturnDateInput(today);
    setReturnReasonInput("");
  };

  const undoReturn = (index) => {
    setRawItems(prev => prev.map((it, i) =>
      i === index
        ? { ...it, isReturned: false, returnDate: null, returnReason: "" }
        : it
    ));
    showFeedback("success", "Return undone");
  };

  // cumulative/current totals exclude Returned items, same as SparePopup,
  // so a returned purchase doesn't inflate the Raw Spare total.
  const cumulativeTotal = rawItems
    .filter(i => !i.isReturned)
    .reduce((sum, i) => sum + i.amount, 0);

  let runningSum = 0;
  const itemsWithCycle = rawItems.map((item, idx) => {
    const isOld = runningSum < rawSpareBaselineAmount;
    runningSum += item.amount;
    return { item, idx, isOld };
  });

  const currentCycleItems = itemsWithCycle.filter(({ isOld }) => !isOld);
  const rawTotal = currentCycleItems
    .filter(({ item }) => !item.isReturned)
    .reduce((sum, { item }) => sum + item.amount, 0);
  const hasRebillSplit = rawSpareBaselineAmount > 0;

  const returnedItems = rawItems.filter(i => i.isReturned);
  const returnedTotal = returnedItems.reduce((sum, i) => sum + i.amount, 0);

  /* ===================================================================
     MANAGE (rename/delete) — shared master list, same as SparePopup
  =================================================================== */
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
      if (rawName === spare.name) setRawName(res.data.name);
      showFeedback("success", `Renamed to "${res.data.name}"`);
    } catch (err) {
      console.error(err);
      showFeedback("error", "Rename failed");
    } finally {
      cancelEdit();
    }
  };

  const startDelete = (spare) => {
    setEditingId(null);
    setDeletingId(spare._id);
  };

  const cancelDelete = () => setDeletingId(null);

  const confirmDelete = async (spare) => {
    try {
      await axios.delete(`${API}/api/spares/${spare._id}`);
      setSpareList(prev => prev.filter(s => s._id !== spare._id));
      if (rawName === spare.name) setRawName("");
      showFeedback("success", `"${spare.name}" deleted`);
    } catch (err) {
      console.error(err);
      showFeedback("error", "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = () => {
    if (setRawSpareItems) setRawSpareItems(rawItems);
    onClose();
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>

        {/* ===== HEADER ===== */}
        <div style={headerBar}>
          <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 8 }}>
            <Package size={17} color={AMBER} /> Raw Spare <span style={{ fontSize: 12, fontWeight: 500, color: "#B45309" }}>(shop purchase — stock, not billed)</span>
          </h5>
          <button type="button" onClick={onClose} style={closeBtn} aria-label="Close">
            <X size={15} />
          </button>
        </div>

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

        {showManage && spareList.length > 0 && (
          <div style={{ margin: "12px 20px 0" }}>
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
          </div>
        )}

        <div style={{ padding: "16px 20px 20px" }}>

          <div style={{ ...addCard, background: AMBER_SOFT_BG, borderColor: AMBER_BORDER }}>
            <div style={{ marginBottom: 10 }}>
              <label style={label}>Spare Name</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Select
                    options={spareOptions}
                    value={!rawAddingNewMode && rawName ? { label: rawName, value: rawName } : null}
                    onChange={(selected) => {
                      if (!selected) { setRawName(""); setRawAddingNewMode(false); }
                      else if (selected.value === "__custom") { setRawAddingNewMode(true); setRawName(""); }
                      else { setRawName(selected.value); setRawAddingNewMode(false); setRawCustomName(""); }
                    }}
                    placeholder="Search or add a spare..."
                    isClearable
                    styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 99999 }) }}
                    menuPortalTarget={document.body}
                  />
                </div>
                {spareList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowManage(prev => !prev)}
                    style={{ ...manageBtn, display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <ListPlus size={13} /> {showManage ? "Hide list" : `Manage (${spareList.length})`}
                  </button>
                )}
              </div>

              {rawAddingNewMode && (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input
                    autoFocus
                    placeholder="Type new spare name"
                    value={rawCustomName}
                    onChange={(e) => setRawCustomName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomRawSpare(); } }}
                    style={{ ...input, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomRawSpare}
                    disabled={rawAddingSpare || !rawCustomName.trim()}
                    style={{ ...primaryBtn, background: AMBER, opacity: (rawAddingSpare || !rawCustomName.trim()) ? 0.6 : 1, display: "flex", alignItems: "center", gap: 5 }}
                  >
                    {rawAddingSpare ? "Adding..." : (<><Plus size={13} /> Add to list</>)}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRawAddingNewMode(false); setRawCustomName(""); }}
                    style={{ ...ghostBtn, display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <X size={13} /> Cancel
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ width: 70 }}>
                <label style={label}>Qty</label>
                <input type="number" min="1" placeholder="Qty" value={rawQty} onChange={(e) => setRawQty(e.target.value)} style={smallInput} />
              </div>
              <div style={{ width: 100 }}>
                <label style={label}>Rate ₹</label>
                <input type="number" placeholder="Rate" value={rawRate} onChange={(e) => setRawRate(e.target.value)} style={smallInput} />
              </div>
              <div style={{ width: 100 }}>
                <label style={label}>Amount ₹</label>
                <input value={rawAmount} readOnly placeholder="0" style={{ ...smallInput, background: "#F3F4F6", color: "#6B7280" }} />
              </div>
              <div style={{ width: 150 }}>
                <label style={label}>Date</label>
                <input type="date" value={rawDate} onChange={(e) => setRawDate(e.target.value)} style={smallInput} />
              </div>
              <div style={{ paddingTop: 18 }}>
                <button
                  onClick={handleAddRaw}
                  style={{ ...primaryBtn, background: AMBER, opacity: canAddRawItem ? 1 : 0.6, display: "flex", alignItems: "center", gap: 5 }}
                  disabled={!canAddRawItem}
                >
                  <Plus size={13} /> Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Return bar, identical workflow to Spare Used */}
          {selectedIndices.length > 0 && (
            <div style={returnBar}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", paddingBottom: 7, whiteSpace: "nowrap" }}>
                  {selectedIndices.length} item{selectedIndices.length > 1 ? "s" : ""} selected for Return
                </div>
                <div style={{ width: 160 }}>
                  <label style={{ ...label, color: "#991B1B" }}>Return Date</label>
                  <input
                    type="date"
                    value={returnDateInput}
                    onChange={(e) => setReturnDateInput(e.target.value)}
                    style={smallInput}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ ...label, color: "#991B1B" }}>Remark (optional)</label>
                  <input
                    placeholder="e.g. Wrong part, sent back to supplier..."
                    value={returnReasonInput}
                    onChange={(e) => setReturnReasonInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmReturn(); } }}
                    style={input}
                  />
                </div>
                <button
                  type="button"
                  onClick={confirmReturn}
                  style={{ ...iconBtnStyle, background: RED, color: "#fff", padding: "7px 14px", fontWeight: 600, display: "flex", alignItems: "center", gap: 5, height: 32 }}
                >
                  <Check size={13} /> Confirm Return {selectedIndices.length > 1 ? `(${selectedIndices.length})` : ""}
                </button>
                <button
                  type="button"
                  onClick={cancelReturnBar}
                  style={{ ...iconBtnStyle, background: "#E5E7EB", color: "#374151", padding: "7px 14px", fontWeight: 600, height: 32 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={itemsCard}>
            <table style={table}>
              <thead>
                <tr>
                  {/* select-all checkbox column, same as Spare Used */}
                  <th style={{ ...th, width: 34 }}>
                    {activeSelectableIndices.length > 0 && (
                      <input
                        type="checkbox"
                        checked={allActiveSelected}
                        onChange={toggleSelectAll}
                        title="Select all active items"
                        style={{ cursor: "pointer" }}
                      />
                    )}
                  </th>
                  <th style={th}>Name</th>
                  <th style={th}>Qty</th>
                  <th style={th}>Rate ₹</th>
                  <th style={th}>Amount ₹</th>
                  <th style={th}>Date</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, width: 70 }}></th>
                </tr>
              </thead>
              <tbody>
                {itemsWithCycle.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...td, textAlign: "center", color: "#9CA3AF", padding: "18px 6px" }}>
                      No raw spare purchases added yet
                    </td>
                  </tr>
                ) : itemsWithCycle.map(({ item: i, idx: index, isOld }) => (
                  <React.Fragment key={index}>
                    <tr style={{ background: i.isReturned ? "#FFF5F5" : (isOld ? "#F9FAFB" : undefined), opacity: i.isReturned ? 0.75 : 1 }}>
                      <td style={td}>
                        {!i.isReturned && (
                          <input
                            type="checkbox"
                            checked={selectedIndices.includes(index)}
                            onChange={() => toggleSelect(index)}
                            style={{ cursor: "pointer" }}
                          />
                        )}
                      </td>
                      <td style={{ ...td, color: isOld ? "#9CA3AF" : "#111827", textDecoration: i.isReturned ? "line-through" : "none" }}>
                        {i.name}
                        {isOld && (
                          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F1F5F9", padding: "1px 6px", borderRadius: 10 }}>
                            Before Rebill
                          </span>
                        )}
                      </td>
                      <td style={{ ...td, color: isOld ? "#9CA3AF" : "#111827" }}>{i.qty}</td>
                      <td style={{ ...td, color: isOld ? "#9CA3AF" : "#111827" }}>{i.rate}</td>
                      <td style={{ ...td, fontWeight: 600, color: isOld ? "#9CA3AF" : "#111827" }}>{i.amount}</td>
                      <td style={{ ...td, color: isOld ? "#9CA3AF" : "#111827" }}>{i.date ? String(i.date).slice(0, 10) : "-"}</td>
                      <td style={td}>
                        {i.isReturned ? (
                          <span style={returnedBadge}>Returned</span>
                        ) : (
                          <span style={activeBadge}>Active</span>
                        )}
                      </td>
                      <td style={td}>
                        <span style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          {i.isReturned ? (
                            <button onClick={() => undoReturn(index)} style={{ ...undoBtn, display: "flex", alignItems: "center", justifyContent: "center" }} title="Undo Return">
                              <Undo2 size={12} />
                            </button>
                          ) : (
                            <button onClick={() => quickReturnOne(index)} style={{ ...returnBtn, display: "flex", alignItems: "center", justifyContent: "center" }} title="Return this item">
                              <RotateCcw size={12} />
                            </button>
                          )}
                          <button onClick={() => removeRawItem(index)} style={{ ...deleteBtn, display: "flex", alignItems: "center", justifyContent: "center" }} title="Remove">
                            <Trash2 size={12} />
                          </button>
                        </span>
                      </td>
                    </tr>

                    {i.isReturned && (i.returnReason || i.returnDate) && (
                      <tr>
                        <td colSpan={8} style={{ padding: "0 10px 8px", fontSize: 11.5, color: "#991B1B", borderBottom: `1px solid #F1F5F9` }}>
                          ↳ Returned {i.returnDate ? `on ${String(i.returnDate).slice(0, 10)}` : ""}{i.returnReason ? ` — ${i.returnReason}` : ""}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginTop: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            {returnedItems.length > 0 && (
              <div style={{ fontWeight: 600, fontSize: 13, color: RED }}>
                Returned ({returnedItems.length}) : ₹ {returnedTotal}
              </div>
            )}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
                Raw Spare Total {hasRebillSplit ? "(this cycle)" : ""} : <span style={{ color: AMBER }}>₹ {rawTotal}</span>
              </div>
              {hasRebillSplit && cumulativeTotal !== rawTotal && (
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                  Lifetime total (all cycles): ₹ {cumulativeTotal}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ===== ACTION BUTTONS ===== */}
        <div style={footerBar}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button onClick={handleSave} style={{ ...saveBtn, background: AMBER }}>Save</button>
        </div>

      </div>
    </div>
  );
};

export default RawSparePopup;

/* ===== STYLES (same as SparePopup, kept identical for visual consistency) ===== */
const overlay = {
  position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
  background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "center",
  alignItems: "center", zIndex: 999
};
const modal = {
  background: "#fff", borderRadius: 12, width: "820px", maxWidth: "95vw",
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
const returnBar = {
  border: `1px solid #FCA5A5`, borderRadius: 10, padding: 12, marginBottom: 14, background: RED_SOFT_BG,
};
const itemsCard = {
  border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden",
};
const managePanel = {
  border: `1px solid ${BORDER}`, borderRadius: 8, maxHeight: 170, overflowY: "auto", background: "#fff",
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
const returnBtn = { background: "#D97706", color: "#fff", border: "none", width: 24, height: 24, borderRadius: 5, cursor: "pointer", fontSize: 11, lineHeight: 1 };
const undoBtn = { background: "#64748B", color: "#fff", border: "none", width: 24, height: 24, borderRadius: 5, cursor: "pointer", fontSize: 11, lineHeight: 1 };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "8px 10px", background: "#F9FAFB", color: "#374151", fontSize: 12, fontWeight: 700, borderBottom: `1px solid ${BORDER}` };
const td = { padding: "8px 10px", fontSize: 13, color: "#111827", borderBottom: `1px solid #F1F5F9` };
const returnedBadge = { display: "inline-block", padding: "2px 8px", borderRadius: 999, background: RED_SOFT_BG, color: RED, fontSize: 11, fontWeight: 700 };
const activeBadge = { display: "inline-block", padding: "2px 8px", borderRadius: 999, background: "#F0FDF4", color: "#16A34A", fontSize: 11, fontWeight: 700 };
const footerBar = {
  display: "flex", justifyContent: "flex-end", gap: 10,
  padding: "14px 20px", borderTop: `1px solid ${BORDER}`,
};