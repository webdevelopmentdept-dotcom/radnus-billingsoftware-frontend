import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  BarChart3, Search, User, Users, CalendarDays, RotateCcw, Printer,
  FileSpreadsheet, FileText, Wrench, Cog, IndianRupee, Package,
  HandCoins, Loader2, Inbox, Phone, Filter, Hash, Scale, Tag,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

/* ================= HELPERS ================= */
const todayStr = () => new Date().toLocaleDateString("en-CA");
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
  green:  { bg: "#d1fae5", fg: "#059669" },
  amber:  { bg: "#fef3c7", fg: "#d97706" },
  violet: { bg: "#ede9fe", fg: "#7c3aed" },
  cyan:   { bg: "#cffafe", fg: "#0e7490" },
  orange: { bg: "#ffedd5", fg: "#ea580c" },
  rose:   { bg: "#ffe4e6", fg: "#e11d48" },
  red:    { bg: "#fee2e2", fg: "#dc2626" },
};

/* Device status pill colors — same palette AllReportPage uses */
const getStatusStyle = (s) => {
  if (s === "Delivered")       return { background: "#d1fae5", color: "#065f46" };
  if (s === "Pending")         return { background: "#fef3c7", color: "#92400e" };
  if (s === "Received")        return { background: "#dbeafe", color: "#1e40af" };
  if (s === "Repaired")        return { background: "#e0e7ff", color: "#3730a3" };
  if (s === "Delivered NR/NA") return { background: "#fee2e2", color: "#991b1b" };
  if (s === "Cancelled")       return { background: "#fee2e2", color: "#991b1b" };
  return { background: "#f3f4f6", color: "#374151" };
};

/* ================= SMALL UI PARTS ================= */
const Field = ({ label, icon: Icon, className = "", children }) => (
  <div className={`val-field ${className}`}>
    <div className="val-label">
      {Icon && <Icon size={12} />}
      <span>{label}</span>
    </div>
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="val-stat">
    <div className="val-stat-icon" style={{ background: tone.bg, color: tone.fg }}>
      <Icon size={20} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div className="val-stat-label">{label}</div>
      <div className="val-stat-value">{value}</div>
    </div>
  </div>
);

const Th = ({ icon: Icon, className = "", children }) => (
  <th className={className}>
    <span className="val-th">{Icon && <Icon size={13} />}{children}</span>
  </th>
);

