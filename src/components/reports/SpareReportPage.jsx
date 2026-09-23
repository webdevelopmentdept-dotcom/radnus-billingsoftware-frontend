import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Wrench, Search, User, Users, CalendarDays, RotateCcw, Printer,
  FileSpreadsheet, FileText, Package, Boxes, IndianRupee, Loader2, Inbox,
  Phone, Filter, Hash, Tag, Activity,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

/* ================= HELPERS ================= */
const toYMD = (val) => (val ? new Date(val).toLocaleDateString("en-CA") : "");
const todayStr = () => new Date().toLocaleDateString("en-CA");
const fmtDMY = (ymd) => (ymd ? ymd.split("-").reverse().join("-") : "—");
const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const emptyFilters = () => ({ q: "", rep: "", status: "", from: todayStr(), to: todayStr() });

/* Fixed status list — app-oda Device Status dropdown-ku match aagurathu */
const STATUS_LIST = ["Received", "Pending", "Repaired", "Delivered", "Delivered NR/NA", "Cancelled"];

/* device.mobileStatus field-la irundhu current status eduthukka */
const getCurrentStatus = (job) => job.device?.mobileStatus || "";

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

/* Status name-ku fixed color */
const STATUS_COLORS = {
  Received: { bg: "#e0f2fe", fg: "#0369a1" },
  Pending: { bg: "#fef9c3", fg: "#a16207" },
  Repaired: { bg: "#dcfce7", fg: "#15803d" },
  Delivered: { bg: "#d1fae5", fg: "#047857" },
  "Delivered NR/NA": { bg: "#e2e8f0", fg: "#475569" },
  Cancelled: { bg: "#fecaca", fg: "#991b1b" },
};
const statusColor = (name = "") => STATUS_COLORS[name] || { bg: "#f1f5f9", fg: "#475569" };

const TONES = {
  blue: { bg: "#dbeafe", fg: "#2563eb" },
  violet: { bg: "#ede9fe", fg: "#7c3aed" },
  amber: { bg: "#fef3c7", fg: "#d97706" },
  orange: { bg: "#ffedd5", fg: "#ea580c" },
};

/* ================= SMALL UI PARTS ================= */
const Field = ({ label, icon: Icon, className = "", children }) => (
  <div className={`spr-field ${className}`}>
    <div className="spr-label">
      {Icon && <Icon size={12} />}
      <span>{label}</span>
    </div>
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="spr-stat">
    <div className="spr-stat-icon" style={{ background: tone.bg, color: tone.fg }}>
      <Icon size={20} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div className="spr-stat-label">{label}</div>
      <div className="spr-stat-value">{value}</div>
    </div>
  </div>
);

