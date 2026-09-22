import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Package, Search, User, Users, CalendarDays, RotateCcw, Printer,
  FileSpreadsheet, FileText, Loader2, Inbox, Filter, Hash, Tag, IndianRupee,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

/* ================= HELPERS ================= */
const fmtDMY = (v) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v.split("-").reverse().join("-") : v || "-";
const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* Rep name-ku fixed color — same rep-ku eppovum same color */
const REP_COLORS = [
  { bg: "#dbeafe", fg: "#1d4ed8" },
  { bg: "#d1fae5", fg: "#047857" },
  { bg: "#ede9fe", fg: "#6d28d9" },
  { bg: "#fef3c7", fg: "#b45309" },
  { bg: "#ffe4e6", fg: "#be123c" },
  { bg: "#cffafe", fg: "#0e7490" },
  { bg: "#fae8ff", fg: "#a21caf" },
  { bg: "#ecfccb", fg: "#4d7c0f" },
];
const repColor = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return REP_COLORS[h % REP_COLORS.length];
};

const TONES = {
  blue:   { bg: "#dbeafe", fg: "#2563eb" },
  orange: { bg: "#ffedd5", fg: "#ea580c" },
  cyan:   { bg: "#cffafe", fg: "#0e7490" },
};

/* ================= SMALL UI PARTS ================= */
const Field = ({ label, icon: Icon, className = "", children }) => (
  <div className={`oth-field ${className}`}>
    <div className="oth-label">
      {Icon && <Icon size={12} />}
      <span>{label}</span>
    </div>
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="oth-stat">
    <div className="oth-stat-icon" style={{ background: tone.bg, color: tone.fg }}>
      <Icon size={20} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div className="oth-stat-label">{label}</div>
      <div className="oth-stat-value">{value}</div>
    </div>
  </div>
);

const Th = ({ icon: Icon, className = "", children }) => (
  <th className={className}>
    <span className="oth-th">{Icon && <Icon size={13} />}{children}</span>
  </th>
);

