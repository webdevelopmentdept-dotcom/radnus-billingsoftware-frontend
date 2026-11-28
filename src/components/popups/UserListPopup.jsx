import React, { useEffect, useState } from "react";
import axios from "axios";

const UserListPopup = ({ onClose }) => {

  const [users, setUsers] = useState([]);
  const [reps, setReps] = useState([]);
  const [error, setError] = useState("");
  const API = import.meta.env.VITE_API_URL;

  const isAdmin = JSON.parse(sessionStorage.getItem("user") || "{}").role === "admin";
  const [stores, setStores] = useState([]);
  const [myStore, setMyStore] = useState("");
  const mainStore = stores.find(s => s.isDefault);
  // storeId illa / theriyaadha id = Main Store (backend storeScope maariye)
  const storeOf = (u) => {
    const known = stores.find(s => String(s._id) === String(u.storeId));
    return known ? known._id : (mainStore ? mainStore._id : "");
  };

  useEffect(() => {
    fetchUsers();
    axios.get(`${API}/api/salesreps`).then(r => setReps(r.data)).catch(() => { });
    if (isAdmin) {
      axios.get(`${API}/api/stores`).then(r => setStores(r.data || [])).catch(() => { });
    } else {
      axios.get(`${API}/api/stores/mine`).then(r => setMyStore(r.data?.store?.name || "")).catch(() => { });
    }  // ✅ NEW
  }, []);

  const fetchUsers = async () => {
    try {
      setError("");
      const res = await axios.get(`${API}/api/users`);
      setUsers(res.data);
    } catch (err) {
      setError(
        `${err.response?.status || ""} ${err.response?.data?.message || err.message}`
      );
    }
  };

  // ✅ NEW — dropdown maathina udane save
  const updateAccess = async (id, patch) => {
    try {
      await axios.patch(`${API}/api/users/${id}/access`, patch);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Update failed ❌");
    }
  };

  const updateStore = async (u, storeId) => {
    const s = stores.find(x => String(x._id) === String(storeId));
    if (!window.confirm(`Move "${u.username}" to ${s?.name || "this store"}?`)) return;
    try {
      await axios.patch(`${API}/api/users/${u._id}/store`, { storeId });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Store update failed ❌");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axios.delete(`${API}/api/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed ❌");
    }
  };

  return (

    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content bg-white text-dark">

          {/* HEADER */}
          <div className="modal-header bg-white text-dark">
            <h5 className="modal-title">👤 User List</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          {/* BODY */}
          <div className="modal-body bg-white text-dark">

            {error && <div className="alert alert-danger py-2">{error}</div>}


            <table className="table table-bordered bg-white text-dark">

              <thead className="table-light">
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Store</th>
                  <th>Linked Rep</th>
                  <th>Feedback Access</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {users.map((u) => (

                  <tr key={u._id}>
                    <td>{u.username}</td>
                    <td>{u.role === "storeManager" ? "Store Manager" : u.role}</td>
                    <td>
                      {u.role === "admin" ? "—" : isAdmin ? (
                        <select
                          className="form-select form-select-sm"
                          value={storeOf(u)}
                          onChange={e => updateStore(u, e.target.value)}
                        >
                          {stores.map(s => (
                            <option key={s._id} value={s._id} disabled={!s.active}>
                              {s.name}{s.isDefault ? " (Main)" : ""}
                            </option>
                          ))}
                        </select>
                      ) : (myStore || "—")}
                    </td>

                    <td>
                      {u.role === "user" ? (
                        <select
                          className="form-select form-select-sm"
                          value={u.linkedRep || ""}
                          onChange={e => updateAccess(u._id, { linkedRep: e.target.value })}
                        >
                          <option value="">—</option>
                          {reps.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
                        </select>
                      ) : "—"}
                    </td>
                    <td>
                      {u.role === "user" ? (
                        <select
                          className="form-select form-select-sm"
                          value={u.feedbackAccess || "none"}
                          onChange={e => updateAccess(u._id, { feedbackAccess: e.target.value })}
                        >
                          <option value="none">None</option>
                          <option value="with_billing">Feedback + Billing</option>
                          <option value="only">Feedback only</option>
                        </select>
                      ) : "—"}
                    </td>

                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(u._id)}
                      >
                        Delete
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>



        </div>
      </div>
    </div>

  );
};

export default UserListPopup;