/* ================= PAGE ================= */
const SpareReportPage = () => {
  const [rawData, setRawData] = useState([]);
  const [filters, setFilters] = useState(emptyFilters());
  const [applied, setApplied] = useState(emptyFilters());
  const [loading, setLoading] = useState(false);

  const loadReport = async (f = filters) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/jobsheets/filter`, { params: {} });
      setRawData(res.data || []);
      setApplied(f);
    } catch (err) {
      console.error(err);
      alert("Report load failed ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, []);

  const handleClear = () => {
    const reset = emptyFilters();
    setFilters(reset);
    loadReport(reset);
  };

  const repOptions = useMemo(() => {
    const set = new Set();
    rawData.forEach((j) => { if (j.service?.serviceRep) set.add(j.service.serviceRep); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rawData]);

  const statusOptions = STATUS_LIST;

  /* ===== Filter + group by date ===== */
  const { groupedData, grandTotal, jobCount, entryCount, totalQty } = useMemo(() => {
    const grouped = {};
    const jobSet = new Set();
    let gTotal = 0;
    let entries = 0;
    let qtySum = 0;
    const q = applied.q.trim().toLowerCase();

    rawData.forEach((item) => {
      const jobSheetNo = item.jobSheetNo || "";
      const name = item.customer?.name || "";
      const contact = item.customer?.contact || "";
      const serviceRep = item.service?.serviceRep || "";
      const status = getCurrentStatus(item);
      const repairDate = toYMD(item.service?.repairDate);

      // search: Job Sheet No / Name / Contact / Service Rep
      if (q) {
        const hay = `${jobSheetNo} ${name} ${contact} ${serviceRep}`.toLowerCase();
        if (!hay.includes(q)) return;
      }
      // service rep dropdown filter
      if (applied.rep && serviceRep !== applied.rep) return;
      // status dropdown filter
      if (applied.status && status !== applied.status) return;

      (item.spareItems || []).forEach((si) => {
        const amt = Number(si.amount || 0);
        if (amt <= 0) return;
        const d = si.date ? toYMD(si.date) : repairDate;
        if (applied.from && d < applied.from) return;
        if (applied.to && d > applied.to) return;

        if (!grouped[d]) grouped[d] = [];
        grouped[d].push({
          jobSheetNo, name, contact, serviceRep, status,
          spare: si.name, qty: si.qty, rate: si.rate, amount: amt,
        });
        gTotal += amt;
        entries += 1;
        qtySum += Number(si.qty || 0);
        jobSet.add(jobSheetNo);
      });
    });

    const sorted = {};
    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach((k) => (sorted[k] = grouped[k]));

    return { groupedData: sorted, grandTotal: gTotal, jobCount: jobSet.size, entryCount: entries, totalQty: qtySum };
  }, [rawData, applied]);

  const hasRows = Object.keys(groupedData).length > 0;

  const handlePrint = () => window.print();

  const handleExcel = () => {
    const rows = [];
    Object.entries(groupedData).forEach(([date, records]) => {
      records.forEach((item, i) => {
        rows.push({
          "Date": date,
          "SL No": i + 1,
          "Job Sheet": item.jobSheetNo,
          "Customer": item.name,
          "Contact": item.contact,
          "Service Rep": item.serviceRep,
          "Status": item.status,
          "Spare": item.spare,
          "Qty": item.qty,
          "Rate": item.rate,
          "Amount": item.amount,
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Spare Report");
    XLSX.writeFile(wb, `Spare_Report_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.xlsx`);
  };

  return (
    <div className="spr-page">
      <div className="spr-container">

        {/* ============ HEADER ============ */}
        <div className="spr-header">
          <div className="spr-header-left">
            <div className="spr-logo"><Wrench size={28} /></div>
            <div>
              <h1 className="spr-title">Spare Value Report</h1>
              <div className="spr-subtitle">Date-wise spare usage — each entry shown on its own date</div>
            </div>
          </div>

          <div className="spr-header-actions spr-noprint">
            <button className="spr-btn spr-btn-ghost" onClick={handlePrint}>
              <Printer size={16} /> Print
            </button>
            <button className="spr-btn spr-btn-green" onClick={handleExcel} disabled={!hasRows}>
              <FileSpreadsheet size={16} /> Excel Download
            </button>
          </div>
        </div>

        {/* ============ FILTER BAR ============ */}
        <div className="spr-card spr-noprint" style={{ padding: 20, marginBottom: 20 }}>
          <div className="spr-card-title">
            <Filter size={16} color="#2563eb" /> Filters
          </div>

          <div className="spr-filter-row">
            <Field label="Search" icon={Search} className="spr-f-search">
              <div className="spr-input-wrap">
                <Search size={16} className="spr-input-icon" />
                <input
                  type="text"
                  className="spr-input has-icon"
                  placeholder="Job No / Name / Contact / Rep"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") loadReport(filters); }}
                />
              </div>
            </Field>

            <Field label="Service Rep" icon={User} className="spr-f-rep">
              <div className="spr-input-wrap">
                <User size={16} className="spr-input-icon" />
                <select
                  className="spr-input has-icon"
                  value={filters.rep}
                  onChange={(e) => setFilters({ ...filters, rep: e.target.value })}
                >
                  <option value="">All Reps</option>
                  {repOptions.map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
            </Field>

            <Field label="Status" icon={Activity} className="spr-f-rep">
              <div className="spr-input-wrap">
                <Activity size={16} className="spr-input-icon" />
                <select
                  className="spr-input has-icon"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All Status</option>
                  {statusOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </Field>

            <Field label="From" icon={CalendarDays} className="spr-f-date">
              <input
                type="date"
                className="spr-input"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </Field>

            <Field label="To" icon={CalendarDays} className="spr-f-date">
              <input
                type="date"
                className="spr-input"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </Field>

            <div className="spr-f-actions">
              <button className="spr-btn spr-btn-primary" onClick={() => loadReport(filters)} disabled={loading}>
                {loading ? <Loader2 size={16} className="spr-spin" /> : <Search size={16} />}
                {loading ? "Loading" : "Load"}
              </button>
              <button className="spr-btn spr-btn-ghost" onClick={handleClear} title="Clear Filter">
                <RotateCcw size={16} /> Clear
              </button>
            </div>
          </div>
        </div>

        {/* ============ STAT CARDS ============ */}
        <div className="spr-stats">
          <StatCard icon={FileText} label="Total Jobs" value={jobCount} tone={TONES.blue} />
          <StatCard icon={Package} label="Spare Entries" value={entryCount} tone={TONES.violet} />
          <StatCard icon={Boxes} label="Total Qty" value={totalQty} tone={TONES.amber} />
          <StatCard icon={IndianRupee} label="Total Spare Value" value={money(grandTotal)} tone={TONES.orange} />
        </div>

        {/* ============ RESULT CARD ============ */}
        <div className="spr-card" style={{ overflow: "hidden" }}>
          <div className="spr-result-head">
            <div className="spr-result-title">
              <FileText size={18} color="#64748b" />
              {jobCount} jobs <span style={{ color: "#cbd5e1" }}>|</span> {entryCount} spare entries
            </div>
            <div className="spr-chips">
              <span className="spr-chip" style={{ background: "#f1f5f9", color: "#475569" }}>
                <CalendarDays size={12} /> {fmtDMY(applied.from)} → {fmtDMY(applied.to)}
              </span>
              {applied.rep && (
                <span className="spr-chip" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                  <User size={12} /> {applied.rep}
                </span>
              )}
              {applied.status && (
                <span className="spr-chip" style={{ background: statusColor(applied.status).bg, color: statusColor(applied.status).fg }}>
                  <Activity size={12} /> {applied.status}
                </span>
              )}
              {applied.q && (
                <span className="spr-chip" style={{ background: "#f5f3ff", color: "#6d28d9" }}>
                  <Search size={12} /> "{applied.q}"
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="spr-empty">
              <Loader2 size={32} className="spr-spin" />
              <div className="spr-empty-sub">Loading report...</div>
            </div>
          ) : !hasRows ? (
            <div className="spr-empty">
              <div className="spr-empty-icon"><Inbox size={30} /></div>
              <div className="spr-empty-title">No records found</div>
              <div className="spr-empty-sub">Date range / Service Rep / Status maathi try pannunga</div>
            </div>
          ) : (
            <div className="spr-table-wrap">
              <table className="spr-table">
                <thead>
                  <tr>
                    <th className="c" style={{ width: 64 }}>SL</th>
                    <th><span className="spr-th"><Hash size={13} /> Job Sheet</span></th>
                    <th><span className="spr-th"><User size={13} /> Customer</span></th>
                    <th><span className="spr-th"><Users size={13} /> Service Rep</span></th>
                    <th><span className="spr-th"><Activity size={13} /> Status</span></th>
                    <th><span className="spr-th"><Wrench size={13} /> Spare</span></th>
                    <th className="c"><span className="spr-th"><Boxes size={13} /> Qty</span></th>
                    <th className="r"><span className="spr-th"><Tag size={13} /> Rate</span></th>
                    <th className="r"><span className="spr-th"><IndianRupee size={13} /> Amount</span></th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(groupedData).map(([date, records]) => {
                    const subTotal = records.reduce((sum, r) => sum + Number(r.amount), 0);
                    return (
                      <React.Fragment key={date}>
                        <tr className="spr-date-row">
                          <td colSpan="9">
                            <div className="spr-date-cell">
                              <CalendarDays size={16} />
                              {fmtDMY(date)}
                              <span className="spr-count">
                                {records.length} {records.length > 1 ? "entries" : "entry"}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {records.map((item, i) => {
                          const rc = repColor(item.serviceRep);
                          const sc = statusColor(item.status);
                          return (
                            <tr key={i} className="spr-row">
                              <td className="c" style={{ color: "#94a3b8" }}>{i + 1}</td>
                              <td><span className="spr-jobpill">{item.jobSheetNo}</span></td>
                              <td>
                                <div className="spr-cust">{item.name || "-"}</div>
                                {item.contact && (
                                  <div className="spr-contact"><Phone size={11} /> {item.contact}</div>
                                )}
                              </td>
                              <td>
                                {item.serviceRep ? (
                                  <span className="spr-rep">
                                    <span className="spr-avatar" style={{ background: rc.bg, color: rc.fg }}>
                                      {item.serviceRep.charAt(0).toUpperCase()}
                                    </span>
                                    {item.serviceRep}
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>-</span>
                                )}
                              </td>
                              <td>
                                {item.status ? (
                                  <span className="spr-status" style={{ background: sc.bg, color: sc.fg }}>
                                    {item.status}
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>-</span>
                                )}
                              </td>
                              <td style={{ color: "#334155", fontWeight: 500 }}>{item.spare || "-"}</td>
                              <td className="c"><span className="spr-qty">{item.qty ?? "-"}</span></td>
                              <td className="r" style={{ color: "#475569" }}>{money(item.rate)}</td>
                              <td className="r spr-amt">{money(item.amount)}</td>
                            </tr>
                          );
                        })}

                        <tr className="spr-sub-row">
                          <td colSpan="8" className="r">Sub Total</td>
                          <td className="r spr-amt">{money(subTotal)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="spr-grand-row">
                    <td colSpan="8" className="r">Grand Total</td>
                    <td className="r">{money(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ============ SCOPED STYLES (Bootstrap-oda clash aagaadhu) ============ */}
      <style>{`
        .spr-page, .spr-page * { box-sizing: border-box; }
        .spr-page { min-height: 100vh; background: #f1f5f9; padding: 24px 32px; color: #1e293b; }
        .spr-container { max-width: 1400px; margin: 0 auto; }

        /* header */
        .spr-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
        .spr-header-left { display: flex; align-items: center; gap: 16px; }
        .spr-header-actions { display: flex; align-items: center; gap: 8px; }
        .spr-logo { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #fff;
          background: linear-gradient(135deg, #f97316, #dc2626); box-shadow: 0 8px 18px rgba(249,115,22,.28); flex-shrink: 0; }
        .spr-title { margin: 0; font-size: 28px; font-weight: 800; line-height: 1.2; letter-spacing: -0.3px; color: #1e293b; }
        .spr-subtitle { margin-top: 2px; font-size: 14px; color: #64748b; }

        /* card */
        .spr-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .spr-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 16px; }

        /* filter row */
        .spr-filter-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; }
        .spr-f-search { flex: 2 1 260px; }
        .spr-f-rep { flex: 1 1 170px; }
        .spr-f-date { flex: 1 1 150px; }
        .spr-f-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
        .spr-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .spr-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #64748b; line-height: 1; }
        .spr-label svg { flex-shrink: 0; }

        /* inputs */
        .spr-input-wrap { position: relative; }
        .spr-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
        .spr-input { display: block; width: 100%; height: 40px; padding: 0 12px; font-size: 14px; color: #1e293b; background: #fff;
          border: 1px solid #cbd5e1; border-radius: 10px; outline: none; transition: border-color .15s, box-shadow .15s; font-family: inherit; }
        .spr-input.has-icon { padding-left: 38px; }
        .spr-input::placeholder { color: #94a3b8; }
        .spr-input:focus { border-color: #2563eb; box-shadow: 0 0 0 4px #dbeafe; }

        /* buttons */
        .spr-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 18px; font-size: 14px; font-weight: 600;
          border: 1px solid transparent; border-radius: 10px; cursor: pointer; white-space: nowrap; transition: background .15s, box-shadow .15s; font-family: inherit; line-height: 1; }
        .spr-btn:disabled { opacity: .55; cursor: not-allowed; }
        .spr-btn-primary { background: #2563eb; color: #fff; box-shadow: 0 1px 2px rgba(37,99,235,.35); }
        .spr-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .spr-btn-green { background: #059669; color: #fff; }
        .spr-btn-green:hover:not(:disabled) { background: #047857; }
        .spr-btn-ghost { background: #fff; color: #334155; border-color: #cbd5e1; }
        .spr-btn-ghost:hover:not(:disabled) { background: #f8fafc; }

        /* stat cards */
        .spr-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .spr-stat { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .spr-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .spr-stat-label { font-size: 12px; font-weight: 600; color: #64748b; }
        .spr-stat-value { font-size: 22px; font-weight: 800; color: #1e293b; line-height: 1.2; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* result head */
        .spr-result-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; }
        .spr-result-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #1e293b; }
        .spr-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .spr-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }

        /* empty */
        .spr-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 80px 20px; color: #94a3b8; }
        .spr-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
        .spr-empty-title { font-size: 16px; font-weight: 600; color: #64748b; }
        .spr-empty-sub { font-size: 14px; }
        .spr-spin { animation: sprSpin 1s linear infinite; }
        @keyframes sprSpin { to { transform: rotate(360deg); } }

        /* table */
        .spr-table-wrap { overflow-x: auto; }
        .spr-table { width: 100%; min-width: 1080px; border-collapse: collapse; font-size: 14px; }
        .spr-table th { background: #1e293b; color: #f1f5f9; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; text-align: left; padding: 12px 16px; }
        .spr-table th.c, .spr-table td.c { text-align: center; }
        .spr-table th.r, .spr-table td.r { text-align: right; }
        .spr-th { display: inline-flex; align-items: center; gap: 6px; }
        .spr-table td { padding: 12px 16px; vertical-align: middle; }
        .spr-date-row td { background: #eff6ff; border-top: 1px solid #dbeafe; border-bottom: 1px solid #dbeafe; padding: 10px 16px; }
        .spr-date-cell { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #1e3a8a; }
        .spr-count { padding: 2px 8px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 600; }
        .spr-row td { border-bottom: 1px solid #f1f5f9; }
        .spr-row:hover td { background: #f8fafc; }
        .spr-jobpill { display: inline-block; padding: 3px 8px; border-radius: 6px; background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 700; }
        .spr-cust { font-weight: 600; color: #1e293b; }
        .spr-contact { display: flex; align-items: center; gap: 4px; margin-top: 2px; font-size: 12px; color: #64748b; }
        .spr-rep { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; color: #334155; }
        .spr-avatar { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .spr-status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .spr-qty { display: inline-block; min-width: 28px; padding: 2px 8px; border-radius: 6px; background: #fff7ed; color: #c2410c; font-size: 12px; font-weight: 700; text-align: center; }
        .spr-amt { font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }
        .spr-sub-row td { background: #f8fafc; padding: 10px 16px; font-weight: 700; color: #1e293b; }
        .spr-sub-row td:first-child { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #64748b; }
        .spr-grand-row td { background: #ea580c; color: #fff; padding: 16px; font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; }
        .spr-grand-row td:first-child { font-size: 14px; letter-spacing: .06em; text-transform: uppercase; }

        @media (max-width: 640px) {
          .spr-page { padding: 16px; }
          .spr-title { font-size: 22px; }
        }

        @media print {
          .spr-noprint { display: none !important; }
          .spr-page { background: #fff; padding: 0; }
          .spr-card, .spr-stat { box-shadow: none !important; }
          .spr-row, .spr-sub-row { break-inside: avoid; }
          .spr-table th, .spr-grand-row td, .spr-date-row td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default SpareReportPage;