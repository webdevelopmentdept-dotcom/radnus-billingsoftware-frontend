import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ReportPage = () => {
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;
  const user = JSON.parse(sessionStorage.getItem("user"));
  const role = user?.role;

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");
  const [engineers, setEngineers] = useState([]);
  const [engineer, setEngineer]   = useState("");
  const [dealer, setDealer]       = useState("");
  const [counts, setCounts] = useState({ received: 0, pending: 0, repaired: 0, delivered: 0, nrna: 0 });
  const [staleJobs, setStaleJobs]       = useState([]);
  const [staleDays, setStaleDays]       = useState(3);
  const [staleLoading, setStaleLoading] = useState(false);
  const [staleOpen, setStaleOpen]       = useState(true);

  const fetchCounts = async () => {
    try {


    
      const res = await axios.get(`${API}/api/jobsheets/filter`, { params: { fromDate, toDate, engineer, dealer } });
      const data = res.data;
      setCounts({
        received:  data.filter(d => d.device?.mobileStatus === "Received").length,
        pending:   data.filter(d => d.device?.mobileStatus === "Pending").length,
        repaired:  data.filter(d => d.device?.mobileStatus === "Repaired").length,
        delivered: data.filter(d => d.device?.mobileStatus === "Delivered").length,
        nrna:      data.filter(d => d.device?.mobileStatus === "Delivered NR/NA").length,
      });
    } catch { alert("Failed ❌"); }
  };

  const fetchStale = async () => {
    setStaleLoading(true);
    try {
      const res = await axios.get(`${API}/api/jobsheets/stale`, { params: { days: staleDays } });
      setStaleJobs(res.data);
    } catch (e) { console.error(e); }
    finally { setStaleLoading(false); }
  };

  useEffect(() => {
    axios.get(`${API}/api/engineers`).then(r => setEngineers(r.data)).catch(console.error);
  }, []);

  useEffect(() => { fetchStale(); }, [staleDays]);

  const urgencyColor = (d) => {
    if (d >= 7) return { dot: "#ef4444", bar: "#ef4444", badge: "#fee2e2", badgeText: "#991b1b" };
    if (d >= 3) return { dot: "#f59e0b", bar: "#f59e0b", badge: "#fef3c7", badgeText: "#92400e" };
    return       { dot: "#3b82f6", bar: "#3b82f6", badge: "#dbeafe", badgeText: "#1e40af" };
  };

  const maxDays = staleJobs.length > 0 ? staleJobs[0].staleDays : 1;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`
        .rpt-btn { border: 1.5px solid #e2e8f0; background: #fff; color: #334155; border-radius: 8px; padding: 10px 8px; font-weight: 600; font-size: 12px; cursor: pointer; text-align: left; transition: all 0.15s; }
        .rpt-btn:hover { background: #1e293b; color: #fff; border-color: #1e293b; }
        .rpt-btn-accent { border: 1.5px solid #6366f1; background: #eef2ff; color: #4338ca; border-radius: 8px; padding: 10px 8px; font-weight: 700; font-size: 12px; cursor: pointer; text-align: left; transition: all 0.15s; }
        .rpt-btn-accent:hover { background: #6366f1; color: #fff; }
        .filter-in { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 13px; outline: none; background: #fff; transition: border-color 0.15s; }
        .filter-in:focus { border-color: #6366f1; }
        .stale-row { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; cursor: pointer; transition: all 0.15s; margin-bottom: 6px; }
        .stale-row:hover { border-color: #f59e0b; box-shadow: 0 2px 8px rgba(245,158,11,0.15); transform: translateX(2px); }
      `}</style>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 20px" }}>

        {/* HEADER */}
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>📊 Report Dashboard</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>Track and analyze service reports</p>
        </div>

        {/* FILTER BAR */}
        <div style={{ background: "#fff", borderRadius: "14px", padding: "16px 20px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Engineer</label>
            <select className="filter-in" value={engineer} onChange={e => setEngineer(e.target.value)} style={{ width: "150px" }}>
              <option value="">All Engineers</option>
              {engineers.map(eng => <option key={eng._id} value={eng.name}>{eng.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Dealer</label>
            <input type="text" placeholder="Dealer name" className="filter-in" value={dealer} onChange={e => setDealer(e.target.value)} style={{ width: "140px" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>From</label>
            <input type="date" className="filter-in" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>To</label>
            <input type="date" className="filter-in" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <button onClick={fetchCounts} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 22px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
            🔍 Search
          </button>
        </div>

        {/* COUNT CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "14px", marginBottom: "20px" }}>
          {[
            { label: "Received",  value: counts.received,  color: "#3b82f6", bg: "#eff6ff", icon: "📥" },
            { label: "Pending",   value: counts.pending,   color: "#f59e0b", bg: "#fffbeb", icon: "🔧" },
            { label: "Delivered", value: counts.delivered, color: "#10b981", bg: "#f0fdf4", icon: "✅" },
            { label: "Repaired",  value: counts.repaired,  color: "#10b981", bg: "#f0fdf4", icon: "✅" },
            { label: "NR / NA",   value: counts.nrna,      color: "#ef4444", bg: "#fef2f2", icon: "❌" },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, borderRadius: "12px", padding: "16px 18px", border: `1.5px solid ${c.color}22`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "20px", marginBottom: "6px" }}>{c.icon}</div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: c.color, lineHeight: 1.2, marginTop: "4px" }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* REPORT SECTIONS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>

          {/* Status Reports — both admin & user பார்க்கலாம் */}
          <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <span style={{ fontSize: "18px" }}>📋</span>
              <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "15px" }}>Status Reports</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
  { label: "Pending",         path: "/pending-report" },
  { label: "Repaired",        path: "/repaired-report" },
  { label: "Delivered",       path: "/delivered-report" },
  { label: "Value Report",    path: "/value-report" },
  { label: "Engineer Report", path: "/engineer-report" },
  { label: "Spare Report",    path: "/spare-report" },
  { label: "Dealer Report",   path: "/dealer-report" },
  { label: "Rebill Report",   path: "/rebill-report" },
  { label: "Income Report",   path: "/income-report" },
  { label: "Service Report",  path: "/service-report" },
  { label: "Others Report",   path: "/others-report" },
  { label: "Advance Report",  path: "/advance-report" },
].map((b, i) => (
                <button key={i} onClick={() => navigate(b.path)} className="rpt-btn">{b.label}</button>
              ))}
            </div>
          </div>

          {/* Daily Summary — admin மட்டும் */}
          {role === "admin" && (
            <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <span style={{ fontSize: "18px" }}>📅</span>
                <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "15px" }}>Daily Summary</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { label: "Received",        path: "/received-report" },
                  { label: "Pending",         path: "/daily-pending-report" },
                  { label: "Repaired",        path: "/daily-repaired-report" },
                  { label: "Delivered",       path: "/daily-delivered-report" },
                  { label: "Delivered NR/NA", path: "/delivered-nrna-report" },
                  { label: "Service Rep Report",  path: "/salesrep-report" },
                ].map((b, i) => (
                  <button key={i} onClick={() => navigate(b.path)} className="rpt-btn">{b.label}</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
                {[
                  { label: "All Report",          path: "/all-report" },
                  { label: "All Engineer Report", path: "/engineer-all-report" },
                ].map((b, i) => (
                  <button key={i} onClick={() => navigate(b.path)} className="rpt-btn-accent">{b.label}</button>
                ))}
              </div>
            </div>
          )}
{/* Reports — user மட்டும் */}
{role !== "admin" && (
  <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
      <span style={{ fontSize: "18px" }}>📂</span>
      <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "15px" }}>Reports</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
      {[
        { label: "All Report",          path: "/all-report" },
        { label: "All Engineer Report", path: "/engineer-all-report" },
   { label: "My Report",  path: "/my-report" },
      ].map((b, i) => (
        <button key={i} onClick={() => navigate(b.path)} className="rpt-btn-accent">{b.label}</button>
      ))}
    </div>
  </div>
)}
        </div>

        {/* STALE JOBS */}
        <div style={{ background: "#fff", borderRadius: "14px", marginBottom: "20px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden", border: "1.5px solid #fcd34d" }}>

          {/* Panel Header */}
          <div
            onClick={() => setStaleOpen(!staleOpen)}
            style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#fffbeb", borderBottom: staleOpen ? "1.5px solid #fde68a" : "none" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>⚠️</span>
              <span style={{ color: "#92400e", fontWeight: 800, fontSize: "15px" }}>Stale Jobs Alert</span>
              <span style={{
                background: staleJobs.length > 0 ? "#ef4444" : "#10b981",
                color: "#fff", borderRadius: "20px", padding: "2px 10px", fontSize: "12px", fontWeight: 700
              }}>
                {staleLoading ? "•••" : staleJobs.length}
              </span>
              <span style={{ color: "#78350f", fontSize: "12px", fontWeight: 500 }}>
                {staleJobs.length > 0 ? `${staleJobs.length} jobs haven't been updated` : "All jobs active ✅"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={e => e.stopPropagation()}>
              <select
                value={staleDays}
                onChange={e => setStaleDays(Number(e.target.value))}
                style={{ border: "1.5px solid #fcd34d", background: "#fff", color: "#78350f", borderRadius: "6px", padding: "5px 8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                <option value={1}>1+ day</option>
                <option value={3}>3+ days</option>
                <option value={5}>5+ days</option>
                <option value={7}>7+ days</option>
              </select>
              <button
                onClick={fetchStale}
                style={{ background: "#fef3c7", color: "#92400e", border: "1.5px solid #fcd34d", borderRadius: "6px", padding: "5px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >🔄 Refresh</button>
              <span style={{ color: "#92400e", fontSize: "16px", fontWeight: 700 }}>{staleOpen ? "▲" : "▼"}</span>
            </div>
          </div>

          {/* Panel Body */}
          {staleOpen && (
            <div style={{ padding: "14px 16px", maxHeight: "400px", overflowY: "auto" }}>
              {staleLoading ? (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "32px", fontSize: "14px" }}>⏳ Loading stale jobs...</div>
              ) : staleJobs.length === 0 ? (
                <div style={{ textAlign: "center", color: "#10b981", padding: "32px", fontSize: "14px", fontWeight: 600 }}>
                  ✅ No stale jobs! Everything is moving.
                </div>
              ) : (
                staleJobs.map(job => {
                  const u   = urgencyColor(job.staleDays);
                  const pct = Math.min((job.staleDays / maxDays) * 100, 100);
                  return (
                    <div key={job._id} className="stale-row" onClick={() => navigate(`/jobsheet/${job._id}`)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span style={{ color: "#2563eb", fontWeight: 800, fontSize: "13px", minWidth: "58px" }}>{job.jobSheetNo}</span>
                          <span style={{ color: "#0f172a", fontWeight: 700, fontSize: "13px" }}>{job.customerName}</span>
                          <span style={{ color: "#475569", fontSize: "12px" }}>{job.make} {job.model}</span>
                          <span style={{ color: "#94a3b8", fontSize: "11px" }}>🔧 {job.assignedTo}</span>
                          <span style={{
                            fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px",
                            background: job.status === "Received" ? "#dbeafe" : job.status === "Repairing" ? "#ede9fe" : "#fef3c7",
                            color: job.status === "Received" ? "#1e40af" : job.status === "Repairing" ? "#6d28d9" : "#92400e"
                          }}>
                            {job.status}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            fontSize: "12px", fontWeight: 800, padding: "3px 12px", borderRadius: "20px",
                            background: u.badge, color: u.badgeText
                          }}>
                            ● {job.staleDays} days
                          </span>
                          <span style={{ color: "#94a3b8", fontSize: "11px" }}>→</span>
                        </div>
                      </div>
                      <div style={{ background: "#f1f5f9", borderRadius: "4px", height: "4px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: u.bar, borderRadius: "4px", transition: "width 0.4s" }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ReportPage;