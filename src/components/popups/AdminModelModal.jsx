import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminModelModal = ({ onClose }) => {
  const [modelName, setModelName] = useState("");
  const [make, setMake] = useState("");
  const [makeList, setMakeList] = useState([]);

  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const API = import.meta.env.VITE_API_URL;

  /* ================= FETCH MAKES ================= */
  useEffect(() => {
    axios.get(`${API}/api/makes`)
      .then(res => setMakeList(res.data))
      .catch(err => console.error(err));
  }, []);

  /* ================= SAVE / UPDATE ================= */
  const handleSave = async () => {
    if (!modelName || !make) {
      alert("Fill all fields ❌");
      return;
    }

    try {
      setLoading(true);

      if (editId) {
        // UPDATE
        await axios.put(`${API}/api/models/${editId}`, {
          name: modelName,
          make
        });

        alert("Model updated ✅");

      } else {
        // ADD
        await axios.post(`${API}/api/models`, {
          name: modelName,
          make
        });

        alert("Model added ✅");
      }

      setModelName("");
      setMake("");
      setEditId(null);
      setSearch("");

    } catch (err) {
      alert(err.response?.data?.message || "Error ❌");
    } finally {
      setLoading(false);
    }
  };

  /* ================= SEARCH ================= */
  const handleSearch = async () => {
    if (!search) return;

    try {
      const res = await axios.get(
        `${API}/api/models/search/${search}`
      );

      const data = res.data;

      setModelName(data.name);
      setMake(data.make);
      setEditId(data._id);

    } catch {
      alert("Model not found ❌");
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async () => {
    if (!editId) return;

    if (!window.confirm("Delete this model?")) return;

    try {
      await axios.delete(
        `${API}/api/models/${editId}`
      );

      alert("Deleted ✅");

      setModelName("");
      setMake("");
      setEditId(null);
      setSearch("");

    } catch {
      alert("Delete failed ❌");
    }
  };

  return (
    <>
      {/* 🔥 OVERLAY */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999
        }}
        onClick={onClose}
      >
        {/* 🔥 MODAL */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "12px",
            width: "350px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
          }}
        >

          {/* HEADER */}
          <div className="d-flex justify-content-between mb-3">
            <h5 style={{ color: "#000" }}>
              {editId ? "Edit Model" : "Add Model"}
            </h5>

            <button onClick={onClose}>✖</button>
          </div>

          {/* 🔍 SEARCH */}
          <input
            className="form-control mb-2"
            placeholder="Search model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            className="btn btn-dark w-100 mb-3"
            onClick={handleSearch}
          >
            Search
          </button>

          {/* MAKE DROPDOWN */}
          <select
            className="form-control mb-2"
            value={make}
            onChange={(e) => setMake(e.target.value)}
          >
            <option value="">Select Make</option>

            {makeList.map((m, i) => (
              <option key={i} value={m.name || m}>
                {m.name || m}
              </option>
            ))}
          </select>

          {/* MODEL INPUT */}
          <input
            className="form-control mb-2"
            placeholder="Model Name"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
          />

          {/* SAVE */}
          <button
            className={`btn w-100 mb-2 ${
              editId ? "btn-warning" : "btn-success"
            }`}
            onClick={handleSave}
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : editId
              ? "Update"
              : "Save"}
          </button>

          {/* DELETE */}
          {editId && (
            <button
              className="btn btn-danger w-100 mb-2"
              onClick={handleDelete}
            >
              Delete
            </button>
          )}

          {/* CLOSE */}
          <button
            className="btn btn-secondary w-100"
            onClick={onClose}
          >
            Close
          </button>

        </div>
      </div>
    </>
  );
};

export default AdminModelModal;