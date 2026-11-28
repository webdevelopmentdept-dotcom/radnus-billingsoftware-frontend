import React, { useEffect, useState } from "react";
import axios from "axios";
import { getActiveStoreId } from "../../activeStore";

const EngineerPopup = ({ onClose }) => {
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const isAdmin = JSON.parse(sessionStorage.getItem("user") || "{}").role === "admin";
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState("");   // "" = store-a maathala (new: Main, edit: ippo irukkura store)
  const mainStore = stores.find(s => s.isDefault);
  const storeName = (id) => {
    if (!stores.length) return "";
    const s = stores.find(x => String(x._id) === String(id));
    return s ? s.name : (mainStore?.name || "Main Store");   // illa / theriyaadha = Main
  };
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    fetchData();
    if (isAdmin) {
      axios.get(`${API}/api/stores`)
        .then(r => setStores((r.data || []).filter(s => s.active)))
        .catch(() => { });
    }
  }, []);

  const fetchData = async () => {
    const res = await axios.get(`${API}/api/engineers`);
    setList(res.data);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("Enter engineer name");
    if (editId) {
      await axios.put(`${API}/api/engineers/${editId}`, { name, ...(isAdmin && storeId ? { storeId } : {}) }); setStoreId("");
    } else {
      await axios.post(`${API}/api/engineers`, { name, ...(isAdmin && storeId ? { storeId } : {}) }); setStoreId("");
    }
    setName("");
    setEditId(null);
    fetchData();
  };

  const handleEdit = (e) => {
    setName(e.name);
    setEditId(e._id);
    setStoreId(e.storeId ? String(e.storeId) : "");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this engineer?")) return;
    await axios.delete(`${API}/api/engineers/${id}`);
    fetchData();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            color: "#111827",
            width: "100%",
            maxWidth: "500px",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
          }}
        >
          {/* HEADER */}
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#111" }}>
              👨‍🔧 Engineer Master
            </h2>
            <button onClick={onClose} style={{ fontSize: "18px", cursor: "pointer", border: "none", background: "transparent" }}>✖</button>
          </div>

          {/* STORE (admin only) */}
          {isAdmin && (
            <div className="mb-2">
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>Store</label>
              <select
                value={storeId || getActiveStoreId() || (mainStore ? mainStore._id : "")}
                onChange={(e) => setStoreId(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #ccc", borderRadius: "8px", color: "#000", fontSize: "14px", background: "#fff" }}
              >
                {stores.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.city}){s.isDefault ? " – Main" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* INPUT ROW */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Enter Engineer Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                color: "#000",
                fontSize: "14px"
              }}
            />
            <button
              onClick={handleSave}
              style={{
                backgroundColor: editId ? "#f59e0b" : "#16a34a",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {editId ? "Update" : "Add"}
            </button>
            {editId && (
              <button
                onClick={() => { setName(""); setEditId(null); setStoreId(""); }}
                style={{
                  backgroundColor: "#6b7280",
                  color: "#fff",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* TABLE */}
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#f3f4f6", position: "sticky", top: 0 }}>
                <tr>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>#</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "left" }}>Engineer Name</th>
                  <th style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e, i) => (
                  <tr key={e._id}>
                    <td style={{ padding: "10px", border: "1px solid #ddd", color: "#6b7280", fontSize: "13px" }}>{i + 1}</td>
                    <td style={{ padding: "10px", border: "1px solid #ddd", fontWeight: 600 }}>
                      🔧 {e.name}
                      {isAdmin && storeName(e.storeId) && (
                        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: 999 }}>
                          {storeName(e.storeId)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #ddd", textAlign: "center" }}>
                      <button
                        onClick={() => handleEdit(e)}
                        style={{ backgroundColor: "#2563eb", color: "#fff", border: "none", padding: "5px 12px", borderRadius: "6px", marginRight: "6px", cursor: "pointer" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(e._id)}
                        style={{ backgroundColor: "#dc2626", color: "#fff", border: "none", padding: "5px 12px", borderRadius: "6px", cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>
                      No engineers added yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}
          <div className="text-right mt-4">
            <button
              onClick={onClose}
              style={{ padding: "6px 14px", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EngineerPopup;