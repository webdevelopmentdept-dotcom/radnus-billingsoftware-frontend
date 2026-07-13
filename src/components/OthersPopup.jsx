import React, { useState } from "react";

const CATEGORIES = ["Courier", "Petrol", "Return", "Food", "Transport", "Other"];

const OthersPopup = ({ onClose, setOthersAmount, setOthersItems, existingItems = [] }) => {
  const today = new Date().toISOString().split("T")[0];

  const [items, setItems] = useState(() => [...existingItems]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);

  const total = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const handleAdd = () => {
    if (!amount || Number(amount) <= 0) return alert("Enter valid amount");
    if (!date) return alert("Select a date");
    setItems(prev => [...prev, { category, amount: Number(amount), date }]);
    setAmount("");
    setDate(today);
  };

  const handleRemove = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    setOthersItems(items);
    setOthersAmount(String(total));
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
                {items.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-muted small py-3">No expenses added yet</td></tr>
                ) : items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.category}</td>
                    <td>₹ {it.amount}</td>
                    <td>{it.date ? String(it.date).slice(0, 10) : "-"}</td>
                    <td>
                      <button className="btn btn-outline-danger btn-sm py-0 px-1" onClick={() => handleRemove(i)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-end fw-bold text-dark">Total Others: ₹ {total}</div>
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