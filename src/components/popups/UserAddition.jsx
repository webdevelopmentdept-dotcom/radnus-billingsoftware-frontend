import React, { useState, useEffect } from "react";
import axios from "axios";

const UserAddition = ({ onClose }) => {
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/api/users`, form);
      alert("User created ✅");
      setForm({ name: "", username: "", password: "" });
      onClose();
    } catch (err) {
      alert("Error ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* OVERLAY */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      ></div>

      {/* MODAL */}
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="bg-white text-black w-full max-w-md rounded-2xl shadow-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">👤</span>
              <h2 className="text-xl font-bold text-black">
                Add New User
              </h2>
            </div>

            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-500 text-lg"
            >
              ✖
            </button>
          </div>

          {/* FORM */}
          <div className="space-y-4">
            {/* NAME */}
            <div>
              <label className="text-sm text-gray-700">Full Name</label>
              <input
                type="text"
                placeholder="Enter full name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-black"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </div>

            {/* USERNAME */}
            <div>
              <label className="text-sm text-gray-700">Username</label>
              <input
                type="text"
                placeholder="Enter username"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-black"
                value={form.username}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value })
                }
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-sm text-gray-700">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-black"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
            </div>

            {/* SAVE */}
            <button
              onClick={handleSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save User"}
            </button>

            {/* CANCEL */}
            <button
              onClick={onClose}
              className="w-full border border-gray-300 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserAddition;