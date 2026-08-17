import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginModal = ({ show, onClose }) => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const API = import.meta.env.VITE_API_URL;

  if (!show) return null;

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      onClose();

      // ✅ Engineer → /engineer/ajith (name lowercase)
      if (data.user.role === "engineer") {
        const engineerPath = (data.user.name || data.user.username).toLowerCase();
        navigate(`/engineer/${engineerPath}`);
      } else {
        // ✅ Admin/other roles → direct Job Sheet page (Home illa)
        navigate("/jobsheet");
      }

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

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">User Login</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>

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

          {error && (
            <div className="alert alert-danger py-2 small">{error}</div>
          )}

          <button
            className="btn btn-primary w-100"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

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