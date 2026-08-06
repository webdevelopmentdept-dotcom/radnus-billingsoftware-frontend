import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const StaleJobsWidget = ({ API }) => {
  const [staleJobs, setStaleJobs] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [days, setDays]           = useState(3);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
// code
  const fetchStale = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/jobsheets/stale`, { params: { days } });
      setStaleJobs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStale(); }, [days]);

  const getBadge = (d) => {
    if (d >= 7) return { bg: "#450a0a", color: "#fca5a5", border: "#7f1d1d", label: `${d} days` };
    if (d >= 3) return { bg: "#451a03", color: "#fcd34d", border: "#78350f", label: `${d} days` };
    return       { bg: "#0c1a3a", color: "#93c5fd", border: "#1e3a5f", label: `${d} day` };
  };

  const getStatusStyle = (status) => {
    if (status === "Received")  return { bg: "#1e3a5f", color: "#93c5fd" };
    if (status === "Repairing") return { bg: "#2e1065", color: "#c4b5fd" };
    if (status === "Pending")   return { bg: "#422006", color: "#fde68a" };
    if (status === "Diagnosing") return { bg: "#1a1040", color: "#a78bfa" };
    if (status === "Ready")     return { bg: "#052e16", color: "#86efac" };
    if (status === "Delivered") return { bg: "#052e16", color: "#86efac" };
    return { bg: "#1e293b", color: "#94a3b8" };
  };

  if (staleJobs.length === 0 && !loading) return null;

  return (
    <div style={{
      width: "100%", maxWidth: "920px", margin: "0 auto 28px",
      background: "#0f172a", borderRadius: 18,
      border: "1px solid rgba(245,158,11,0.2)",
      overflow: "hidden", fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── HEADER ── */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          background: "rgba(245,158,11,0.05)",
          padding: "14px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid rgba(245,158,11,0.13)",
          cursor: "pointer", userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, flexShrink: 0,
          }}>
            ⚠️
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fbbf24", letterSpacing: "-0.2px" }}>
            Stale jobs alert
          </span>
          <span style={{
            background: "rgba(239,68,68,0.13)",
            border: "1px solid rgba(239,68,68,0.27)",
            color: "#f87171",
            fontSize: 12, fontWeight: 700,
            padding: "2px 10px", borderRadius: 20,
          }}>
            {loading ? "…" : staleJobs.length}
          </span>
        </div>

        <div
          style={{ display: "flex", alignItems: "center", gap: 8 }}
          onClick={e => e.stopPropagation()}
        >
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            style={{
              background: "#1e293b", color: "#94a3b8",
              border: "1px solid #334155", borderRadius: 8,
              padding: "5px 10px", fontSize: 12, cursor: "pointer", outline: "none",
            }}
          >
            <option value={1}>1+ day</option>
            <option value={3}>3+ days</option>
            <option value={5}>5+ days</option>
            <option value={7}>7+ days</option>
          </select>

          <button
            onClick={fetchStale}
            style={{
              background: "#1e293b", color: "#64748b",
              border: "1px solid #334155", borderRadius: 8,
              padding: "5px 12px", fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            🔄 Refresh
          </button>

          <span style={{ color: "#475569", fontSize: 14, marginLeft: 2 }}>
            {collapsed ? "▼" : "▲"}
          </span>
        </div>
      </div>

      {/* ── BODY ── */}
      {!collapsed && (
        <div style={{
          padding: "14px 16px",
          maxHeight: 340, overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "#334155", padding: "28px 0", fontSize: 13, fontWeight: 500 }}>
              Loading…
            </div>
          ) : staleJobs.length === 0 ? (
            <div style={{ textAlign: "center", color: "#334155", padding: "28px 0", fontSize: 13, fontWeight: 500 }}>
              No stale jobs for this filter
            </div>
          ) : (
            staleJobs.map(job => {
              const badge = getBadge(job.staleDays);
              const ss    = getStatusStyle(job.status);
              return (
                <div
                  key={job._id}
                  onClick={() => navigate(`/jobsheet/${job._id}`)}
                  style={{
                    background: "#0a1628",
                    border: "1px solid #1e293b",
                    borderRadius: 12, padding: "12px 16px",
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    flexWrap: "wrap", gap: 10,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "#0f1f3a";
                    e.currentTarget.style.borderColor = "#334155";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "#0a1628";
                    e.currentTarget.style.borderColor = "#1e293b";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", letterSpacing: "0.2px" }}>
                      {job.jobSheetNo}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
                      {job.customerName}
                    </span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      {job.make} {job.model}
                    </span>
                    <span style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}>
                      🔧 {job.assignedTo}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      padding: "2px 9px", borderRadius: 12,
                      background: ss.bg, color: ss.color,
                    }}>
                      {job.status}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      padding: "3px 11px", borderRadius: 20,
                      background: badge.bg, color: badge.color,
                      border: `1px solid ${badge.border}`,
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      🕐 {badge.label}
                    </span>
                    <span style={{ color: "#334155", fontSize: 14, fontWeight: 700 }}>→</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default StaleJobsWidget;