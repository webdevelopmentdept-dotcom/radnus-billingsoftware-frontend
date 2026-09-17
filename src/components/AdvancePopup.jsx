import React, { useState } from "react";

const AdvancePopup = ({ onClose, setAdvanceAmount, setAdvanceItems, existingItems = [], advanceBaselineAmount = 0 }) => {
  const today = new Date().toISOString().split("T")[0];

  const [advances, setAdvances] = useState(() => [...existingItems]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);

  // ✅ cumulative total (ALL items, all cycles) — this is what gets saved to
  // service.advanceAmount, same pattern as SparePopup's cumulativeTotal.
  const cumulativeTotal = advances.reduce((sum, a) => sum + Number(a.amount || 0), 0);

  // ✅ AMOUNT-based split (not date-based) — identical logic to SparePopup.
  // advanceBaselineAmount is an exact snapshot of cumulativeTotal taken at the
  // real moment of rebill, so walking items IN ORDER and marking an item "old"
  // as long as the running sum-so-far is still under the baseline always lands
  // exactly on the pre-rebill / post-rebill boundary.
  let runningSum = 0;
  const advancesWithCycle = advances.map((a, idx) => {
    const isOld = runningSum < advanceBaselineAmount;
    runningSum += Number(a.amount || 0);
    return { item: a, idx, isOld };
  });

  const currentCycleItems = advancesWithCycle.filter(({ isOld }) => !isOld);
  const total = currentCycleItems.reduce((sum, { item }) => sum + Number(item.amount || 0), 0);
  const hasRebillSplit = advanceBaselineAmount > 0;

  const handleAdd = () => {
    if (!amount || Number(amount) <= 0) return alert("Enter valid amount");
    if (!date) return alert("Select a date");
    setAdvances(prev => [
      ...prev,
      { label: name || `Advance ${prev.length + 1}`, amount: Number(amount), date }
    ]);
    setAmount("");
    setName("");
    setDate(today);
  };

  const handleRemove = (i) => setAdvances(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    setAdvanceItems(advances);              // ✅ full array, unchanged — history preserved
    setAdvanceAmount(String(cumulativeTotal)); // ✅ always save the full cumulative sum
    onClose();
  };

  return (
    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)", zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white py-2">
            <h6 className="modal-title mb-0">💰 Add Advance Payments</h6>
            <button className="btn-close btn-close-white" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="d-flex gap-2 mb-3 align-items-end flex-wrap">
              <div style={{ flex: 2 }}>
                <label className="form-label small mb-1">Label (optional)</label>
                <input
                  className="form-control form-control-sm"
                  placeholder="e.g. First Advance"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
                />
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
              <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add</button>
            </div>

            <table className="table table-sm table-bordered mb-2">
              <thead className="table-light">
                <tr><th>Label</th><th>Amount ₹</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {advancesWithCycle.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-muted small py-3">No advances added yet</td></tr>
                ) : advancesWithCycle.map(({ item: a, idx: i, isOld }) => (
                  <tr key={i} style={isOld ? { background: "#F9FAFB" } : undefined}>
                    <td style={{ color: isOld ? "#9CA3AF" : "#111827" }}>
                      {a.label || "-"}
                      {isOld && (
                        <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#9CA3AF", background: "#F1F5F9", padding: "1px 6px", borderRadius: 10 }}>
                          Before Rebill
                        </span>
                      )}
                    </td>
                    <td style={{ color: isOld ? "#9CA3AF" : "#111827" }}>₹ {a.amount}</td>
                    <td style={{ color: isOld ? "#9CA3AF" : "#111827" }}>{a.date ? String(a.date).slice(0, 10) : "-"}</td>
                    <td>
                      <button className="btn btn-outline-danger btn-sm py-0 px-1" onClick={() => handleRemove(i)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-end">
              <div className="fw-bold text-success">
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

export default AdvancePopup;