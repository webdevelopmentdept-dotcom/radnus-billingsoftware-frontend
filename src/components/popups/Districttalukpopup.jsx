import React, { useState, useEffect } from "react";
import axios from "axios";
import { MapPin, Landmark, Plus, Pencil, Trash2, X } from "lucide-react";

/* ================= DISTRICT / TALUK — DATA OPERATION POPUP =================
   Same job as AdminMakeModal.jsx / AdminModelModal.jsx (Make → Model), just for
   District → Taluk. Left panel = Districts (add / edit / delete). Click a district to
   select it → right panel shows that district's Taluks (add / edit / delete).
   On every successful save/delete this dispatches "districtListUpdated" /
   "talukListUpdated" window events — JobSheetPage.jsx already listens for these and
   refetches live, so a Job Sheet open in another tab/screen updates without reload. */

const RED = "#DC2626";

const btnStyle = {
  background: RED, color: "#fff", border: "none", borderRadius: 6,
  padding: "6px 12px", fontWeight: 600, fontSize: 13, display: "flex",
  alignItems: "center", gap: 6, cursor: "pointer",
};

const rowStyle = (active) => ({
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "8px 10px", borderRadius: 6, marginBottom: 4, cursor: "pointer",
  background: active ? "#FEF2F2" : "#fff",
  border: `1px solid ${active ? "#FBD5D5" : "#E5E7EB"}`,
});

