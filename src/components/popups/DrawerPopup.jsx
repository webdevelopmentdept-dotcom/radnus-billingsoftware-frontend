import React, { useEffect, useState } from "react";
import axios from "axios";

const DrawerPopup = ({ onClose }) => {
  const [drawers, setDrawers] = useState([]);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchDrawers();
  }, []);

  const fetchDrawers = async () => {
    const res = await axios.get(`${API}/api/drawers`);
    setDrawers(res.data);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("Enter drawer name");

    if (editId) {
      await axios.put(`${API}/api/drawers/${editId}`, { name });
    } else {
      await axios.post(`${API}/api/drawers`, { name });
    }

    setName("");
    setEditId(null);
    fetchDrawers();
  };

  const handleEdit = (d) => {
    setName(d.name);
    setEditId(d._id);
  };

  const handleDelete = async (id) => {
    await axios.delete(`${API}/api/drawers/${id}`);
    fetchDrawers();
  };

  return (
    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog">
        <div className="modal-content bg-white text-dark">

          {/* HEADER */}
          <div className="modal-header bg-white text-dark">
            <h5 className="modal-title">📦 Drawer Master</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          {/* BODY */}
          <div className="modal-body bg-white text-dark">

            {/* INPUT */}
            <div className="d-flex gap-2 mb-3">
              <input
                className="form-control"
                placeholder="Drawer Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <button
                className={`btn ${editId ? "btn-warning" : "btn-success"}`}
                onClick={handleSave}
              >
                {editId ? "Update" : "Add"}
              </button>
            </div>

            {/* TABLE */}
            <table className="table table-bordered bg-white text-dark">
              <thead className="table-light">
                <tr>
                  <th>Drawer</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {drawers.map((d) => (
                  <tr key={d._id}>
                    <td>{d.name}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => handleEdit(d)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(d._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>

          </div>

          {/* FOOTER */}
          <div className="modal-footer bg-white text-dark">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DrawerPopup;