/* ================= PAGE ================= */
const OthersReportPage = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchText, setSearchText] = useState("");   // Job Sheet No / Name / Service Rep
  const [repFilter, setRepFilter] = useState("");     // Service Rep dropdown

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/jobsheets/filter`, { params: {} });
      setData(res.data);
    } catch (err) {
      console.error(err);
      alert("Report load failed ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const handleClearFilter = () => {
    setFromDate("");
    setToDate("");
    setSearchText("");
    setRepFilter("");
    fetchReport();
  };

  // Service Rep dropdown options (data-la irukkura reps)
  const repOptions = useMemo(() => {
    const set = new Set();
    data.forEach((j) => { if (j.service?.serviceRep) set.add(j.service.serviceRep); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  /* ================= FLAT ENTRIES ================= */
  const allEntries = useMemo(() => {
    const entries = [];

    data.forEach((item) => {
      const jobSheetNo = item.jobSheetNo || "";
      const name       = item.customer?.name || "";
      const serviceRep = item.service?.serviceRep || "";
      const repairDate = item.service?.repairDate?.slice(0, 10) || "";
      const othersItems = item.service?.othersItems || [];

      if (othersItems.length > 0) {
        othersItems.forEach((oi) => {
          const amt = Number(oi.amount || 0);
          if (amt > 0) {
            const d = oi.date ? new Date(oi.date).toISOString().slice(0, 10) : repairDate;
            entries.push({ date: d, jobSheetNo, name, serviceRep, category: oi.category || "-", amount: amt });
          }
        });
      } else {
        const amt = Number(item.service?.othersAmount || 0);
        if (amt > 0) {
          entries.push({ date: repairDate, jobSheetNo, name, serviceRep, category: "-", amount: amt });
        }
      }
    });

    return entries;
  }, [data]);

  /* ================= FILTER ================= */
  const filteredEntries = useMemo(() => {
    let visible = allEntries;

    // Search — Job Sheet No / Name / Service Rep
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      visible = visible.filter((e) =>
        `${e.jobSheetNo} ${e.name} ${e.serviceRep}`.toLowerCase().includes(q)
      );
    }

    // Service Rep dropdown
    if (repFilter) {
      visible = visible.filter((e) => e.serviceRep === repFilter);
    }

    // Date range
    if (fromDate || toDate) {
      visible = visible.filter((e) => {
        if (!e.date) return false;
        if (fromDate && e.date < fromDate) return false;
        if (toDate && e.date > toDate) return false;
        return true;
      });
    }

    return visible;
  }, [allEntries, searchText, repFilter, fromDate, toDate]);

  /* ================= GROUP BY DATE ================= */
  const groupedData = useMemo(() => {
    const grouped = {};
    filteredEntries.forEach((e) => {
      const d = e.date || "Unknown";
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(e);
    });
    const sorted = {};
    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach((k) => (sorted[k] = grouped[k]));
    return sorted;
  }, [filteredEntries]);

  const grandTotal   = filteredEntries.reduce((s, r) => s + r.amount, 0);
  const entriesCount = filteredEntries.length;
  const jobsCount    = new Set(filteredEntries.map((r) => r.jobSheetNo)).size;
  const hasRows      = entriesCount > 0;

  /* ================= EXCEL DOWNLOAD ================= */
  const handleExcel = () => {
    const blank = () => ({
      "Date": "", "SL No": "", "Job Sheet": "", "Customer": "", "Service Rep": "", "Category": "", "Amount": "",
    });
    const f2 = (n) => Number(n || 0).toFixed(2);
    const rows = [];

    Object.entries(groupedData).forEach(([date, records]) => {
      records.forEach((item, i) => {
        rows.push({
          "Date": date,
          "SL No": i + 1,
          "Job Sheet": item.jobSheetNo,
          "Customer": item.name,
          "Service Rep": item.serviceRep,
          "Category": item.category,
          "Amount": f2(item.amount),
        });
      });
      rows.push({ ...blank(), "Category": `Sub Total (${date})`, "Amount": f2(records.reduce((s, r) => s + r.amount, 0)) });
      rows.push(blank());
    });

    rows.push({ ...blank(), "Category": "GRAND TOTAL", "Amount": f2(grandTotal) });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Others Report");
    XLSX.writeFile(wb, `Others_Report_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.xlsx`);
  };

  const handlePrint = () => window.print();

  return (
    <div className="oth-page">
      <div className="oth-container">

        {/* ============ HEADER ============ */}
        <div className="oth-header">
          <div className="oth-header-left">
            <div className="oth-logo"><Package size={28} /></div>
            <div>
              <h1 className="oth-title">Others Expense Report</h1>
              <div className="oth-subtitle">Date-wise other expenses</div>
            </div>
          </div>

          <div className="oth-header-actions oth-noprint">
            <button className="oth-btn oth-btn-ghost" onClick={handlePrint}>
              <Printer size={16} /> Print
            </button>
            <button className="oth-btn oth-btn-green" onClick={handleExcel} disabled={!hasRows}>
              <FileSpreadsheet size={16} /> Excel Download
            </button>
          </div>
        </div>

        {/* ============ FILTER BAR ============ */}
        <div className="oth-card oth-noprint" style={{ padding: 20, marginBottom: 20 }}>
          <div className="oth-card-title">
            <Filter size={16} color="#2563eb" /> Filters
          </div>

          <div className="oth-filter-row">
            <Field label="Search" icon={Search} className="oth-f-search">
              <div className="oth-input-wrap">
                <Search size={16} className="oth-input-icon" />
                <input
                  type="text"
                  className="oth-input has-icon"
                  placeholder="Job Sheet No / Name / Service Rep"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </Field>

            <Field label="Service Rep" icon={User} className="oth-f-rep">
              <div className="oth-input-wrap">
                <User size={16} className="oth-input-icon" />
                <select
                  className="oth-input has-icon"
                  value={repFilter}
                  onChange={(e) => setRepFilter(e.target.value)}
                >
                  <option value="">All Reps</option>
                  {repOptions.map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
            </Field>

            <Field label="From" icon={CalendarDays} className="oth-f-date">
              <input type="date" className="oth-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </Field>

            <Field label="To" icon={CalendarDays} className="oth-f-date">
              <input type="date" className="oth-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </Field>

            <div className="oth-f-actions">
              <button className="oth-btn oth-btn-primary" onClick={fetchReport} disabled={loading}>
                {loading ? <Loader2 size={16} className="oth-spin" /> : <Search size={16} />}
                {loading ? "Loading" : "Load Report"}
              </button>
              <button className="oth-btn oth-btn-ghost" onClick={handleClearFilter} title="Clear Filter">
                <RotateCcw size={16} /> Clear
              </button>
            </div>
          </div>
        </div>

        {/* ============ STAT CARDS ============ */}
        <div className="oth-stats">
          <StatCard icon={FileText}    label="Total Jobs"    value={jobsCount}          tone={TONES.blue} />
          <StatCard icon={Tag}         label="Entries"       value={entriesCount}       tone={TONES.cyan} />
          <StatCard icon={IndianRupee} label="Others Total"  value={money(grandTotal)}  tone={TONES.orange} />
        </div>

        {/* ============ RESULT CARD ============ */}
        <div className="oth-card" style={{ overflow: "hidden" }}>
          <div className="oth-result-head">
            <div className="oth-result-title">
              <FileText size={18} color="#64748b" />
              {jobsCount} jobs <span style={{ color: "#cbd5e1" }}>|</span> {entriesCount} entries
            </div>
            <div className="oth-chips">
              <span className="oth-chip" style={{ background: "#f1f5f9", color: "#475569" }}>
                <CalendarDays size={12} />
                {fromDate || toDate
                  ? `${fmtDMY(fromDate) === "-" ? "All" : fmtDMY(fromDate)} → ${fmtDMY(toDate) === "-" ? "All" : fmtDMY(toDate)}`
                  : "All Dates"}
              </span>
              {repFilter && (
                <span className="oth-chip" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                  <User size={12} /> {repFilter}
                </span>
              )}
              {searchText.trim() && (
                <span className="oth-chip" style={{ background: "#f5f3ff", color: "#6d28d9" }}>
                  <Search size={12} /> "{searchText.trim()}"
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="oth-empty">
              <Loader2 size={32} className="oth-spin" />
              <div className="oth-empty-sub">Loading report...</div>
            </div>
          ) : !hasRows ? (
            <div className="oth-empty">
              <div className="oth-empty-icon"><Inbox size={30} /></div>
              <div className="oth-empty-title">No records found</div>
              <div className="oth-empty-sub">Date range / Service Rep maathi try pannunga</div>
            </div>
          ) : (
            <div className="oth-table-wrap">
              <table className="oth-table">
                <thead>
                  <tr>
                    <Th>SL</Th>
                    <Th icon={Hash}>Job Sheet</Th>
                    <Th icon={User}>Customer</Th>
                    <Th icon={Users}>Service Rep</Th>
                    <Th icon={Tag}>Category</Th>
                    <Th className="r">Amount ₹</Th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(groupedData).map(([date, records]) => {
                    const subTotal = records.reduce((s, r) => s + r.amount, 0);

                    return (
                      <React.Fragment key={date}>
                        <tr className="oth-date-row">
                          <td colSpan={6}>
                            <div className="oth-date-cell">
                              <CalendarDays size={16} />
                              {fmtDMY(date)}
                              <span className="oth-count">
                                {records.length} {records.length > 1 ? "entries" : "entry"}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {records.map((item, i) => {
                          const rc = repColor(item.serviceRep);
                          return (
                            <tr key={i} className="oth-row">
                              <td style={{ color: "#64748b" }}>{i + 1}</td>
                              <td><span className="oth-jobpill">{item.jobSheetNo}</span></td>
                              <td><div className="oth-cust">{item.name || "-"}</div></td>
                              <td>
                                {item.serviceRep ? (
                                  <span className="oth-rep">
                                    <span className="oth-avatar" style={{ background: rc.bg, color: rc.fg }}>
                                      {item.serviceRep.charAt(0).toUpperCase()}
                                    </span>
                                    {item.serviceRep}
                                  </span>
                                ) : (
                                  <span className="oth-dash">-</span>
                                )}
                              </td>
                              <td>
                                <span className="oth-badge oth-badge-cat">{item.category}</span>
                              </td>
                              <td className="r oth-bold">{money(item.amount)}</td>
                            </tr>
                          );
                        })}

                        {/* SUB TOTAL */}
                        <tr className="oth-sub-row">
                          <td colSpan={5} className="r">Sub Total ({fmtDMY(date)})</td>
                          <td className="r">{money(subTotal)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  {/* GRAND TOTAL */}
                  <tr className="oth-grand-row">
                    <td colSpan={5} className="r">Grand Total</td>
                    <td className="r" style={{ color: "#fed7aa" }}>{money(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ============ SCOPED STYLES ============ */}
      <style>{`
        .oth-page, .oth-page * { box-sizing: border-box; }
        .oth-page { min-height: 100vh; background: #f1f5f9; padding: 24px 32px; color: #1e293b; }
        .oth-container { max-width: 1600px; margin: 0 auto; }

        /* header */
        .oth-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
        .oth-header-left { display: flex; align-items: center; gap: 16px; }
        .oth-header-actions { display: flex; align-items: center; gap: 8px; }
        .oth-logo { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #fff;
          background: linear-gradient(135deg, #f97316, #ea580c); box-shadow: 0 8px 18px rgba(234,88,12,.3); flex-shrink: 0; }
        .oth-title { margin: 0; font-size: 28px; font-weight: 800; line-height: 1.2; letter-spacing: -0.3px; color: #1e293b; }
        .oth-subtitle { margin-top: 2px; font-size: 14px; color: #64748b; }

        /* card */
        .oth-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .oth-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 16px; }

        /* filter row */
        .oth-filter-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; }
        .oth-f-search { flex: 2 1 260px; }
        .oth-f-rep { flex: 1 1 170px; }
        .oth-f-date { flex: 1 1 145px; }
        .oth-f-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
        .oth-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .oth-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #64748b; line-height: 1; }
        .oth-label svg { flex-shrink: 0; }

        /* inputs */
        .oth-input-wrap { position: relative; }
        .oth-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
        .oth-input { display: block; width: 100%; height: 40px; padding: 0 12px; font-size: 14px; color: #1e293b; background: #fff;
          border: 1px solid #cbd5e1; border-radius: 10px; outline: none; transition: border-color .15s, box-shadow .15s; font-family: inherit; }
        .oth-input.has-icon { padding-left: 38px; }
        .oth-input::placeholder { color: #94a3b8; }
        .oth-input:focus { border-color: #2563eb; box-shadow: 0 0 0 4px #dbeafe; }

        /* buttons */
        .oth-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 18px; font-size: 14px; font-weight: 600;
          border: 1px solid transparent; border-radius: 10px; cursor: pointer; white-space: nowrap; transition: background .15s; font-family: inherit; line-height: 1; }
        .oth-btn:disabled { opacity: .55; cursor: not-allowed; }
        .oth-btn-primary { background: #2563eb; color: #fff; box-shadow: 0 1px 2px rgba(37,99,235,.35); }
        .oth-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .oth-btn-green { background: #059669; color: #fff; }
        .oth-btn-green:hover:not(:disabled) { background: #047857; }
        .oth-btn-ghost { background: #fff; color: #334155; border-color: #cbd5e1; }
        .oth-btn-ghost:hover:not(:disabled) { background: #f8fafc; }

        /* stat cards */
        .oth-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .oth-stat { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .oth-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .oth-stat-label { font-size: 12px; font-weight: 600; color: #64748b; }
        .oth-stat-value { font-size: 20px; font-weight: 800; color: #1e293b; line-height: 1.2; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* result head */
        .oth-result-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; }
        .oth-result-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #1e293b; }
        .oth-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .oth-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }

        /* empty */
        .oth-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 80px 20px; color: #94a3b8; }
        .oth-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
        .oth-empty-title { font-size: 16px; font-weight: 600; color: #64748b; }
        .oth-empty-sub { font-size: 14px; }
        .oth-spin { animation: othSpin 1s linear infinite; }
        @keyframes othSpin { to { transform: rotate(360deg); } }

        /* table */
        .oth-table-wrap { overflow: auto; max-height: 640px; }
        .oth-table { width: 100%; min-width: 800px; border-collapse: collapse; font-size: 13px; }
        .oth-table th { position: sticky; top: 0; z-index: 2; background: #1e293b; color: #f1f5f9; font-size: 11.5px; font-weight: 600; letter-spacing: .05em;
          text-transform: uppercase; text-align: left; padding: 12px 12px; white-space: nowrap; }
        .oth-table th.r, .oth-table td.r { text-align: right; }
        .oth-th { display: inline-flex; align-items: center; gap: 6px; }
        .oth-table td { padding: 10px 12px; vertical-align: middle; white-space: nowrap; }

        .oth-date-row td { background: #eff6ff; border-top: 2px solid #93c5fd; border-bottom: 1px solid #bfdbfe; padding: 9px 14px; }
        .oth-date-cell { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #1e3a8a; }
        .oth-count { padding: 2px 8px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 600; }

        .oth-row td { border-bottom: 1px solid #f1f5f9; transition: background .3s; }
        .oth-row:hover td { background: #f8fafc; }

        .oth-jobpill { display: inline-block; padding: 3px 8px; border-radius: 6px; background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 700; }
        .oth-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .oth-badge-cat { background: #ffedd5; color: #9a3412; }
        .oth-cust { font-weight: 600; color: #1e293b; }
        .oth-rep { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; color: #334155; }
        .oth-avatar { width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .oth-dash { color: #94a3b8; }
        .oth-bold { font-weight: 700; }
        .oth-table td.r { font-variant-numeric: tabular-nums; }

        .oth-sub-row td { background: #f1f5f9; padding: 10px 12px; font-weight: 700; color: #1e293b; }
        .oth-sub-row td:first-child { font-size: 12px; letter-spacing: .05em; text-transform: uppercase; color: #64748b; }
        .oth-grand-row td { background: #1e293b; color: #fff; padding: 14px 12px; font-size: 14px; font-weight: 800; border-top: 2px solid #334155; }
        .oth-grand-row td:first-child { font-size: 13px; letter-spacing: .06em; text-transform: uppercase; }

        @media (max-width: 640px) {
          .oth-page { padding: 16px; }
          .oth-title { font-size: 22px; }
        }

        @media print {
          .oth-noprint { display: none !important; }
          .oth-page { background: #fff; padding: 0; }
          .oth-card, .oth-stat { box-shadow: none !important; }
          .oth-table-wrap { overflow: visible; max-height: none; }
          .oth-table { min-width: 0; font-size: 10px; }
          .oth-table th { position: static; }
          .oth-row, .oth-sub-row { break-inside: avoid; }
          .oth-table th, .oth-grand-row td, .oth-date-row td, .oth-badge-cat { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default OthersReportPage;