const DistrictTalukPopup = ({ onClose }) => {
  const API = import.meta.env.VITE_API_URL;

  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null); // full district object
  const [taluks, setTaluks] = useState([]);

  const [newDistrict, setNewDistrict] = useState("");
  const [newTaluk, setNewTaluk] = useState("");

  const [editingDistrictId, setEditingDistrictId] = useState(null);
  const [editingDistrictText, setEditingDistrictText] = useState("");
  const [editingTalukId, setEditingTalukId] = useState(null);
  const [editingTalukText, setEditingTalukText] = useState("");

  const [savingDistrict, setSavingDistrict] = useState(false);
  const [savingTaluk, setSavingTaluk] = useState(false);

  const fetchDistricts = () => {
    axios.get(`${API}/api/districts`)
      .then(res => setDistricts(res.data))
      .catch(err => console.error("District fetch error:", err));
  };

  const fetchTaluks = (districtName) => {
    if (!districtName) { setTaluks([]); return; }
    axios.get(`${API}/api/taluks/${districtName}`)
      .then(res => setTaluks(res.data))
      .catch(err => console.error("Taluk fetch error:", err));
  };

  useEffect(() => { fetchDistricts(); }, []);
  useEffect(() => { fetchTaluks(selectedDistrict?.name); }, [selectedDistrict]);

  /* ---------- DISTRICT: add / edit / delete ---------- */
  const handleAddDistrict = async () => {
    const val = newDistrict.trim();
    if (!val) return;
    setSavingDistrict(true);
    try {
      const res = await axios.post(`${API}/api/districts`, { name: val });
      setDistricts(prev => {
        const exists = prev.some(d => d.name.toLowerCase() === res.data.name.toLowerCase());
        return exists ? prev : [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name));
      });
      setNewDistrict("");
      window.dispatchEvent(new Event("districtListUpdated"));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to add district ❌");
    } finally {
      setSavingDistrict(false);
    }
  };

  const handleUpdateDistrict = async (id) => {
    const val = editingDistrictText.trim();
    if (!val) return;
    try {
      const res = await axios.put(`${API}/api/districts/${id}`, { name: val });
      setDistricts(prev => prev.map(d => (d._id === id ? res.data : d)).sort((a, b) => a.name.localeCompare(b.name)));
      if (selectedDistrict?._id === id) setSelectedDistrict(res.data);
      setEditingDistrictId(null);
      setEditingDistrictText("");
      window.dispatchEvent(new Event("districtListUpdated"));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to update district ❌");
    }
  };

  const handleDeleteDistrict = async (d) => {
    if (!window.confirm(`Delete "${d.name}"? Its Taluks will also be removed.`)) return;
    try {
      await axios.delete(`${API}/api/districts/${d._id}`);
      setDistricts(prev => prev.filter(x => x._id !== d._id));
      if (selectedDistrict?._id === d._id) { setSelectedDistrict(null); setTaluks([]); }
      window.dispatchEvent(new Event("districtListUpdated"));
      window.dispatchEvent(new Event("talukListUpdated"));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to delete district ❌");
    }
  };

  /* ---------- TALUK: add / edit / delete ---------- */
  const handleAddTaluk = async () => {
    const val = newTaluk.trim();
    if (!val || !selectedDistrict) return;
    setSavingTaluk(true);
    try {
      const res = await axios.post(`${API}/api/taluks`, { name: val, district: selectedDistrict.name });
      setTaluks(prev => {
        const exists = prev.some(t => t.name.toLowerCase() === res.data.name.toLowerCase());
        return exists ? prev : [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name));
      });
      setNewTaluk("");
      window.dispatchEvent(new Event("talukListUpdated"));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to add taluk ❌");
    } finally {
      setSavingTaluk(false);
    }
  };

  const handleUpdateTaluk = async (id) => {
    const val = editingTalukText.trim();
    if (!val) return;
    try {
      const res = await axios.put(`${API}/api/taluks/${id}`, { name: val });
      setTaluks(prev => prev.map(t => (t._id === id ? res.data : t)).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingTalukId(null);
      setEditingTalukText("");
      window.dispatchEvent(new Event("talukListUpdated"));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to update taluk ❌");
    }
  };

  const handleDeleteTaluk = async (t) => {
    if (!window.confirm(`Delete "${t.name}"?`)) return;
    try {
      await axios.delete(`${API}/api/taluks/${t._id}`);
      setTaluks(prev => prev.filter(x => x._id !== t._id));
      window.dispatchEvent(new Event("talukListUpdated"));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to delete taluk ❌");
    }
  };

  return (
    <div
      className="modal d-block"
      style={{ background: "rgba(0,0,0,0.5)", zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content" style={{ borderRadius: 12, overflow: "hidden" }}>
          <div className="modal-header" style={{ background: RED, color: "#fff" }}>
            <h5 className="modal-title d-flex align-items-center gap-2">
              <MapPin size={18} /> District &amp; Taluk
            </h5>
            <button className="btn-close btn-close-white" onClick={onClose} />
          </div>

          <div className="modal-body" style={{ padding: 16 }}>
            <div className="row g-3">

              {/* ---------- DISTRICTS ---------- */}
              <div className="col-md-6">
                <div className="d-flex align-items-center gap-2 mb-2" style={{ fontWeight: 700, fontSize: 13, color: "#B91C1C" }}>
                  <MapPin size={14} /> Districts
                </div>

                <div className="d-flex gap-1 mb-2">
                  <input
                    className="form-control form-control-sm"
                    placeholder="New district name"
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddDistrict(); } }}
                  />
                  <button
                    style={btnStyle}
                    disabled={savingDistrict || !newDistrict.trim()}
                    onClick={handleAddDistrict}
                  >
                    <Plus size={14} /> {savingDistrict ? "..." : "Add"}
                  </button>
                </div>

                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {districts.length === 0 && (
                    <div className="text-muted small">No districts yet — add one above.</div>
                  )}
                  {districts.map((d) => (
                    <div key={d._id} style={rowStyle(selectedDistrict?._id === d._id)} onClick={() => setSelectedDistrict(d)}>
                      {editingDistrictId === d._id ? (
                        <input
                          autoFocus
                          className="form-control form-control-sm"
                          value={editingDistrictText}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditingDistrictText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUpdateDistrict(d._id); } }}
                        />
                      ) : (
                        <span style={{ fontWeight: 500, fontSize: 13.5 }}>{d.name}</span>
                      )}

                      <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {editingDistrictId === d._id ? (
                          <>
                            <button className="btn btn-sm btn-success" onClick={() => handleUpdateDistrict(d._id)}>✓</button>
                            <button className="btn btn-sm btn-secondary" onClick={() => { setEditingDistrictId(null); setEditingDistrictText(""); }}>
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <Pencil size={14} style={{ cursor: "pointer", color: "#6B7280" }}
                              onClick={() => { setEditingDistrictId(d._id); setEditingDistrictText(d.name); }} />
                            <Trash2 size={14} style={{ cursor: "pointer", color: RED }}
                              onClick={() => handleDeleteDistrict(d)} />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---------- TALUKS (of selected district) ---------- */}
              <div className="col-md-6">
                <div className="d-flex align-items-center gap-2 mb-2" style={{ fontWeight: 700, fontSize: 13, color: "#B91C1C" }}>
                  <Landmark size={14} /> Taluks {selectedDistrict ? `— ${selectedDistrict.name}` : ""}
                </div>

                {!selectedDistrict ? (
                  <div className="text-muted small">Select a district on the left first.</div>
                ) : (
                  <>
                    <div className="d-flex gap-1 mb-2">
                      <input
                        className="form-control form-control-sm"
                        placeholder="New taluk name"
                        value={newTaluk}
                        onChange={(e) => setNewTaluk(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTaluk(); } }}
                      />
                      <button
                        style={btnStyle}
                        disabled={savingTaluk || !newTaluk.trim()}
                        onClick={handleAddTaluk}
                      >
                        <Plus size={14} /> {savingTaluk ? "..." : "Add"}
                      </button>
                    </div>

                    <div style={{ maxHeight: 320, overflowY: "auto" }}>
                      {taluks.length === 0 && (
                        <div className="text-muted small">No taluks yet for this district.</div>
                      )}
                      {taluks.map((t) => (
                        <div key={t._id} style={rowStyle(false)}>
                          {editingTalukId === t._id ? (
                            <input
                              autoFocus
                              className="form-control form-control-sm"
                              value={editingTalukText}
                              onChange={(e) => setEditingTalukText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUpdateTaluk(t._id); } }}
                            />
                          ) : (
                            <span style={{ fontWeight: 500, fontSize: 13.5 }}>{t.name}</span>
                          )}

                          <div className="d-flex gap-2">
                            {editingTalukId === t._id ? (
                              <>
                                <button className="btn btn-sm btn-success" onClick={() => handleUpdateTaluk(t._id)}>✓</button>
                                <button className="btn btn-sm btn-secondary" onClick={() => { setEditingTalukId(null); setEditingTalukText(""); }}>
                                  <X size={13} />
                                </button>
                              </>
                            ) : (
                              <>
                                <Pencil size={14} style={{ cursor: "pointer", color: "#6B7280" }}
                                  onClick={() => { setEditingTalukId(t._id); setEditingTalukText(t.name); }} />
                                <Trash2 size={14} style={{ cursor: "pointer", color: RED }}
                                  onClick={() => handleDeleteTaluk(t)} />
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistrictTalukPopup;