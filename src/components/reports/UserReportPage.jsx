import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FaUser, FaWrench, FaCogs, FaRupeeSign, FaBoxOpen,
  FaHandHoldingUsd, FaCoins, FaTable, FaChartBar,
  FaSearch, FaTimes, FaFileExcel, FaCalendarAlt, FaBolt,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const fmt = (n) =>
  n ? "₹" + Number(n).toLocaleString("en-IN") : "₹0";

const statusColors = {
  Received:        { bg: "#E1F5EE", color: "#0F6E56" },
  Pending:         { bg: "#FAEEDA", color: "#854F0B" },
  Repaired:        { bg: "#E6F1FB", color: "#185FA5" },
  Delivered:       { bg: "#EAF3DE", color: "#3B6D11" },
  "Delivered NR/NA":{ bg: "#FAECE7", color: "#993C1D" },
  Cancelled:       { bg: "#FAEAEA", color: "#991b1b" },
};

const StatusBadge = ({ status }) => {
  const s = statusColors[status] || { bg: "#F1EFE8", color: "#5F5E5A" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 500, whiteSpace: "nowrap"
    }}>
      {status || "—"}
    </span>
  );
};

const avatarPalette = [
  { bg: "#CECBF6", color: "#3C3489" },
  { bg: "#9FE1CB", color: "#085041" },
  { bg: "#FAC775", color: "#633806" },
  { bg: "#B5D4F4", color: "#0C447C" },
  { bg: "#F4C0D1", color: "#72243E" },
];

const Avatar = ({ name, idx }) => {
  const c = avatarPalette[idx % avatarPalette.length];
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%",
      background: c.bg, color: c.color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 600, flexShrink: 0,
    }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
};

const SummaryCard = ({ label, value, accent, icon }) => (
  <div style={{
    background: "#fff", borderRadius: 10,
    padding: "14px 16px",
    border: "1px solid #e9ecef",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
  }}>
    <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
      {icon} {label}
    </div>
    <div style={{ fontSize: 20, fontWeight: 600, color: accent || "#212529" }}>{value}</div>
  </div>
);

