import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Select from "react-select";
import { Wrench, X, Plus, Pencil, Trash2, Check, ListPlus, RotateCcw, Undo2, Package, Store } from "lucide-react";

/* ================= THEME (matches rest of app) ================= */
const BLUE = "#2563EB";
const BLUE_SOFT_BG = "#EFF6FF";
const GREEN = "#16A34A";
const RED = "#DC2626";
const RED_SOFT_BG = "#FEF2F2";
const AMBER = "#D97706";
const AMBER_SOFT_BG = "#FFFBEB";
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

/* ✅ spareBaselineAmount prop: the CUMULATIVE spare total that existed
   the exact moment the job was last rebilled (comes from JobSheetPage's
   spareBaselineRef.current, which is itself loaded from service.spareBaseline
   saved by the backend /rebill route). This popup walks the items array IN
   ORDER and marks an item "before rebill" as long as the running sum-so-far
   is still under this baseline.

   ✅ RAW STOCK LINKING — a spare already logged in Raw Spare can be billed
   here via "From Raw Stock" instead of typed in again as a fresh Market item.
   The Spare Name dropdown then only shows names with stock left, qty is
   capped, and — NEW in this update — Rate is AUTO-FILLED from the weighted
   average purchase rate of that spare's Raw Spare entries, so the person
   never has to type Rate/Amount again — just pick the spare, adjust Qty if
   needed, pick a Date, and Add Item.

   ✅ DEFAULT MODE — this popup now opens in "From Raw Stock" mode by default
   whenever there is any stock left to bill from. It only defaults to
   "Market Purchase" when there's nothing in Raw Stock to pull from. */
