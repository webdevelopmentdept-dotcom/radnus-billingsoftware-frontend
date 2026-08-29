import React, { useState } from "react";
import axios from "axios";

const AdminMakeModal = ({ onClose }) => {
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const API = import.meta.env.VITE_API_URL;

  const handleSearch = async () => {
    if (!search) return alert("Enter search value");

    try {
      const res = await axios.get(
        `${API}/api/makes/search/${search}`
      );

      if (res.data) {
        setName(res.data.name);
        setEditId(res.data._id);
      } else {
        alert("No make found ❌");
      }
    } catch (err) {
      alert("Not found ❌");
    }
  };

  const handleSave = async () => {
    if (!name) return alert("Enter Make");

    try {
      if (editId) {
        // UPDATE
        await axios.put(`${API}/api/makes/${editId}`, {
          name,
        });
        alert("Updated ✅");
      } else {
        // ADD
        const res = await axios.post(`${API}/api/makes`, {
          name,
        });

        // ✅ NEW — backend now returns { alreadyExists, message, data } instead of
        // silently returning the existing record. Show the user clearly whether this
        // was a fresh add or it matched an existing make case-insensitively
        // (e.g. typing "Google" when "google" already exists).
        if (res.data?.alreadyExists) {
          alert(res.data.message || `"${res.data.data?.name || name}" already exists ⚠️`);
        } else {
          alert("Make Added ✅");
        }
      }

      setName("");
      setSearch("");
      setEditId(null);
      // ✅ NEW — tells JobSheetPage (and anywhere else listening) that the make master
      // list changed, so its Make dropdown can refetch immediately.
      window.dispatchEvent(new Event("makeListUpdated"));

    } catch (err) {
      alert(err.response?.data?.message || "Error ❌");
    }
  };

  const handleDelete = async () => {
    if (!editId) return alert("Search first ❌");

    if (!window.confirm("Delete this make?")) return;

    try {
      await axios.delete(`${API}/api/makes/${editId}`);
      alert("Deleted ✅");

      setName("");
      setSearch("");
      setEditId(null);
      window.dispatchEvent(new Event("makeListUpdated"));

    } catch (err) {
      alert("Delete failed ❌");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
      }}
    >
      <div className="card p-3 bg-white text-dark" style={{ width: 320 }}>

        <h5 className="mb-3">⚙ Make Master</h5>

        {/* 🔍 SEARCH */}
        <div className="d-flex gap-2 mb-2">
          <input
            className="form-control"
            placeholder="Search Make"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" onClick={handleSearch}>
            Search
          </button>
        </div>

        {/* ✏ INPUT */}
        <input
          className="form-control mb-2"
          placeholder="Enter Make"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* ACTIONS */}
        <button
          className={`btn btn-sm ${editId ? "btn-warning" : "btn-success"}`}
          onClick={handleSave}
        >
          {editId ? "Update" : "Save"}
        </button>

        {editId && (
          <button
            className="btn btn-danger btn-sm mt-2"
            onClick={handleDelete}
          >
            Delete
          </button>
        )}

        <button
          className="btn btn-secondary btn-sm mt-2"
          onClick={onClose}
        >
          Close
        </button>

      </div>
    </div>
  );
};

export default AdminMakeModal;