import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";



const STATUS_STEPS = [
  { key: "Received",   label: "📥 Received",   color: "#3b82f6", bg: "#dbeafe" },
  { key: "Diagnosing", label: "🔍 Diagnosing",  color: "#f59e0b", bg: "#fef3c7" },
  { key: "Repairing",  label: "🔧 Repairing",   color: "#8b5cf6", bg: "#ede9fe" },
  { key: "Repaired",   label: "✅ Repaired",    color: "#10b981", bg: "#d1fae5" },
  { key: "Delivered NR/NA",      label: "🎉 Delivered NR/NA",       color: "#059669", bg: "#a7f3d0" },
  { key: "Return",     label: "↩️ Return",      color: "#ef4444", bg: "#fee2e2" }, // ✅ NEW
  { key: "Delivered",  label: "🚀 Delivered",   color: "#059669", bg: "#a7f3d0" },
];
const getStaleDays = (job) => {
  const dates = [new Date(job.createdAt)];
  if (job.statusLogs?.length > 0) {
    const last = job.statusLogs[job.statusLogs.length - 1];
    if (last.timestamp) dates.push(new Date(last.timestamp));
  }
  if (job.repairSteps?.length > 0) {
    job.repairSteps.forEach(s => { if (s.completedAt) dates.push(new Date(s.completedAt)); });
  }
  return Math.floor((Date.now() - new Date(Math.max(...dates)).getTime()) / (1000 * 60 * 60 * 24));
};

const StaleBadge = ({ days }) => {
  if (days < 2) return null;
  const s = days >= 7
    ? { bg: "#fee2e2", color: "#991b1b", label: `🔴 ${days}d stale` }
    : days >= 3
    ? { bg: "#fef3c7", color: "#92400e", label: `🟡 ${days}d stale` }
    : { bg: "#dbeafe", color: "#1e40af", label: `🔵 ${days}d stale` };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: "10px", padding: "2px 7px", borderRadius: "8px", fontWeight: 700 }}>
      {s.label}
    </span>
  );
};

