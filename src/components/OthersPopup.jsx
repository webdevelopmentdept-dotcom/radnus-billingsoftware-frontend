import React, { useState } from "react";

const CATEGORIES = ["Courier", "Petrol", "Return", "Food", "Transport", "Other"];

/* ✅ NEW — othersBaselineAmount prop: the CUMULATIVE others total that existed
   the exact moment the job was last rebilled (comes from JobSheetPage's
   othersBaselineRef.current, which is itself loaded from service.othersBaseline
   saved by the backend /rebill route). Same AMOUNT-based split as SparePopup:
   walk items IN INSERTION ORDER, an item is "before rebill" as long as the
   running sum-so-far (before adding this item's amount) is still under this
   baseline. Amount-based, not date-based, for the same reason as Spare — a
   user-typed date has no guaranteed relationship to the real moment rebill
   was clicked, but othersBaseline is an exact snapshot of cumulativeTotal
   taken at that moment. */
const OthersPopup = ({ onClose, setOthersAmount, setOthersItems, existingItems = [], othersBaselineAmount = 0 }) => {
  const today = new Date().toISOString().split("T")[0];

  const [items, setItems] = useState(() => [...existingItems]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);

  // ✅ cumulative total (ALL items, all cycles) — this is what actually gets
  // saved to service.othersAmount, matching the routes.js change (othersTotal).
  const cumulativeTotal = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);

  // ✅ AMOUNT-based split (not date-based) — identical logic to SparePopup's
  // itemsWithCycle. Since othersBaselineAmount is an exact snapshot of
  // cumulativeTotal taken at the real moment of rebill, this always lands
  // exactly on the boundary between pre-rebill and post-rebill items,
  // regardless of what date got typed on each item.
  let runningSum = 0;
  const itemsWithCycle = items.map((item, idx) => {
    const isOld = runningSum < othersBaselineAmount;
    runningSum += Number(item.amount || 0);
    return { item, idx, isOld };
  });

  const currentCycleItems = itemsWithCycle.filter(({ isOld }) => !isOld);
  const total = currentCycleItems.reduce((sum, { item }) => sum + Number(item.amount || 0), 0);
  const hasRebillSplit = othersBaselineAmount > 0;

  const handleAdd = () => {
    if (!amount || Number(amount) <= 0) return alert("Enter valid amount");
    if (!date) return alert("Select a date");
    setItems(prev => [...prev, { category, amount: Number(amount), date }]);
    setAmount("");
    setDate(today);
  };

  const handleRemove = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    setOthersItems(items);                    // ✅ full array, unchanged — history preserved
    setOthersAmount(String(cumulativeTotal));  // ✅ always save the full cumulative sum
    onClose();
  };

  return (
    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)", zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-dark text-white py-2">
            <h6 className="modal-title mb-0">📦 Add Other Expenses</h6>
            <button className="btn-close btn-close-white" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="d-flex gap-2 mb-3 align-items-end flex-wrap">
              <div style={{ flex: 2 }}>
                <label className="form-label small mb-1">Category</label>
                <select className="form-select form-select-sm" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label small mb-1">Amount ₹ *</label>
                <input
                  className="form-control form-control-sm"
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label small mb-1">Date *</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <button className="btn btn-dark btn-sm" onClick={handleAdd}>Add</button>
            </div>

            <table className="table table-sm table-bordered mb-2">
              <thead className="table-light">
                <tr><th>Category</th><th>Amount ₹</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {itemsWithCycle.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-muted small py-3">No expenses added yet</td></tr>
                ) : itemsWithCycle.map(({ item: it, idx: i, isOld }) => (
                  <tr key={i} style={isOld ? { background: "#F9FAFB" } : undefined}>
                    <td style={{ color: isOld ? "#9CA3AF" : "#111827" }}>
                      {it.category}
                      {/* ===== NEW — "Before Rebill" tag, same style as SparePopup ===== */}
                      {isOld && (
                        <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F1F5F9", padding: "1px 6px", borderRadius: 10 }}>
                          Before Rebill
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: isOld ? "#9CA3AF" : "#111827" }}>₹ {it.amount}</td>
                    <td style={{ color: isOld ? "#9CA3AF" : "#111827" }}>{it.date ? String(it.date).slice(0, 10) : "-"}</td>
                    <td>
                      <button className="btn btn-outline-danger btn-sm py-0 px-1" onClick={() => handleRemove(i)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ===== TOTAL — cycle-split, same pattern as SparePopup ===== */}
            <div className="text-end">
              <div className="fw-bold text-dark">
                Total {hasRebillSplit ? "(this cycle)" : ""}: ₹ {total}
              </div>
              {hasRebillSplit && cumulativeTotal !== total && (
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                  Lifetime total (all cycles): ₹ {cumulativeTotal}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer py-2">
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-success btn-sm" onClick={handleSave}>Save ✅</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OthersPopup;