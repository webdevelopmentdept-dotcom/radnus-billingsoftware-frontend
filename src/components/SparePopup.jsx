import React, { useState } from "react";

const SparePopup = ({ onClose, setSpareCharge, setSpareItems, existingItems = [] }) => {
  const today = new Date().toISOString().split("T")[0];

  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState("");
  const [date, setDate] = useState(today);
  const [items, setItems] = useState(existingItems);

  const amount = Number(qty || 0) * Number(rate || 0);

  const handleAdd = () => {
    if (!name || !rate) {
      alert("Enter Spare Name & Rate");
      return;
    }
    if (!date) {
      alert("Select a date");
      return;
    }

    const newItem = {
      name,
      qty: Number(qty),
      rate: Number(rate),
      amount,
      date,   // ✅ NEW — per-item date
    };

    setItems([...items, newItem]);

    setName("");
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
    <div style={overlay}>
      <div style={modal}>
        <h5 style={{ marginBottom: 15 }}>Add Spare Items</h5>

        {/* INPUT ROW */}
        <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap", alignItems: "flex-end" }}>

          <div style={{ flex: 2, minWidth: 120 }}>
            <label style={label}>Spare Name</label>
            <input
              placeholder="Spare Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={input}
            />
          </div>

          <div style={{ width: 70 }}>
            <label style={label}>Qty</label>
            <input
              type="number"
              placeholder="Qty"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              style={smallInput}
            />
          </div>

          <div style={{ width: 90 }}>
            <label style={label}>Rate</label>
            <input
              type="number"
              placeholder="Rate"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              style={smallInput}
            />
          </div>

          <div style={{ width: 90 }}>
            <label style={label}>Amount</label>
            <input
              value={amount}
              readOnly
              placeholder="Amount"
              style={smallInput}
            />
          </div>

          {/* ✅ NEW — Date picker, default today, editable */}
          <div style={{ width: 140 }}>
            <label style={label}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={smallInput}
            />
          </div>

          <button onClick={handleAdd} style={addBtn}>
            Add
          </button>

        </div>

        {/* TABLE */}
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Qty</th>
              <th style={th}>Rate</th>
              <th style={th}>Amount</th>
              <th style={th}>Date</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, index) => (
              <tr key={index}>
                <td style={td}>{i.name}</td>
                <td style={td}>{i.qty}</td>
                <td style={td}>{i.rate}</td>
                <td style={td}>{i.amount}</td>
                <td style={td}>{i.date ? String(i.date).slice(0, 10) : "-"}</td>
                <td style={td}>
                  <button onClick={() => removeItem(index)} style={deleteBtn}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTAL */}
        <div style={{ textAlign: "right", marginTop: 10, fontWeight: "bold" }}>
          Total : ₹ {total}
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ marginTop: 15, textAlign: "right" }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
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
  background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center",
  alignItems: "center", zIndex: 999
};
const modal = {
  background: "#fff", padding: 20, borderRadius: 8, width: "720px",
  boxShadow: "0 5px 20px rgba(0,0,0,0.2)"
};
const label = { fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 2 };
const input = { flex: 2, padding: 6, width: "100%" };
const smallInput = { width: "100%", padding: 6 };
const addBtn = { background: "#007bff", color: "#fff", border: "none", padding: "6px 12px", cursor: "pointer", height: 32 };
const deleteBtn = { background: "red", color: "#fff", border: "none", padding: "3px 7px", cursor: "pointer" };
const cancelBtn = { marginRight: 10, padding: "6px 14px" };
const saveBtn = { background: "green", color: "#fff", border: "none", padding: "6px 14px" };
const table = { width: "100%", borderCollapse: "collapse", marginTop: 10 };
const th = { border: "1px solid #ccc", padding: 6, background: "#f5f5f5" };
const td = { border: "1px solid #ccc", padding: 6 };