/* ================= PAGE ================= */
const ValueReport = () => {
  const today = todayStr();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [searchText, setSearchText] = useState("");
  const [repFilter, setRepFilter] = useState("");

  /* ✅ NEW — Status filter. Default "Delivered" (unga sonna maadhiri). Dropdown-la
     Delivered / Delivered NR/NA / All Status choose pannikalam. */
  const [statusFilter, setStatusFilter] = useState("Delivered");

  /* default "delivery" — dropdown la Received / Created-ku maathikalam */
  const [dateFilterType, setDateFilterType] = useState("delivery");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchReport(); }, []);

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

  const handleClearFilter = () => {
    setFromDate("");
    setToDate("");
    setSearchText("");
    setRepFilter("");
    setStatusFilter("Delivered");
    fetchReport();
  };

  const repOptions = useMemo(() => {
    const set = new Set();
    data.forEach((j) => { if (j.service?.serviceRep) set.add(j.service.serviceRep); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  /* ================= LIFETIME TOTAL HELPERS ================= */
  const getIncomeTotal = (item) => {
    const entries = item.service?.revenueEntries || [];
    return entries.length > 0
      ? entries.reduce((s, e) => s + Number(e.income || 0), 0)
      : Number(item.service?.income || 0);
  };
  const getServiceTotal = (item) => {
    const entries = item.service?.revenueEntries || [];
    return entries.length > 0
      ? entries.reduce((s, e) => s + Number(e.service || 0), 0)
      : Number(item.service?.serviceCharge || 0);
  };
  const getBalanceTotal  = (item) => Number(item.service?.balance || 0);
  const getRawSpareTotal = (item) => Number(item.service?.rawSpareCharge || 0);

  /* ================= ONE ROW PER JOB SHEET ================= */
  const buildRows = (jobsheets) =>
    jobsheets.map((item) => ({
      _id:         item._id,
      jobSheetNo:  item.jobSheetNo || "-",
      name:        item.customer?.name || "",
      contact:     item.customer?.contact || "",
      serviceRep:  item.service?.serviceRep || "",
      status:      item.device?.mobileStatus || "-",   // ✅ NEW

      createdAt:    item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : "",
      repairDate:   item.service?.repairDate ? new Date(item.service.repairDate).toISOString().slice(0, 10) : "",
      deliveryDate: item.service?.deliveryDate ? new Date(item.service.deliveryDate).toISOString().slice(0, 10) : "",

      advance:     Number(item.service?.advanceAmount || 0),
      balance:     getBalanceTotal(item),
      rawSpare:    getRawSpareTotal(item),
      spare:       Number(item.service?.spareCharge || 0),
      others:      Number(item.service?.othersAmount || 0),
      totalIncome: getIncomeTotal(item),
      margin:      getServiceTotal(item),
    }));

  const getFilterDate = (row) => {
    if (dateFilterType === "created")  return row.createdAt || "";
    if (dateFilterType === "received") return row.repairDate || "";
    return row.deliveryDate || ""; // "delivery" default
  };

  const getFilteredRows = () => {
    const rows = buildRows(data);
    let visible = rows;

    /* ✅ NEW — Status filter (default: only Delivered) */
    if (statusFilter !== "All") {
      visible = visible.filter((row) => row.status === statusFilter);
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      visible = visible.filter((row) =>
        `${row.jobSheetNo} ${row.name} ${row.contact} ${row.serviceRep}`.toLowerCase().includes(q)
      );
    }

    if (repFilter) {
      visible = visible.filter((row) => row.serviceRep === repFilter);
    }

    if (fromDate || toDate) {
      visible = visible.filter((row) => {
        const d = getFilterDate(row);
        if (!d) return false;
        if (fromDate && toDate) return d >= fromDate && d <= toDate;
        if (fromDate) return d >= fromDate;
        if (toDate)   return d <= toDate;
        return true;
      });
    }

    // 🔁 CHANGED — date-wise grouping remove pannitten; plain flat table,
    // just sorted by the selected date type (latest first).
    return [...visible].sort((a, b) => getFilterDate(b).localeCompare(getFilterDate(a)));
  };

  const allRows = getFilteredRows();

  const grandAdvance  = allRows.reduce((s, r) => s + r.advance,     0);
  const grandBalance  = allRows.reduce((s, r) => s + r.balance,     0);
  const grandRawSpare = allRows.reduce((s, r) => s + r.rawSpare,    0);
  const grandSpare    = allRows.reduce((s, r) => s + r.spare,       0);
  const grandOthers   = allRows.reduce((s, r) => s + r.others,      0);
  const grandIncome   = allRows.reduce((s, r) => s + r.totalIncome, 0);
  const grandMargin   = allRows.reduce((s, r) => s + r.margin,      0);

  const jobsCount = allRows.length;

  const dateTypeLabel = dateFilterType === "created" ? "Created Date"
    : dateFilterType === "received" ? "Received Date"
    : "Delivery Date";

  const hasRows = allRows.length > 0;

  /* ================= EXCEL DOWNLOAD ================= */
  const handleExcelDownload = () => {
    const f2 = (n) => Number(n || 0).toFixed(2);

    const excelRows = allRows.map((row) => ({
      "Job No": row.jobSheetNo,
      [dateTypeLabel]: getFilterDate(row) ? fmtDMY(getFilterDate(row)) : "-",
      "Status": row.status,
      "Name": row.name,
      "Contact": row.contact,
      "Service Rep": row.serviceRep,
      "Advance ₹":    row.advance > 0 ? f2(row.advance) : "-",
      "Balance ₹":    row.balance > 0 ? f2(row.balance) : "-",
      "Raw Spare ₹":  row.rawSpare > 0 ? f2(row.rawSpare) : "-",
      "Spare Used ₹": row.spare > 0 ? f2(row.spare) : "-",
      "Others ₹":     row.others > 0 ? f2(row.others) : "-",
      "Total (Income) ₹": f2(row.totalIncome),
      "Margin (Service Charge) ₹": f2(row.margin),
    }));

    excelRows.push({
      "Job No": "", [dateTypeLabel]: "", "Status": "", "Name": "", "Contact": "GRAND TOTAL", "Service Rep": "",
      "Advance ₹":    f2(grandAdvance),
      "Balance ₹":    f2(grandBalance),
      "Raw Spare ₹":  f2(grandRawSpare),
      "Spare Used ₹": f2(grandSpare),
      "Others ₹":     f2(grandOthers),
      "Total (Income) ₹": f2(grandIncome),
      "Margin (Service Charge) ₹": f2(grandMargin),
    });

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Value Report");
    XLSX.writeFile(wb, `ValueReport_${statusFilter}_${fromDate || "All"}_to_${toDate || "All"}.xlsx`);
  };

  const handlePrint = () => window.print();

  return (
    <div className="val-page">
      <div className="val-container">

        {/* ============ HEADER ============ */}
        <div className="val-header">
          <div className="val-header-left">
            <div className="val-logo"><BarChart3 size={28} /></div>
            <div>
              <h1 className="val-title">Value Report</h1>
              <div className="val-subtitle">Job No · Status · {dateTypeLabel} · Advance · Balance · Raw Spare · Spare Used · Others · Total Income · Margin</div>
            </div>
          </div>

          <div className="val-header-actions val-noprint">
            <button className="val-btn val-btn-ghost" onClick={handlePrint}>
              <Printer size={16} /> Print
            </button>
            <button className="val-btn val-btn-green" onClick={handleExcelDownload} disabled={!hasRows}>
              <FileSpreadsheet size={16} /> Excel Download
            </button>
          </div>
        </div>

        {/* ============ FILTER BAR ============ */}
        <div className="val-card val-noprint" style={{ padding: 20, marginBottom: 20 }}>
          <div className="val-card-title">
            <Filter size={16} color="#2563eb" /> Filters
          </div>

          <div className="val-filter-row">
            <Field label="Search" icon={Search} className="val-f-search">
              <div className="val-input-wrap">
                <Search size={16} className="val-input-icon" />
                <input
                  type="text"
                  className="val-input has-icon"
                  placeholder="Job No / Name / Contact / Rep"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </Field>

            {/* ✅ NEW — Status filter */}
            <Field label="Status" icon={Tag} className="val-f-rep">
              <div className="val-input-wrap">
                <Tag size={16} className="val-input-icon" />
                <select
                  className="val-input has-icon"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="Delivered">Delivered (Default)</option>
                  <option value="Delivered NR/NA">Delivered NR/NA</option>
                  <option value="All">All Status</option>
                </select>
              </div>
            </Field>

            <Field label="Service Rep" icon={User} className="val-f-rep">
              <div className="val-input-wrap">
                <User size={16} className="val-input-icon" />
                <select
                  className="val-input has-icon"
                  value={repFilter}
                  onChange={(e) => setRepFilter(e.target.value)}
                >
                  <option value="">All Reps</option>
                  {repOptions.map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
            </Field>

            <Field label="Date Type" icon={CalendarDays} className="val-f-type">
              <select
                className="val-input"
                value={dateFilterType}
                onChange={(e) => setDateFilterType(e.target.value)}
              >
                <option value="delivery">Delivery Date (Default)</option>
                <option value="received">Received Date</option>
                <option value="created">Created Date</option>
              </select>
            </Field>

            <Field label="From" icon={CalendarDays} className="val-f-date">
              <input type="date" className="val-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </Field>

            <Field label="To" icon={CalendarDays} className="val-f-date">
              <input type="date" className="val-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </Field>

            <div className="val-f-actions">
              <button className="val-btn val-btn-primary" onClick={fetchReport} disabled={loading}>
                {loading ? <Loader2 size={16} className="val-spin" /> : <Search size={16} />}
                {loading ? "Loading" : "Load Report"}
              </button>
              <button className="val-btn val-btn-ghost" onClick={handleClearFilter} title="Clear Filter">
                <RotateCcw size={16} /> Clear
              </button>
            </div>
          </div>
        </div>

        {/* ============ STAT CARDS ============ */}
        <div className="val-stats">
          <StatCard icon={FileText}    label="Total Jobs"              value={jobsCount}            tone={TONES.blue} />
          <StatCard icon={HandCoins}   label="Advance"                 value={money(grandAdvance)}  tone={TONES.green} />
          <StatCard icon={Scale}       label="Balance"                 value={money(grandBalance)}  tone={TONES.red} />
          <StatCard icon={Package}     label="Raw Spare"               value={money(grandRawSpare)} tone={TONES.orange} />
          <StatCard icon={Cog}         label="Spare Used"              value={money(grandSpare)}    tone={TONES.violet} />
          <StatCard icon={Package}     label="Others"                  value={money(grandOthers)}   tone={TONES.cyan} />
          <StatCard icon={IndianRupee} label="Total (Income)"          value={money(grandIncome)}   tone={TONES.amber} />
          <StatCard icon={Wrench}      label="Margin (Service Charge)" value={money(grandMargin)}   tone={TONES.rose} />
        </div>

        {/* ============ RESULT CARD ============ */}
        <div className="val-card" style={{ overflow: "hidden" }}>
          <div className="val-result-head">
            <div className="val-result-title">
              <FileText size={18} color="#64748b" />
              {jobsCount} job{jobsCount !== 1 ? "s" : ""}
            </div>
            <div className="val-chips">
              <span className="val-chip" style={{ background: "#f1f5f9", color: "#475569" }}>
                <Tag size={12} /> Status: {statusFilter === "All" ? "All Status" : statusFilter}
              </span>
              <span className="val-chip" style={{ background: "#f1f5f9", color: "#475569" }}>
                <CalendarDays size={12} />
                {dateTypeLabel}:&nbsp;
                {fromDate || toDate ? `${fmtDMY(fromDate) === "-" ? "All" : fmtDMY(fromDate)} → ${fmtDMY(toDate) === "-" ? "All" : fmtDMY(toDate)}` : "All Dates"}
              </span>
              {repFilter && (
                <span className="val-chip" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                  <User size={12} /> {repFilter}
                </span>
              )}
              {searchText.trim() && (
                <span className="val-chip" style={{ background: "#f5f3ff", color: "#6d28d9" }}>
                  <Search size={12} /> "{searchText.trim()}"
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="val-empty">
              <Loader2 size={32} className="val-spin" />
              <div className="val-empty-sub">Loading report...</div>
            </div>
          ) : !hasRows ? (
            <div className="val-empty">
              <div className="val-empty-icon"><Inbox size={30} /></div>
              <div className="val-empty-title">No records found</div>
              <div className="val-empty-sub">Status / Date range / Service Rep maathi try pannunga</div>
            </div>
          ) : (
            <div className="val-table-wrap">
              <table className="val-table">
                <thead>
                  <tr>
                    <Th icon={Hash}>Job No</Th>
                    <Th icon={CalendarDays}>{dateTypeLabel}</Th>
                    <Th icon={Tag}>Status</Th>
                    <Th icon={User}>Name</Th>
                    <Th icon={Phone}>Contact</Th>
                    <Th icon={Users}>Service Rep</Th>
                    <Th className="r">Advance ₹</Th>
                    <Th className="r">Balance ₹</Th>
                    <Th className="r">Raw Spare ₹</Th>
                    <Th className="r">Spare Used ₹</Th>
                    <Th className="r">Others ₹</Th>
                    <Th className="r">Total (Income) ₹</Th>
                    <Th className="r">Margin (Service) ₹</Th>
                  </tr>
                </thead>

                <tbody>
                  {allRows.map((row) => {
                    const rc = repColor(row.serviceRep);
                    const rowDate = getFilterDate(row);
                    const ss = getStatusStyle(row.status);
                    return (
                      <tr key={row._id} className="val-row">
                        <td><span className="val-jobpill">{row.jobSheetNo}</span></td>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>
                          {rowDate ? fmtDMY(rowDate) : <span className="val-dash">-</span>}
                        </td>
                        <td>
                          <span className="val-status-pill" style={{ background: ss.background, color: ss.color }}>
                            {row.status}
                          </span>
                        </td>
                        <td className="val-cust">{row.name || "-"}</td>
                        <td>
                          {row.contact ? (
                            <div className="val-contact"><Phone size={11} /> {row.contact}</div>
                          ) : <span className="val-dash">-</span>}
                        </td>
                        <td>
                          {row.serviceRep ? (
                            <span className="val-rep">
                              <span className="val-avatar" style={{ background: rc.bg, color: rc.fg }}>
                                {row.serviceRep.charAt(0).toUpperCase()}
                              </span>
                              {row.serviceRep}
                            </span>
                          ) : <span className="val-dash">-</span>}
                        </td>

                        <td className="r val-green">{row.advance > 0 ? money(row.advance) : <span className="val-dash">-</span>}</td>

                        <td className="r" style={{ color: row.balance > 0 ? "#dc2626" : "#1e293b", fontWeight: 700 }}>
                          {row.balance > 0 ? money(row.balance) : <span className="val-dash">-</span>}
                        </td>

                        <td className="r" style={{ color: "#b45309" }}>{row.rawSpare > 0 ? money(row.rawSpare) : <span className="val-dash">-</span>}</td>

                        <td className="r">{row.spare > 0 ? money(row.spare) : <span className="val-dash">-</span>}</td>

                        <td className="r">{row.others > 0 ? money(row.others) : <span className="val-dash">-</span>}</td>

                        <td className="r" style={{ fontWeight: 700, color: "#0369a1" }}>{money(row.totalIncome)}</td>
                        <td className="r" style={{ fontWeight: 700, color: "#1e293b" }}>{money(row.margin)}</td>
                      </tr>
                    );
                  })}

                  {/* GRAND TOTAL */}
                  <tr className="val-grand-row">
                    <td colSpan={6} className="r">Grand Total</td>
                    <td className="r" style={{ color: "#86efac" }}>{money(grandAdvance)}</td>
                    <td className="r" style={{ color: "#fca5a5" }}>{money(grandBalance)}</td>
                    <td className="r" style={{ color: "#fed7aa" }}>{money(grandRawSpare)}</td>
                    <td className="r" style={{ color: "#c4b5fd" }}>{money(grandSpare)}</td>
                    <td className="r" style={{ color: "#a5f3fc" }}>{money(grandOthers)}</td>
                    <td className="r" style={{ color: "#fde68a" }}>{money(grandIncome)}</td>
                    <td className="r" style={{ color: "#fff" }}>{money(grandMargin)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ============ SCOPED STYLES ============ */}
      <style>{`
        .val-page, .val-page * { box-sizing: border-box; }
        .val-page { min-height: 100vh; background: #f1f5f9; padding: 24px 32px; color: #1e293b; }
        .val-container { max-width: 1650px; margin: 0 auto; }

        .val-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
        .val-header-left { display: flex; align-items: center; gap: 16px; }
        .val-header-actions { display: flex; align-items: center; gap: 8px; }
        .val-logo { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #fff;
          background: linear-gradient(135deg, #6366f1, #7c3aed); box-shadow: 0 8px 18px rgba(99,102,241,.3); flex-shrink: 0; }
        .val-title { margin: 0; font-size: 28px; font-weight: 800; line-height: 1.2; letter-spacing: -0.3px; color: #1e293b; }
        .val-subtitle { margin-top: 2px; font-size: 13px; color: #64748b; }

        .val-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .val-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 16px; }

        .val-filter-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; }
        .val-f-search { flex: 2 1 250px; }
        .val-f-rep { flex: 1 1 170px; }
        .val-f-type { flex: 1.3 1 220px; }
     .val-f-date { flex: 0 1 200px; }
        .val-f-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
        .val-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .val-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #64748b; line-height: 1; }
        .val-label svg { flex-shrink: 0; }

        .val-input-wrap { position: relative; }
        .val-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
        .val-input { display: block; width: 100%; height: 40px; padding: 0 12px; font-size: 14px; color: #1e293b; background: #fff;
          border: 1px solid #cbd5e1; border-radius: 10px; outline: none; transition: border-color .15s, box-shadow .15s; font-family: inherit; }
        .val-input.has-icon { padding-left: 38px; }
        .val-input::placeholder { color: #94a3b8; }
        .val-input:focus { border-color: #2563eb; box-shadow: 0 0 0 4px #dbeafe; }

        .val-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 18px; font-size: 14px; font-weight: 600;
          border: 1px solid transparent; border-radius: 10px; cursor: pointer; white-space: nowrap; transition: background .15s; font-family: inherit; line-height: 1; }
        .val-btn:disabled { opacity: .55; cursor: not-allowed; }
        .val-btn-primary { background: #2563eb; color: #fff; box-shadow: 0 1px 2px rgba(37,99,235,.35); }
        .val-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .val-btn-green { background: #059669; color: #fff; }
        .val-btn-green:hover:not(:disabled) { background: #047857; }
        .val-btn-ghost { background: #fff; color: #334155; border-color: #cbd5e1; }
        .val-btn-ghost:hover:not(:disabled) { background: #f8fafc; }

        .val-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .val-stat { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .val-stat-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .val-stat-label { font-size: 11.5px; font-weight: 600; color: #64748b; }
        .val-stat-value { font-size: 18px; font-weight: 800; color: #1e293b; line-height: 1.2; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .val-result-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; }
        .val-result-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #1e293b; }
        .val-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .val-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }

        .val-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 80px 20px; color: #94a3b8; }
        .val-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
        .val-empty-title { font-size: 16px; font-weight: 600; color: #64748b; }
        .val-empty-sub { font-size: 14px; }
        .val-spin { animation: valSpin 1s linear infinite; }
        @keyframes valSpin { to { transform: rotate(360deg); } }

        .val-table-wrap { overflow: auto; max-height: 640px; }
        .val-table { width: 100%; min-width: 1300px; border-collapse: collapse; font-size: 13px; }
        .val-table th { position: sticky; top: 0; z-index: 2; background: #1e293b; color: #f1f5f9; font-size: 11.5px; font-weight: 600; letter-spacing: .05em;
          text-transform: uppercase; text-align: left; padding: 12px 12px; white-space: nowrap; }
        .val-table th.r, .val-table td.r { text-align: right; }
        .val-th { display: inline-flex; align-items: center; gap: 6px; }
        .val-table td { padding: 10px 12px; vertical-align: middle; white-space: nowrap; }

        .val-row td { border-bottom: 1px solid #f1f5f9; }
        .val-row:hover td { background: #f8fafc; }

        .val-jobpill { display: inline-block; padding: 3px 8px; border-radius: 6px; background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 700; }
        .val-status-pill { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .val-cust { font-weight: 600; color: #1e293b; }
        .val-contact { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #64748b; }
        .val-rep { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; color: #334155; }
        .val-avatar { width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .val-dash { color: #94a3b8; }
        .val-green { color: #15803d; }
        .val-table td.r { font-variant-numeric: tabular-nums; }

        .val-grand-row td { background: #1e293b; color: #fff; padding: 14px 12px; font-size: 14px; font-weight: 800; border-top: 2px solid #334155; }
        .val-grand-row td:first-child { font-size: 13px; letter-spacing: .06em; text-transform: uppercase; }

        @media (max-width: 640px) {
          .val-page { padding: 16px; }
          .val-title { font-size: 22px; }
        }

        @media print {
          .val-noprint { display: none !important; }
          .val-page { background: #fff; padding: 0; }
          .val-card, .val-stat { box-shadow: none !important; }
          .val-table-wrap { overflow: visible; max-height: none; }
          .val-table { min-width: 0; font-size: 10px; }
          .val-table th { position: static; }
          .val-row { break-inside: avoid; }
          .val-table th, .val-grand-row td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default ValueReport;