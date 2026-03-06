import React, { useEffect, useState } from "react";
import axios from "axios";

const UserListPopup = ({ onClose }) => {

  const [users, setUsers] = useState([]);
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await axios.get(`${API}/api/users`);
    setUsers(res.data);
  };

  const handleDelete = async (id) => {

    if (!window.confirm("Delete this user?")) return;

    await axios.delete(`${API}/api/users/${id}`);

    fetchUsers();
  };

  return (

    <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog">
        <div className="modal-content bg-white text-dark">

          {/* HEADER */}
          <div className="modal-header bg-white text-dark">
            <h5 className="modal-title">👤 User List</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          {/* BODY */}
          <div className="modal-body bg-white text-dark">

            <table className="table table-bordered bg-white text-dark">

              <thead className="table-light">
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {users.map((u) => (

                  <tr key={u._id}>
                    <td>{u.username}</td>
                    <td>{u.role}</td>

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