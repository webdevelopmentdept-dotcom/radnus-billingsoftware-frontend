import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginModal = ({ show, onClose }) => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const API = import.meta.env.VITE_API_URL;

  if (!show) return null;

  const handleLogin = async () => {

    // 🔹 validation
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    setError("");
    setLoading(true);

    try {

      const res = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // ✅ Save login data
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // close modal
      onClose();

      // redirect
      navigate("/home");

    } catch (err) {

      console.error("LOGIN ERROR:", err);
      setError("Server connection failed ❌");

    } finally {

      setLoading(false);

    }

  };

  return (
    <>
      {/* Overlay */}
      <div
        className="position-fixed top-0 start-0 w-100 h-100"
        style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}
      ></div>

      {/* Modal */}
      <div
        className="position-fixed top-50 start-50 translate-middle"
        style={{ zIndex: 1060, width: "100%", maxWidth: "420px" }}
      >
        <div className="bg-white rounded-4 shadow-lg p-4">

          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">User Login</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          {/* Username */}
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-danger py-2 small">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            className="btn btn-primary w-100"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {/* Cancel */}
          <button
            className="btn btn-outline-secondary w-100 mt-2"
            onClick={onClose}
          >
            Cancel
          </button>

        </div>
      </div>
    </>
  );
};

export default LoginModal;