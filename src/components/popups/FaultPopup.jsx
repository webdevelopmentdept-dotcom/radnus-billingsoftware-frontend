import React, { useEffect, useState } from "react";
import axios from "axios";

const FaultPopup = ({ onClose }) => {
  const [faults, setFaults] = useState([]);
  const [faultName, setFaultName] = useState("");
  const [editId, setEditId] = useState(null);
  const API = import.meta.env.VITE_API_URL;
  

  useEffect(() => {
    fetchFaults();
  }, []);

  const fetchFaults = async () => {
    const res = await axios.get(`${API}/api/faults`);
    setFaults(res.data);
  };

  const handleSave = async () => {
    if (!faultName.trim()) {
      alert("Enter fault name");
      return;
    }

    try {
      if (editId) {
        await axios.put(`${API}/api/faults/${editId}`, {
          name: faultName,
        });
      } else {
        const res = await axios.post(`${API}/api/faults`, {
          name: faultName,
        });

        // ✅ NEW — backend now returns { alreadyExists, message } instead of silently
        // returning the existing record. Show the user clearly whether this was a
        // fresh add or it matched an existing fault case-insensitively
        // (e.g. typing "Screen Crack" when "screen crack" already exists).
        if (res.data?.alreadyExists) {
          alert(res.data.message || `"${res.data.name}" already exists ⚠️`);
        }
      }

      setFaultName("");
      setEditId(null);
      fetchFaults();
      // ✅ NEW — tells JobSheetPage (and anywhere else listening) that the fault master
      // list changed, so its Visual Inspection dropdown can refetch immediately instead
      // of staying stuck with whatever it had at page-load time.
      window.dispatchEvent(new Event("faultListUpdated"));

    } catch (err) {
      console.error(err);
      alert("Error saving fault ❌");
    }
  };

  const handleEdit = (f) => {
    setFaultName(f.name);
    setEditId(f._id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this fault?")) return;

    await axios.delete(`${API}/api/faults/${id}`);
    fetchFaults();
    // ✅ NEW — same reason as above, so a deleted fault also disappears live from Job Sheet.
    window.dispatchEvent(new Event("faultListUpdated"));
  };

  return (
    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content bg-white text-dark">

          {/* HEADER */}
          <div className="modal-header bg-white text-dark">
            <h5 className="modal-title">⚙ Fault Master</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          {/* BODY */}
          <div className="modal-body bg-white text-dark">

            {/* INPUT */}
            <div className="d-flex gap-2 mb-3">
              <input
                className="form-control"
                placeholder="Enter Fault"
                value={faultName}
                onChange={(e) => setFaultName(e.target.value)}
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
                  <th style={{ width: "60%" }}>Fault</th>
                  <th style={{ width: "40%" }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {faults.map((f) => (
                  <tr key={f._id}>
                    <td>{f.name}</td>
                    <td className="d-flex gap-2">

                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleEdit(f)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(f._id)}
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

export default FaultPopup;