const SparePopup = ({
  onClose,
  setSpareCharge,
  setSpareItems,
  existingItems = [],
  spareBaselineAmount = 0,
  existingRawItems = [],   // Raw Spare's purchase log (read-only here)
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
    { label: "Others (Add New)", value: "__custom" },
  ];

  /* ===================================================================
     SPARE USED — bills the customer
  =================================================================== */
  const [name, setName] = useState("");
  const [addingNewMode, setAddingNewMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [addingSpare, setAddingSpare] = useState(false);

  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState("");
  const [date, setDate] = useState(today);
  const [items, setItems] = useState(existingItems);

  /* ✅ NEW — purchase info per raw-spare name: total qty bought AND total
     amount spent, so we can compute a weighted-average rate to auto-fill.
     Raw Spare's own purchase log (existingRawItems) is NEVER modified here. */
  const rawStockInfoMap = useMemo(() => {
    const map = {};
    (existingRawItems || []).forEach((r) => {
      const key = (r.name || "").trim();
      if (!key) return;
      if (!map[key]) map[key] = { totalQty: 0, totalAmount: 0 };
      map[key].totalQty += Number(r.qty || 0);
      map[key].totalAmount += Number(r.amount || 0);
    });
    return map;
  }, [existingRawItems]);

  const rawStockQtyMap = useMemo(() => {
    const map = {};
    Object.keys(rawStockInfoMap).forEach((k) => { map[k] = rawStockInfoMap[k].totalQty; });
    return map;
  }, [rawStockInfoMap]);

  /* total qty already billed as Spare Used with source:"raw" on THIS job
     sheet so far (across cycles — a spare already consumed stays consumed). */
  const usedFromStockQtyMap = useMemo(() => {
    const map = {};
    items.forEach((it) => {
      if (it.source !== "raw") return;
      const key = (it.name || "").trim();
      if (!key) return;
      map[key] = (map[key] || 0) + Number(it.qty || 0);
    });
    return map;
  }, [items]);

  const getAvailableStock = (spareName) => {
    const key = (spareName || "").trim();
    const purchased = rawStockQtyMap[key] || 0;
    const used = usedFromStockQtyMap[key] || 0;
    return Math.max(0, purchased - used);
  };

  /* ✅ NEW — weighted-average purchase rate for a raw-stock spare name */
  const getAvgRawRate = (spareName) => {
    const key = (spareName || "").trim();
    const info = rawStockInfoMap[key];
    if (!info || info.totalQty <= 0) return 0;
    return Math.round((info.totalAmount / info.totalQty) * 100) / 100;
  };

  const rawStockOptions = Object.keys(rawStockQtyMap)
    .filter((n) => getAvailableStock(n) > 0)
    .sort((a, b) => a.localeCompare(b))
    .map((n) => ({ label: `${n}  (Available: ${getAvailableStock(n)})`, value: n }));

  /* ✅ NEW — default to "From Raw Stock" whenever there IS stock to bill
     from; only fall back to "Market Purchase" when there's none. Computed
     once, lazily, at mount — reads existingRawItems/existingItems directly
     (not the memoized maps above, which don't exist yet at this point). */
  const computeInitialSourceMode = () => {
    const purchased = {};
    (existingRawItems || []).forEach((r) => {
      const k = (r.name || "").trim();
      if (!k) return;
      purchased[k] = (purchased[k] || 0) + Number(r.qty || 0);
    });
    const used = {};
    (existingItems || []).forEach((it) => {
      if (it.source !== "raw") return;
      const k = (it.name || "").trim();
      if (!k) return;
      used[k] = (used[k] || 0) + Number(it.qty || 0);
    });
    const hasStock = Object.keys(purchased).some((k) => purchased[k] - (used[k] || 0) > 0);
    return hasStock ? "raw" : "market";
  };

  const [sourceMode, setSourceMode] = useState(computeInitialSourceMode);

  const [selectedIndices, setSelectedIndices] = useState([]);
  const [returnDateInput, setReturnDateInput] = useState(today);
  const [returnReasonInput, setReturnReasonInput] = useState("");

  const handleAddCustomSpare = async () => {
    const val = customName.trim();
    if (!val) return;

    const duplicate = spareList.find(s => s.name.toLowerCase() === val.toLowerCase());
    if (duplicate) {
      showFeedback("error", `"${duplicate.name}" already exists in the list`);
      setName(duplicate.name);
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
      setName(res.data.name);
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

  const amount = Number(qty || 0) * Number(rate || 0);
  const availableForSelectedRaw = sourceMode === "raw" ? getAvailableStock(name) : null;
  const canAddItem =
    !addingNewMode &&
    !!name &&
    Number(rate) > 0 &&
    !!date &&
    (sourceMode !== "raw" || Number(qty || 0) <= availableForSelectedRaw);

  const handleAdd = () => {
    if (!name || !rate) {
      showFeedback("error", "Enter Spare Name & Rate");
      return;
    }
    if (!date) {
      showFeedback("error", "Select a date");
      return;
    }
    if (sourceMode === "raw" && Number(qty || 0) > getAvailableStock(name)) {
      showFeedback("error", `Only ${getAvailableStock(name)} unit(s) of "${name}" left in Raw Stock`);
      return;
    }

    const newItem = {
      name, qty: Number(qty), rate: Number(rate), amount, date,
      isReturned: false, returnDate: null, returnReason: "",
      source: sourceMode,
    };
    setItems([...items, newItem]);

    setName("");
    setCustomName("");
    setAddingNewMode(false);
    setQty(1);
    setRate("");
    setDate(today);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
    setSelectedIndices(prev => prev.filter(i => i !== index).map(i => (i > index ? i - 1 : i)));
  };

  const toggleSelect = (index) => {
    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const activeSelectableIndices = items
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
    setItems(prev => prev.map((it, i) =>
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
    setItems(prev => prev.map((it, i) =>
      i === index
        ? { ...it, isReturned: false, returnDate: null, returnReason: "" }
        : it
    ));
    showFeedback("success", "Return undone");
  };

  let runningSum = 0;
  const itemsWithCycle = items.map((item, idx) => {
    const isOld = runningSum < spareBaselineAmount;
    runningSum += item.amount;
    return { item, idx, isOld };
  });

  const currentCycleItems = itemsWithCycle.filter(({ isOld }) => !isOld);
  const total = currentCycleItems
    .filter(({ item }) => !item.isReturned)
    .reduce((sum, { item }) => sum + item.amount, 0);

  const cumulativeTotal = items
    .filter(i => !i.isReturned)
    .reduce((sum, i) => sum + i.amount, 0);

  const returnedItems = items.filter(i => i.isReturned);
  const returnedTotal = returnedItems.reduce((sum, i) => sum + i.amount, 0);

  const hasRebillSplit = spareBaselineAmount > 0;

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
      if (name === spare.name) setName(res.data.name);
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
      if (name === spare.name) setName("");
      showFeedback("success", `"${spare.name}" deleted`);
    } catch (err) {
      console.error(err);
      showFeedback("error", "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = () => {
    setSpareCharge(cumulativeTotal);
    setSpareItems(items);
    onClose();
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>

        {/* ===== HEADER ===== */}
        <div style={headerBar}>
          <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 8 }}>
            <Wrench size={17} /> Spare Items
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

          {/* ===== SPARE USED CARD ===== */}
          <div style={sectionHeader}>
            <Wrench size={14} /> Spare Used <span style={sectionSub}>(bills the customer)</span>
          </div>
          <div style={addCard}>

            {/* ✅ CHANGED — "From Raw Stock" now shown FIRST since it's the default,
                emoji replaced with lucide icons */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => {
                  if (rawStockOptions.length === 0) return;
                  setSourceMode("raw"); setName(""); setAddingNewMode(false); setRate("");
                }}
                disabled={rawStockOptions.length === 0}
                title={rawStockOptions.length === 0 ? "No Raw Spare stock left to use" : "Bill a spare already logged in Raw Spare"}
                style={{
                  ...(sourceMode === "raw" ? sourceBtnActiveRaw : sourceBtn),
                  opacity: rawStockOptions.length === 0 ? 0.5 : 1,
                  cursor: rawStockOptions.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                <Package size={14} /> From Raw Stock {rawStockOptions.length > 0 ? `(${rawStockOptions.length})` : ""}
              </button>
              <button
                type="button"
                onClick={() => { setSourceMode("market"); setName(""); setAddingNewMode(false); setRate(""); }}
                style={sourceMode === "market" ? sourceBtnActiveMarket : sourceBtn}
              >
                <Store size={14} /> Market Purchase
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 10 }}>
              {sourceMode === "raw"
                ? "Rate is auto-filled from Raw Spare's purchase cost — just pick the spare, check Qty, and choose a Date."
                : "This spare is bought fresh for this job (not tracked as shop stock)."}
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={label}>Spare Name</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Select
                    options={sourceMode === "raw" ? rawStockOptions : spareOptions}
                    value={
                      !addingNewMode && name
                        ? (sourceMode === "raw"
                            ? (rawStockOptions.find(o => o.value === name) || { label: name, value: name })
                            : { label: name, value: name })
                        : null
                    }
                    onChange={(selected) => {
                      if (!selected) {
                        setName(""); setAddingNewMode(false);
                        if (sourceMode === "raw") setRate("");
                        return;
                      }
                      if (selected.value === "__custom") {
                        setAddingNewMode(true); setName("");
                        return;
                      }
                      setName(selected.value);
                      setAddingNewMode(false);
                      setCustomName("");
                      // ✅ NEW — auto-fill Rate from Raw Spare's own purchase cost,
                      // and default Qty to 1 (capped later by availability check)
                      if (sourceMode === "raw") {
                        const avgRate = getAvgRawRate(selected.value);
                        setRate(avgRate > 0 ? String(avgRate) : "");
                        setQty(1);
                      }
                    }}
                    placeholder={sourceMode === "raw" ? "Select from Raw Stock..." : "Search or add a spare..."}
                    isClearable
                    styles={{ ...selectStyles, menuPortal: (base) => ({ ...base, zIndex: 99999 }) }}
                    menuPortalTarget={document.body}
                  />
                </div>
                {sourceMode === "market" && spareList.length > 0 && (
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

            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ width: 70 }}>
                <label style={label}>Qty</label>
                <input type="number" min="1" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} style={smallInput} />
              </div>
              <div style={{ width: 100 }}>
                <label style={label}>Rate ₹ {sourceMode === "raw" && <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(auto)</span>}</label>
                <input
                  type="number"
                  placeholder="Rate"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  readOnly={sourceMode === "raw"}
                  style={sourceMode === "raw" ? { ...smallInput, background: "#F3F4F6", color: "#6B7280", cursor: "not-allowed" } : smallInput}
                />
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

            {sourceMode === "raw" && name && (
              <div style={{
                fontSize: 11.5, marginTop: 8, fontWeight: 600,
                color: Number(qty || 0) > getAvailableStock(name) ? RED : "#B45309",
              }}>
                Raw Stock available for "{name}": {getAvailableStock(name)} unit(s)
                {Number(qty || 0) > getAvailableStock(name) && " — reduce Qty to add"}
              </div>
            )}
          </div>

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
                    placeholder="e.g. Defective, didn't fix issue..."
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
                  <th style={th}>Source</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, width: 70 }}></th>
                </tr>
              </thead>
              <tbody>
                {itemsWithCycle.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...td, textAlign: "center", color: "#9CA3AF", padding: "18px 6px" }}>
                      No spare items used yet
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
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                          background: i.source === "raw" ? AMBER_SOFT_BG : BLUE_SOFT_BG,
                          color: i.source === "raw" ? "#B45309" : "#1D4ED8",
                        }}>
                          {i.source === "raw" ? "Raw Stock" : "Market"}
                        </span>
                      </td>
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
                          <button onClick={() => removeItem(index)} style={{ ...deleteBtn, display: "flex", alignItems: "center", justifyContent: "center" }} title="Remove">
                            <Trash2 size={12} />
                          </button>
                        </span>
                      </td>
                    </tr>

                    {i.isReturned && (i.returnReason || i.returnDate) && (
                      <tr>
                        <td colSpan={9} style={{ padding: "0 10px 8px", fontSize: 11.5, color: "#991B1B", borderBottom: `1px solid #F1F5F9` }}>
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
                Spare Used Total {hasRebillSplit ? "(this cycle)" : ""} : <span style={{ color: GREEN }}>₹ {total}</span>
              </div>
              {hasRebillSplit && cumulativeTotal !== total && (
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
const sectionHeader = {
  display: "flex", alignItems: "center", gap: 6,
  fontSize: 13, fontWeight: 700, color: BLUE, marginBottom: 8,
};
const sectionSub = { fontSize: 11, fontWeight: 500, color: "#6B7280" };
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
const sourceBtn = {
  border: `1px solid ${BORDER}`, background: "#fff", color: "#374151", fontWeight: 700,
  fontSize: 12.5, padding: "8px 14px", borderRadius: 8, cursor: "pointer", flex: 1,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
};
const sourceBtnActiveMarket = { ...sourceBtn, background: BLUE_SOFT_BG, borderColor: BLUE, color: BLUE };
const sourceBtnActiveRaw = { ...sourceBtn, background: AMBER_SOFT_BG, borderColor: AMBER, color: "#B45309" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", padding: "8px 10px", background: "#F9FAFB", color: "#374151", fontSize: 12, fontWeight: 700, borderBottom: `1px solid ${BORDER}` };
const td = { padding: "8px 10px", fontSize: 13, color: "#111827", borderBottom: `1px solid #F1F5F9` };
const returnedBadge = { display: "inline-block", padding: "2px 8px", borderRadius: 999, background: RED_SOFT_BG, color: RED, fontSize: 11, fontWeight: 700 };
const activeBadge = { display: "inline-block", padding: "2px 8px", borderRadius: 999, background: "#F0FDF4", color: "#16A34A", fontSize: 11, fontWeight: 700 };
const footerBar = {
  display: "flex", justifyContent: "flex-end", gap: 10,
  padding: "14px 20px", borderTop: `1px solid ${BORDER}`,
};