const UserReportPage = () => {
  const [view, setView] = useState("table");

  const [searchText, setSearchText]   = useState("");
  const [fromDate,   setFromDate]     = useState("");
  const [toDate,     setToDate]       = useState("");
  const [userFilter, setUserFilter]   = useState("");

  const [data,    setData]    = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async (search = "", from = "", to = "") => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/jobsheets/user-report`, {
        params: {
          jobSheetNo: search || undefined,
          fromDate:   from   || undefined,
          toDate:     to     || undefined,
        },
      });
      setData(res.data || {});
    } catch (err) {
      console.error("FETCH ERROR:", err);
      setData({});
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchData(searchText, fromDate, toDate);

  const handleClear = () => {
    setSearchText(""); setFromDate(""); setToDate("");
    fetchData("", "", "");
  };

  const allJobs    = Object.values(data).flat();
  const userList   = Object.keys(data).sort();
  const totalUsers = userList.length;
  const totalJobs  = allJobs.length;
  const today      = new Date().toLocaleDateString();
  const todayJobs  = allJobs.filter(j => new Date(j.createdAt).toLocaleDateString() === today).length;
  const activeJobs = allJobs.filter(j =>
    !["Delivered", "Delivered NR/NA", "Cancelled"].includes(j.device?.mobileStatus)
  ).length;
  const totalService = allJobs.reduce((s, j) => s + Number(j.service?.serviceCharge || 0), 0);
  const totalSpare   = allJobs.reduce((s, j) => s + Number(j.service?.spareCharge   || 0), 0);
  const totalIncome  = allJobs.reduce((s, j) => s + Number(j.service?.income        || 0), 0);
  const totalOthers  = allJobs.reduce((s, j) => s + Number(j.service?.othersAmount  || 0), 0);
  const totalMargin  = allJobs.reduce((s, j) => s + Number(j.service?.margin        || 0), 0);
  const totalAdvance = allJobs.reduce((s, j) => s + Number(j.service?.advanceAmount || 0), 0);
  const grandTotal   = totalService + totalSpare + totalIncome + totalOthers;

  const handleDownloadExcel = () => {
    const rows = [];
    userList.forEach((user) => {
      const jobs = data[user];
      jobs.forEach((job, i) => {
        const sc  = Number(job.service?.serviceCharge || 0);
        const sp  = Number(job.service?.spareCharge   || 0);
        const inc = Number(job.service?.income         || 0);
        const oth = Number(job.service?.othersAmount   || 0);
        rows.push({
          "User":           user,
          "SL No":          i + 1,
          "Job Sheet":      job.jobSheetNo,
          "Customer":       job.customer?.name    || "—",
          "Contact":        job.customer?.contact || "—",
          "Device":         [job.device?.make, job.device?.model].filter(Boolean).join(" ") || "—",
          "Status":         job.device?.mobileStatus || "—",
          "Service Charge": sc,
          "Spare Charge":   sp,
          "Income":         inc,
          "Others":         oth,
          "Margin":         Number(job.service?.margin        || 0),
          "Advance":        Number(job.service?.advanceAmount || 0),
          "Total":          sc + sp + inc + oth,
          "Cancel Remarks": job.cancelRemarks || "—",
          "Cancelled By":   job.cancelledBy   || "—",
          "Date":           new Date(job.createdAt).toLocaleDateString(),
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "User Report");
    XLSX.writeFile(wb, `UserReport_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.xlsx`);
  };

  const userSummaries = userList.map((user) => {
    const jobs = data[user];
    const sc   = jobs.reduce((s, j) => s + Number(j.service?.serviceCharge || 0), 0);
    const sp   = jobs.reduce((s, j) => s + Number(j.service?.spareCharge   || 0), 0);
    const inc  = jobs.reduce((s, j) => s + Number(j.service?.income        || 0), 0);
    const oth  = jobs.reduce((s, j) => s + Number(j.service?.othersAmount  || 0), 0);
    const mg   = jobs.reduce((s, j) => s + Number(j.service?.margin        || 0), 0);
    const adv  = jobs.reduce((s, j) => s + Number(j.service?.advanceAmount || 0), 0);
    const statusCount = {};
    jobs.forEach(j => {
      const st = j.device?.mobileStatus || "Unknown";
      statusCount[st] = (statusCount[st] || 0) + 1;
    });
    return { user, jobs: jobs.length, serviceCharge: sc, spareCharge: sp, income: inc, others: oth, margin: mg, advance: adv, total: sc + sp + inc + oth, statusCount };
  });

  const dashboardUser = userFilter || userList[0] || "";
  const dashJobs      = dashboardUser && data[dashboardUser] ? data[dashboardUser] : [];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui, sans-serif" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h4 style={{ fontWeight: 600, margin: 0, fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <FaUser /> User JobSheet Report
        </h4>
        <div style={{ display: "flex", background: "#f1f3f5", borderRadius: 8, padding: 3 }}>
          {[["table", "Table View", FaTable], ["dashboard", "Dashboard", FaChartBar]].map(([val, label, Icon]) => (
            <button key={val} onClick={() => setView(val)} style={{
              padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 6,
              background: view === val ? "#fff" : "transparent",
              color:      view === val ? "#0d6efd" : "#6c757d",
              boxShadow:  view === val ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s",
            }}><Icon size={12} /> {label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
        <SummaryCard label="Total Users"    value={totalUsers} icon={<FaUser size={11} color="#6c757d" />} />
        <SummaryCard label="Total Jobs"     value={totalJobs} icon={<FaTable size={11} color="#6c757d" />} />
        <SummaryCard label="Today's Jobs"   value={todayJobs} icon={<FaCalendarAlt size={11} color="#6c757d" />} />
        <SummaryCard label="Active Jobs"    value={activeJobs} icon={<FaBolt size={11} color="#6c757d" />} />
        <SummaryCard label="Service Total"  value={fmt(totalService)}  accent="#7c3aed" icon={<FaWrench size={11} color="#7c3aed" />} />
        <SummaryCard label="Spare Total"    value={fmt(totalSpare)}    accent="#db2777" icon={<FaCogs size={11} color="#db2777" />} />
        <SummaryCard label="Income Total"   value={fmt(totalIncome)}   accent="#0e7490" icon={<FaRupeeSign size={11} color="#0e7490" />} />
        <SummaryCard label="Others Total"   value={fmt(totalOthers)}   accent="#c2410c" icon={<FaBoxOpen size={11} color="#c2410c" />} />
        <SummaryCard label="Grand Total"    value={fmt(grandTotal)}    accent="#059669" icon={<FaCoins size={11} color="#059669" />} />
        <SummaryCard label="Total Advance"  value={fmt(totalAdvance)}  accent="#0d6efd" icon={<FaHandHoldingUsd size={11} color="#0d6efd" />} />
        <SummaryCard label="Total Margin"   value={fmt(totalMargin)}   accent="#f59e0b" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <input
          className="form-control"
          style={{ maxWidth: 260 }}
          placeholder="Search username / job sheet..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
        />
        <div>
          <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 3 }}>From</div>
          <input type="date" className="form-control" style={{ maxWidth: 150 }}
            value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 3 }}>To</div>
          <input type="date" className="form-control" style={{ maxWidth: 150 }}
            value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-1" onClick={handleSearch}><FaSearch size={12} /> Search</button>
        {(searchText || fromDate || toDate) && (
          <button className="btn btn-outline-secondary d-flex align-items-center gap-1" onClick={handleClear}><FaTimes size={12} /> Clear</button>
        )}
        <button className="btn btn-success ms-auto d-flex align-items-center gap-1" onClick={handleDownloadExcel}
          disabled={userList.length === 0}>
          <FaFileExcel size={13} /> Excel
        </button>
      </div>

      {loading && <div className="text-center py-4 text-muted">Loading...</div>}
      {!loading && userList.length === 0 && (
        <div className="text-center text-muted py-4">No data found</div>
      )}

      {!loading && view === "table" && userList.map((user, idx) => {
        const jobs = data[user];

        const uSC  = jobs.reduce((s, j) => s + Number(j.service?.serviceCharge || 0), 0);
        const uSP  = jobs.reduce((s, j) => s + Number(j.service?.spareCharge   || 0), 0);
        const uINC = jobs.reduce((s, j) => s + Number(j.service?.income        || 0), 0);
        const uOTH = jobs.reduce((s, j) => s + Number(j.service?.othersAmount  || 0), 0);
        const uMG  = jobs.reduce((s, j) => s + Number(j.service?.margin        || 0), 0);
        const uADV = jobs.reduce((s, j) => s + Number(j.service?.advanceAmount || 0), 0);
        const uTOT = uSC + uSP + uINC + uOTH;

        return (
          <div key={user} style={{
            border: "1px solid #e9ecef", borderRadius: 10,
            overflow: "hidden", marginBottom: 28,
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
          }}>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 10,
              padding: "10px 16px", background: "#f8f9fa",
              borderBottom: "1px solid #e9ecef"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={user} idx={idx} />
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{user || "Unknown"}</span>
                  <span style={{ fontSize: 12, color: "#6c757d", marginLeft: 8 }}>{jobs.length} jobs</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Service", val: fmt(uSC),  color: "#7c3aed" },
                  { label: "Spare",   val: fmt(uSP),  color: "#db2777" },
                  { label: "Income",  val: fmt(uINC), color: "#0e7490" },
                  { label: "Others",  val: fmt(uOTH), color: "#c2410c" },
                  { label: "Total",   val: fmt(uTOT), color: "#059669" },
                  { label: "Advance", val: fmt(uADV), color: "#0d6efd" },
                  { label: "Margin",  val: fmt(uMG),  color: "#f59e0b" },
                ].map(p => (
                  <div key={p.label} style={{
                    background: "#fff", border: "1px solid #e9ecef",
                    borderRadius: 20, padding: "3px 12px",
                    fontSize: 12
                  }}>
                    <span style={{ color: "#6c757d" }}>{p.label}: </span>
                    <span style={{ fontWeight: 600, color: p.color }}>{p.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8f9fa" }}>
                    {["#", "Job Sheet", "Customer", "Contact", "Device", "Status",
                      "Service ₹", "Spare ₹", "Income ₹", "Others ₹", "Margin ₹", "Advance ₹", "Total ₹", "Date"].map(h => (
                      <th key={h} style={{
                        padding: "8px 10px", textAlign: "left",
                        borderBottom: "1px solid #e9ecef",
                        color: "#6c757d", fontWeight: 500, fontSize: 12,
                        whiteSpace: "nowrap"
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, i) => {
                    const sc  = Number(job.service?.serviceCharge || 0);
                    const sp  = Number(job.service?.spareCharge   || 0);
                    const inc = Number(job.service?.income        || 0);
                    const oth = Number(job.service?.othersAmount  || 0);
                    const mg  = Number(job.service?.margin        || 0);
                    const adv = Number(job.service?.advanceAmount || 0);
                    const tot = sc + sp + inc + oth;
                    return (
                      <tr key={job._id}
                        style={{ borderBottom: "1px solid #f0f0f0" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}
                      >
                        <td style={{ padding: "8px 10px", color: "#6c757d" }}>{i + 1}</td>
                        <td style={{ padding: "8px 10px", color: "#0d6efd", fontWeight: 500 }}>{job.jobSheetNo}</td>
                        <td style={{ padding: "8px 10px" }}>{job.customer?.name || "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#6c757d" }}>{job.customer?.contact || "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#6c757d" }}>
                          {[job.device?.make, job.device?.model].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <StatusBadge status={job.device?.mobileStatus} />
                          {job.isCancelled && job.cancelRemarks && (
                            <div style={{ fontSize: 10, color: "#dc3545", marginTop: 2 }}>📝 {job.cancelRemarks}</div>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", color: "#7c3aed", fontWeight: 500 }}>{sc ? fmt(sc) : "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#db2777", fontWeight: 500 }}>{sp ? fmt(sp) : "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#0e7490", fontWeight: 500 }}>{inc ? fmt(inc) : "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#c2410c", fontWeight: 500 }}>{oth ? fmt(oth) : "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#f59e0b", fontWeight: 500 }}>{mg ? fmt(mg) : "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#0d6efd", fontWeight: 500 }}>{adv ? fmt(adv) : "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#059669", fontWeight: 600 }}>{tot ? fmt(tot) : "—"}</td>
                        <td style={{ padding: "8px 10px", color: "#6c757d", whiteSpace: "nowrap" }}>
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}

                  <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>
                    <td colSpan={6} style={{ padding: "8px 10px", fontWeight: 700, fontSize: 13, color: "#166534" }}>
                      Subtotal — {user}
                    </td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#7c3aed" }}>{fmt(uSC)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#db2777" }}>{fmt(uSP)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0e7490" }}>{fmt(uINC)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#c2410c" }}>{fmt(uOTH)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#f59e0b" }}>{fmt(uMG)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0d6efd" }}>{fmt(uADV)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#059669" }}>{fmt(uTOT)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {!loading && view === "dashboard" && (
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: "#6c757d", marginBottom: 4, fontWeight: 500 }}>Select User</div>
              <select
                className="form-select"
                style={{ minWidth: 200 }}
                value={userFilter}
                onChange={e => setUserFilter(e.target.value)}
              >
                <option value="">All Users</option>
                {userList.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {!userFilter && (
            <div style={{ border: "1px solid #e9ecef", borderRadius: 10, overflow: "hidden", marginBottom: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: "10px 16px", background: "#f8f9fa", borderBottom: "1px solid #e9ecef", fontWeight: 600, fontSize: 14 }}>
                All Users — Overview
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa" }}>
                      {["User", "Total Jobs", "Service ₹", "Spare ₹", "Income ₹", "Others ₹", "Total Amount", "Advance", "Margin"].map(h => (
                        <th key={h} style={{ padding: "9px 12px", borderBottom: "1px solid #e9ecef", color: "#6c757d", fontWeight: 500, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {userSummaries.map((u, idx) => (
                      <tr key={u.user}
                        style={{ borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}
                        onClick={() => setUserFilter(u.user)}
                      >
                        <td style={{ padding: "9px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar name={u.user} idx={idx} />
                            <span style={{ fontWeight: 500 }}>{u.user}</span>
                          </div>
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "center" }}>
                          <span style={{ background: "#e9ecef", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{u.jobs}</span>
                        </td>
                        <td style={{ padding: "9px 12px", color: "#7c3aed", fontWeight: 600 }}>{fmt(u.serviceCharge)}</td>
                        <td style={{ padding: "9px 12px", color: "#db2777", fontWeight: 600 }}>{fmt(u.spareCharge)}</td>
                        <td style={{ padding: "9px 12px", color: "#0e7490", fontWeight: 600 }}>{fmt(u.income)}</td>
                        <td style={{ padding: "9px 12px", color: "#c2410c", fontWeight: 600 }}>{fmt(u.others)}</td>
                        <td style={{ padding: "9px 12px", color: "#059669", fontWeight: 700 }}>{fmt(u.total)}</td>
                        <td style={{ padding: "9px 12px", color: "#0d6efd", fontWeight: 600 }}>{fmt(u.advance)}</td>
                        <td style={{ padding: "9px 12px", color: "#f59e0b", fontWeight: 600 }}>{fmt(u.margin)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#166534" }}>Grand Total</td>
                      <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 700 }}>{totalJobs}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#7c3aed" }}>{fmt(totalService)}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#db2777" }}>{fmt(totalSpare)}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#0e7490" }}>{fmt(totalIncome)}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#c2410c" }}>{fmt(totalOthers)}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#059669" }}>{fmt(grandTotal)}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#0d6efd" }}>{fmt(totalAdvance)}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#f59e0b" }}>{fmt(totalMargin)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {userFilter && dashboardUser && (
            <div>
              <button className="btn btn-outline-secondary btn-sm mb-3"
                onClick={() => setUserFilter("")}>
                ← All Users
              </button>

              {(() => {
                const u = userSummaries.find(x => x.user === dashboardUser);
                if (!u) return null;
                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <Avatar name={u.user} idx={userList.indexOf(u.user)} />
                      <span style={{ fontWeight: 600, fontSize: 16 }}>{u.user}</span>
                      <span style={{ fontSize: 13, color: "#6c757d" }}>{u.jobs} jobs</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
                      <SummaryCard label="Total Jobs"     value={u.jobs} />
                      <SummaryCard label="Service Charge" value={fmt(u.serviceCharge)} accent="#7c3aed" icon={<FaWrench size={11} color="#7c3aed" />} />
                      <SummaryCard label="Spare Charge"   value={fmt(u.spareCharge)}   accent="#db2777" icon={<FaCogs size={11} color="#db2777" />} />
                      <SummaryCard label="Income"         value={fmt(u.income)}        accent="#0e7490" icon={<FaRupeeSign size={11} color="#0e7490" />} />
                      <SummaryCard label="Others"         value={fmt(u.others)}        accent="#c2410c" icon={<FaBoxOpen size={11} color="#c2410c" />} />
                      <SummaryCard label="Total Amount"   value={fmt(u.total)}          accent="#059669" icon={<FaCoins size={11} color="#059669" />} />
                      <SummaryCard label="Advance"        value={fmt(u.advance)}        accent="#0d6efd" icon={<FaHandHoldingUsd size={11} color="#0d6efd" />} />
                      <SummaryCard label="Margin"         value={fmt(u.margin)}         accent="#f59e0b" />
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                      {Object.entries(u.statusCount).map(([st, cnt]) => {
                        const sc = statusColors[st] || { bg: "#f1f3f5", color: "#495057" };
                        return (
                          <div key={st} style={{
                            background: sc.bg, color: sc.color,
                            borderRadius: 20, padding: "4px 14px",
                            fontSize: 12, fontWeight: 500,
                            border: `1px solid ${sc.color}22`
                          }}>
                            {st}: <strong>{cnt}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div style={{ border: "1px solid #e9ecef", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8f9fa" }}>
                        {["#", "Job Sheet", "Customer", "Contact", "Device", "Status",
                          "Service ₹", "Spare ₹", "Income ₹", "Others ₹", "Margin ₹", "Advance ₹", "Total ₹", "Date"].map(h => (
                          <th key={h} style={{
                            padding: "8px 10px", borderBottom: "1px solid #e9ecef",
                            color: "#6c757d", fontWeight: 500, fontSize: 12, whiteSpace: "nowrap"
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dashJobs.map((job, i) => {
                        const sc  = Number(job.service?.serviceCharge || 0);
                        const sp  = Number(job.service?.spareCharge   || 0);
                        const inc = Number(job.service?.income        || 0);
                        const oth = Number(job.service?.othersAmount  || 0);
                        const mg  = Number(job.service?.margin        || 0);
                        const adv = Number(job.service?.advanceAmount || 0);
                        const tot = sc + sp + inc + oth;
                        return (
                          <tr key={job._id}
                            style={{ borderBottom: "1px solid #f0f0f0" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
                            onMouseLeave={e => e.currentTarget.style.background = ""}
                          >
                            <td style={{ padding: "8px 10px", color: "#6c757d" }}>{i + 1}</td>
                            <td style={{ padding: "8px 10px", color: "#0d6efd", fontWeight: 500 }}>{job.jobSheetNo}</td>
                            <td style={{ padding: "8px 10px" }}>{job.customer?.name || "—"}</td>
                            <td style={{ padding: "8px 10px", color: "#6c757d" }}>{job.customer?.contact || "—"}</td>
                            <td style={{ padding: "8px 10px", color: "#6c757d" }}>
                              {[job.device?.make, job.device?.model].filter(Boolean).join(" ") || "—"}
                            </td>
                            <td style={{ padding: "8px 10px" }}>
                              <StatusBadge status={job.device?.mobileStatus} />
                              {job.isCancelled && job.cancelRemarks && (
                                <div style={{ fontSize: 10, color: "#dc3545", marginTop: 2 }}>📝 {job.cancelRemarks}</div>
                              )}
                            </td>
                            <td style={{ padding: "8px 10px", color: "#7c3aed", fontWeight: 500 }}>{sc ? fmt(sc) : "—"}</td>
                            <td style={{ padding: "8px 10px", color: "#db2777", fontWeight: 500 }}>{sp ? fmt(sp) : "—"}</td>
                            <td style={{ padding: "8px 10px", color: "#0e7490", fontWeight: 500 }}>{inc ? fmt(inc) : "—"}</td>
                            <td style={{ padding: "8px 10px", color: "#c2410c", fontWeight: 500 }}>{oth ? fmt(oth) : "—"}</td>
                            <td style={{ padding: "8px 10px", color: "#f59e0b", fontWeight: 500 }}>{mg ? fmt(mg) : "—"}</td>
                            <td style={{ padding: "8px 10px", color: "#0d6efd", fontWeight: 500 }}>{adv ? fmt(adv) : "—"}</td>
                            <td style={{ padding: "8px 10px", color: "#059669", fontWeight: 600 }}>{tot ? fmt(tot) : "—"}</td>
                            <td style={{ padding: "8px 10px", color: "#6c757d", whiteSpace: "nowrap" }}>
                              {new Date(job.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default UserReportPage;