const EngineerDashboard = () => {
  const { name }    = useParams();
  const navigate    = useNavigate();
  const API         = import.meta.env.VITE_API_URL;
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const engineerName = user?.name || user?.username || name || "";

  const [jobs,        setJobs]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [updating,    setUpdating]    = useState(null);
  const [search,      setSearch]      = useState("");
  const [expandedJob, setExpandedJob] = useState(null);

  const [newStepText,    setNewStepText]    = useState({});
  const [newStepNote,    setNewStepNote]    = useState({});
  const [stepLoading,    setStepLoading]    = useState(null);

  const [transferJobId,    setTransferJobId]    = useState(null);
  const [transferTo,       setTransferTo]       = useState("");
  const [transferNote,     setTransferNote]     = useState("");
  const [transferLoading,  setTransferLoading]  = useState(false);
  const [engineerList,     setEngineerList]     = useState([]);
  const [workloadMap,      setWorkloadMap]      = useState({});

  useEffect(() => {
    if (user?.role === "engineer") {
      const urlName = name?.toLowerCase();
      const myName  = (user?.name || user?.username)?.toLowerCase();
      if (urlName !== myName) navigate(`/engineer/${myName}`);
    }
  }, [name]);

  useEffect(() => {
    axios.get(`${API}/api/engineers`).then(res => setEngineerList(res.data)).catch(console.error);
  }, []);

  const fetchWorkload = () => {
    axios.get(`${API}/api/jobsheets/workload`)
      .then(res => {
        const map = {};
        res.data.forEach(e => { map[e.name] = e.activeJobs; });
        setWorkloadMap(map);
      }).catch(console.error);
  };

  useEffect(() => { fetchWorkload(); }, []);

 const handleLogout = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  navigate("/");
};





  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/jobsheets/filter`, { params: { engineer: engineerName } });
      setJobs(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (engineerName) fetchJobs(); }, [engineerName]);

  const handleStatusUpdate = async (jobId, newStatus) => {
    setUpdating(jobId);
    try {
      await axios.patch(`${API}/api/jobsheets/${jobId}/status`, { status: newStatus, updatedBy: engineerName });
      setJobs(prev => prev.map(j => j._id === jobId
        ? { ...j, device: { ...j.device, mobileStatus: newStatus }, statusLogs: [...(j.statusLogs || []), { status: newStatus, updatedBy: engineerName, timestamp: new Date() }] }
        : j));
    } catch { alert("Update failed ❌"); }
    finally { setUpdating(null); }
  };

  const handleAddStep = async (jobId) => {
    const step = newStepText[jobId]?.trim();
    if (!step) return alert("Step text எழுதுங்க!");
    setStepLoading(jobId);
    try {
      const res = await axios.post(`${API}/api/jobsheets/${jobId}/steps`, { step, note: newStepNote[jobId] || "", completedBy: engineerName });
      setJobs(prev => prev.map(j => j._id === jobId ? res.data : j));
      setNewStepText(prev => ({ ...prev, [jobId]: "" }));
      setNewStepNote(prev => ({ ...prev, [jobId]: "" }));
    } catch { alert("Step add failed ❌"); }
    finally { setStepLoading(null); }
  };

  const handleToggleStep = async (jobId, stepId, currentDone) => {
    try {
      const res = await axios.patch(`${API}/api/jobsheets/${jobId}/steps/${stepId}`, { done: !currentDone, completedBy: engineerName });
      setJobs(prev => prev.map(j => j._id === jobId ? res.data : j));
    } catch { alert("Step update failed ❌"); }
  };

  const handleDeleteStep = async (jobId, stepId) => {
    if (!window.confirm("Delete this step?")) return;
    try {
      const res = await axios.delete(`${API}/api/jobsheets/${jobId}/steps/${stepId}`);
      setJobs(prev => prev.map(j => j._id === jobId ? res.data : j));
    } catch { alert("Delete failed ❌"); }
  };

const handleTransfer = async () => {
  if (!transferTo) return alert("Please Select the Engineer !");
  if (transferTo === engineerName) return alert("You can't transfer it to yourself!");

  setTransferLoading(true);
  
  try {
    await axios.patch(`${API}/api/jobsheets/${transferJobId}/transfer`, {
      from: engineerName,
      to: transferTo,
      note: transferNote
    });
    setJobs(prev => prev.filter(j => j._id !== transferJobId));
    fetchWorkload();
    setTransferJobId(null);
    setTransferTo("");
    setTransferNote("");

    alert(
      transferTo === "Reception"
        ? `✅ Job returned to Reception!`
        : `✅ Job transferred to ${transferTo}`
    );
  } catch (err) {
    alert(err.response?.data?.message || "Transfer failed ❌");
  } finally {
    setTransferLoading(false);
  }
};

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    return (
      j.jobSheetNo?.toLowerCase().includes(q) ||
      j.customer?.name?.toLowerCase().includes(q) ||
      j.customer?.contact?.includes(q) ||
      j.device?.model?.toLowerCase().includes(q)
    );
  });

  const counts = STATUS_STEPS.reduce((acc, s) => {
    acc[s.key] = jobs.filter(j => j.device?.mobileStatus === s.key).length;
    return acc;
  }, {});

  const otherEngineers = engineerList
    .map(e => e.name || e)
    .filter(n => n.toLowerCase() !== engineerName.toLowerCase());

// ✅ FIX — .length சேர்க்கணும்
const myLoad = jobs.filter(j =>
  !["Delivered", "Delivered NR/NA", "Repaired"].includes(j.device?.mobileStatus) &&
  !j.isInvoiced
).length;



  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>

      {/* ── TRANSFER MODAL ── */}
      {transferJobId && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000 }} onClick={() => setTransferJobId(null)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: "16px", padding: "24px", width: "400px", zIndex: 1001, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px", color: "#1e293b" }}>🔀 Transfer Job</h3>
            <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
              Job: <b style={{ color: "#2563eb" }}>{jobs.find(j => j._id === transferJobId)?.jobSheetNo}</b> — {jobs.find(j => j._id === transferJobId)?.customer?.name}
            </div>

            <label style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Transfer to:</label>
          <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
  style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", marginTop: "4px", marginBottom: "12px" }}>
  <option value="">-- Select Target --</option>
  {/* ✅ Reception option */}
  <option value="Reception">🏠 Reception (Free up capacity)</option>
  <optgroup label="Engineers">
  {otherEngineers.map((eng, i) => (
    <option key={i} value={eng}>{eng}</option>
  ))}
</optgroup>
</select>
          
            <label style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Note (optional):</label>
            <textarea rows={2} placeholder="e.g. Step 2 done, IC check பண்ணுங்க" value={transferNote} onChange={e => setTransferNote(e.target.value)}
              style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", marginTop: "4px", marginBottom: "16px", outline: "none", resize: "none", boxSizing: "border-box" }} />

            <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={handleTransfer} disabled={transferLoading}
  style={{ flex: 1, background: "#f59e0b", color: "#fff", border: "none", borderRadius: "8px", padding: "10px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
  {transferLoading ? "⏳ Transferring..." : "🔀 Transfer"}
</button>
              <button onClick={() => { setTransferJobId(null); setTransferTo(""); setTransferNote(""); }}
                style={{ flex: 1, background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "10px", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── NAVBAR ── */}
      <div style={{ background: "#1e293b", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ color: "#fff", fontSize: "18px", fontWeight: 700 }}>🔧 Engineer Dashboard</span>
          <span style={{ marginLeft: "8px", fontSize: "13px", color: "#60a5fa", fontWeight: 600 }}>/ {engineerName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
         
          <button onClick={handleLogout} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", padding: "7px 16px", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: "20px" }}>

        {/* STATUS CARDS */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          {STATUS_STEPS.map(s => (
            <div key={s.key} style={{ background: "#fff", borderRadius: "12px", padding: "12px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", minWidth: "110px", borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: s.color }}>{counts[s.key] || 0}</div>
            </div>
          ))}
          <div style={{ background: "#fff", borderRadius: "12px", padding: "12px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", minWidth: "110px", borderTop: "3px solid #1e293b" }}>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>📋 Total</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b" }}>{jobs.length}</div>
          </div>
          {/* WORKLOAD BAR CARD */}
          <div style={{ background: "#fff", borderRadius: "12px", padding: "12px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", minWidth: "160px", borderTop: `3px solid ${myLoad >= MAX_JOBS ? "#ef4444" : myLoad >= 4 ? "#f59e0b" : "#10b981"}` }}>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, marginBottom: 6 }}>⚙️ Capacity</div>
            <div style={{ background: "#f1f5f9", borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 4 }}>
              <div style={{
                height: "100%", borderRadius: 99,
                width: `${Math.min((myLoad / MAX_JOBS) * 100, 100)}%`,
                background: myLoad >= MAX_JOBS ? "#ef4444" : myLoad >= 4 ? "#f59e0b" : "#10b981",
                transition: "width 0.3s",
              }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: myLoad >= MAX_JOBS ? "#991b1b" : "#64748b" }}>
              {myLoad}/{MAX_JOBS} {myLoad >= MAX_JOBS ? "— FULL 🔴" : `— ${MAX_JOBS - myLoad} free`}
            </div>
          </div>
        </div>

        {/* SEARCH + REFRESH */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
          <input type="text" placeholder="🔍 Search job no / name / contact / model" value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", width: "320px", outline: "none" }} />
          <button onClick={fetchJobs} disabled={loading}
            style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 18px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
            {loading ? "⏳ Loading..." : "🔄 Refresh"}
          </button>
        </div>

        {/* JOB CARDS */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>⏳ Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>📭 No jobs found</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
            {filtered.map(job => {
              const currentStatus = job.device?.mobileStatus || "Received";
              const currentStep   = STATUS_STEPS.find(s => s.key === currentStatus) || STATUS_STEPS[0];
              const isUpdating    = updating === job._id;
              const isExpanded    = expandedJob === job._id;
              const steps         = job.repairSteps || [];
              const doneCount     = steps.filter(s => s.done).length;
              const lastTransfer  = job.transferLog?.slice(-1)[0];
              const staleDays     = getStaleDays(job);

              return (
                <div key={job._id} style={{
                  background: "#fff", borderRadius: "14px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden",
                  border: `1px solid ${staleDays >= 7 ? "#fca5a5" : staleDays >= 3 ? "#fcd34d" : "#e2e8f0"}`,
                }}>
                  {/* Card Header */}
                  <div style={{ background: "#1e293b", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: "14px" }}>{job.jobSheetNo}</span>
                      {lastTransfer && lastTransfer.to?.toLowerCase() === engineerName.toLowerCase() && (
                        <span style={{ background: "#fef3c7", color: "#92400e", fontSize: "10px", padding: "2px 6px", borderRadius: "8px", fontWeight: 600 }}>
                          🔀 from {lastTransfer.from}
                        </span>
                      )}
                      <StaleBadge days={staleDays} />
                    </div>
                    <span style={{ background: currentStep.bg, color: currentStep.color, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>
                      {currentStep.label}
                    </span>
                  </div>

                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>{job.customer?.name || "-"}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>📞 {job.customer?.contact || "-"}</div>
                      <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>📱 {job.device?.make || "-"} {job.device?.model || "-"}</div>
                      {job.visualIssues?.length > 0 && (
                        <div style={{ fontSize: "11px", color: "#7c3aed", marginTop: "4px" }}>🔴 {job.visualIssues.filter(Boolean).join(", ")}</div>
                      )}
                      {job.service?.remarks && (
                        <div style={{ fontSize: "11px", color: "#059669", marginTop: "4px" }}>📝 {job.service.remarks}</div>
                      )}
                      {lastTransfer?.note && lastTransfer.to?.toLowerCase() === engineerName.toLowerCase() && (
                        <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px", background: "#fef3c7", padding: "4px 8px", borderRadius: "6px" }}>
                          💬 {lastTransfer.note}
                        </div>
                      )}
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                        📅 {new Date(job.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                      </div>
                    </div>

                    {/* STATUS BUTTONS */}
                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px", marginBottom: "10px" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, marginBottom: "8px" }}>UPDATE STATUS:</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {STATUS_STEPS.filter(s => s.key !== "Delivered").map(s => {
                          const isActive = currentStatus === s.key;
                          return (
                            <button key={s.key} onClick={() => !isActive && handleStatusUpdate(job._id, s.key)} disabled={isActive || isUpdating}
                              style={{ padding: "5px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 600, cursor: isActive ? "default" : "pointer", border: `1px solid ${s.color}`, background: isActive ? s.bg : "#fff", color: isActive ? s.color : "#64748b", opacity: isUpdating ? 0.6 : 1 }}>
                              {isUpdating && isActive ? "⏳" : s.label}
                            </button>
                          );
                        })}
                        <button onClick={() => setTransferJobId(job._id)}
                          style={{ padding: "5px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 600, cursor: "pointer", border: "1px solid #f59e0b", background: "#fff", color: "#92400e" }}>
                          🔀 Transfer
                        </button>
                      </div>
                    </div>

                    {/* REPAIR STEPS */}
                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
                      <div onClick={() => setExpandedJob(isExpanded ? null : job._id)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: "8px" }}>
                        <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                          🛠️ REPAIR STEPS
                          {steps.length > 0 && (
                            <span style={{ marginLeft: "6px", background: "#f1f5f9", padding: "1px 7px", borderRadius: "10px", color: "#475569" }}>
                              {doneCount}/{steps.length}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>{isExpanded ? "▲" : "▼"}</span>
                      </div>
                      {steps.length > 0 && (
                        <div style={{ background: "#f1f5f9", borderRadius: "4px", height: "5px", marginBottom: "8px" }}>
                          <div style={{ background: "#10b981", borderRadius: "4px", height: "5px", width: `${(doneCount / steps.length) * 100}%`, transition: "width 0.3s" }} />
                        </div>
                      )}
                      {isExpanded && (
                        <div>
                          {steps.length === 0 ? (
                            <div style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "10px" }}>No steps yet ↓</div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                              {steps.map((s, idx) => (
                                <div key={s._id} style={{ display: "flex", alignItems: "flex-start", gap: "8px", background: s.done ? "#f0fdf4" : "#fafafa", border: `1px solid ${s.done ? "#86efac" : "#e2e8f0"}`, borderRadius: "8px", padding: "8px 10px" }}>
                                  <input type="checkbox" checked={s.done} onChange={() => handleToggleStep(job._id, s._id, s.done)} style={{ marginTop: "2px", cursor: "pointer", accentColor: "#10b981" }} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "12px", fontWeight: 600, color: s.done ? "#15803d" : "#1e293b", textDecoration: s.done ? "line-through" : "none" }}>{idx + 1}. {s.step}</div>
                                    {s.note && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>📝 {s.note}</div>}
                                    {s.completedBy && <div style={{ fontSize: "10px", color: "#7c3aed", marginTop: "2px" }}>👨‍🔧 {s.completedBy}</div>}
                                    {s.done && s.completedAt && (
                                      <div style={{ fontSize: "10px", color: "#86efac", marginTop: "2px" }}>
                                        ✅ {new Date(s.completedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                      </div>
                                    )}
                                  </div>
                                  <button onClick={() => handleDeleteStep(job._id, s._id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "13px", padding: "0" }}>🗑️</button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px", border: "1px dashed #cbd5e1" }}>
                            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, marginBottom: "6px" }}>➕ Add New Step</div>
                            <input type="text" placeholder="Step description" value={newStepText[job._id] || ""} onChange={e => setNewStepText(prev => ({ ...prev, [job._id]: e.target.value }))}
                              style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px 10px", fontSize: "12px", marginBottom: "6px", outline: "none", boxSizing: "border-box" }} />
                            <input type="text" placeholder="Note (optional)" value={newStepNote[job._id] || ""} onChange={e => setNewStepNote(prev => ({ ...prev, [job._id]: e.target.value }))}
                              style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "6px 10px", fontSize: "12px", marginBottom: "8px", outline: "none", boxSizing: "border-box" }} />
                            <button onClick={() => handleAddStep(job._id)} disabled={stepLoading === job._id}
                              style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer", width: "100%" }}>
                              {stepLoading === job._id ? "⏳ Adding..." : "➕ Add Step"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EngineerDashboard;