import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Wrench, Search, User, Users, CalendarDays, RotateCcw, Printer,
  FileSpreadsheet, FileText, Receipt, IndianRupee, Loader2, Inbox,
  Phone, Filter, Hash,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

/* ================= HELPERS ================= */
const toYMD = (val) => (val ? new Date(val).toLocaleDateString("en-CA") : "");
const todayStr = () => new Date().toLocaleDateString("en-CA");
const fmtDMY = (ymd) => (ymd ? ymd.split("-").reverse().join("-") : "—");
const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const emptyFilters = () => ({ q: "", rep: "", from: todayStr(), to: todayStr() });

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
  blue: { bg: "#dbeafe", fg: "#2563eb" },
  violet: { bg: "#ede9fe", fg: "#7c3aed" },
  amber: { bg: "#fef3c7", fg: "#d97706" },
  sky: { bg: "#e0f2fe", fg: "#0284c7" },
};

/* ================= REBILL HISTORY DEDUP =================
   revenueEntries-la already track aagirundha cycle-ah rebillHistory-la thirumba
   serkaama, genuinely missing cycle-ah mattum add pannum. (ValueReport-la irukkura same logic) */
const getUncoveredRebillEntries = (item) => {
  const entries = item.service?.revenueEntries || [];
  const rebillHistoryArr = item.rebillHistory || [];
  if (rebillHistoryArr.length === 0) return [];

  const sorted = [...rebillHistoryArr].sort(
    (a, b) => new Date(a.rebilledAt || 0) - new Date(b.rebilledAt || 0)
  );

  const uncovered = [];
  let cycleStart = null;

  sorted.forEach((rb) => {
    const cycleEnd = rb.rebilledAt ? new Date(rb.rebilledAt) : null;

    const hasTrackedEntry = entries.some((e) => {
      if (!e.date) return false;
      const d = new Date(e.date);
      if (cycleStart && d < cycleStart) return false;
      if (cycleEnd && d > cycleEnd) return false;
      return Number(e.income || 0) > 0 || Number(e.service || 0) > 0;
    });

    if (!hasTrackedEntry) uncovered.push(rb);
    cycleStart = cycleEnd;
  });

  return uncovered;
};

/* ================= SMALL UI PARTS ================= */
const Field = ({ label, icon: Icon, className = "", children }) => (
  <div className={`srv-field ${className}`}>
    <div className="srv-label">
      {Icon && <Icon size={12} />}
      <span>{label}</span>
    </div>
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="srv-stat">
    <div className="srv-stat-icon" style={{ background: tone.bg, color: tone.fg }}>
      <Icon size={20} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div className="srv-stat-label">{label}</div>
      <div className="srv-stat-value">{value}</div>
    </div>
  </div>
);

/* ================= PAGE ================= */
const ServiceReportPage = () => {
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

  /* ===== Filter + group by date ===== */
  const { groupedData, grandTotal, jobCount, entryCount, repCount } = useMemo(() => {
    const grouped = {};
    const jobSet = new Set();
    const repSet = new Set();
    let gTotal = 0;
    let entryTotal = 0;
    const q = applied.q.trim().toLowerCase();

    rawData.forEach((item) => {
      const jobSheetNo = item.jobSheetNo || "";
      const name = item.customer?.name || "";
      const contact = item.customer?.contact || "";
      const serviceRep = item.service?.serviceRep || "";
      const repairDate = toYMD(item.service?.repairDate);
      const revenueEntries = item.service?.revenueEntries || [];

      // search: Job Sheet No / Name / Contact / Service Rep
      if (q) {
        const hay = `${jobSheetNo} ${name} ${contact} ${serviceRep}`.toLowerCase();
        if (!hay.includes(q)) return;
      }
      // service rep dropdown filter
      if (applied.rep && serviceRep !== applied.rep) return;

      const entries = [];
      if (revenueEntries.length > 0) {
        revenueEntries.forEach((e) => {
          const amt = Number(e.service || 0);
          if (amt > 0) entries.push({ date: e.date ? toYMD(e.date) : repairDate, amount: amt });
        });
      } else {
        const amt = Number(item.service?.serviceCharge || 0);
        if (amt > 0) entries.push({ date: repairDate, amount: amt });
      }

      // rebillHistory — revenueEntries-la illaadha cycle-ah mattum
      getUncoveredRebillEntries(item).forEach((rb) => {
        const amt = Number(rb.serviceCharge || 0);
        if (amt > 0) {
          const d = rb.incomeDate ? toYMD(rb.incomeDate) : rb.rebilledAt ? toYMD(rb.rebilledAt) : repairDate;
          entries.push({ date: d, amount: amt });
        }
      });

      entries.forEach((e) => {
        if (applied.from && e.date < applied.from) return;
        if (applied.to && e.date > applied.to) return;
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push({ jobSheetNo, name, contact, serviceRep, amount: e.amount });
        gTotal += e.amount;
        entryTotal += 1;
        jobSet.add(jobSheetNo);
        if (serviceRep) repSet.add(serviceRep);
      });
    });

    const sorted = {};
    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach((k) => (sorted[k] = grouped[k]));

    return { groupedData: sorted, grandTotal: gTotal, jobCount: jobSet.size, entryCount: entryTotal, repCount: repSet.size };
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
          "Amount": item.amount,
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Service Report");
    XLSX.writeFile(wb, `Service_Report_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.xlsx`);
  };

  return (
    <div className="srv-page">
      <div className="srv-container">

        {/* ============ HEADER ============ */}
        <div className="srv-header">
          <div className="srv-header-left">
            <div className="srv-logo"><Wrench size={28} /></div>
            <div>
              <h1 className="srv-title">Service Value Report (Margin)</h1>
              <div className="srv-subtitle">Date-wise service charges — each entry shown on its own date</div>
            </div>
          </div>

          <div className="srv-header-actions srv-noprint">
            <button className="srv-btn srv-btn-ghost" onClick={handlePrint}>
              <Printer size={16} /> Print
            </button>
            <button className="srv-btn srv-btn-green" onClick={handleExcel} disabled={!hasRows}>
              <FileSpreadsheet size={16} /> Excel Download
            </button>
          </div>
        </div>

        {/* ============ FILTER BAR ============ */}
        <div className="srv-card srv-noprint" style={{ padding: 20, marginBottom: 20 }}>
          <div className="srv-card-title">
            <Filter size={16} color="#2563eb" /> Filters
          </div>

          <div className="srv-filter-row">
            <Field label="Search" icon={Search} className="srv-f-search">
              <div className="srv-input-wrap">
                <Search size={16} className="srv-input-icon" />
                <input
                  type="text"
                  className="srv-input has-icon"
                  placeholder="Job No / Name / Contact / Rep"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") loadReport(filters); }}
                />
              </div>
            </Field>

            <Field label="Service Rep" icon={User} className="srv-f-rep">
              <div className="srv-input-wrap">
                <User size={16} className="srv-input-icon" />
                <select
                  className="srv-input has-icon"
                  value={filters.rep}
                  onChange={(e) => setFilters({ ...filters, rep: e.target.value })}
                >
                  <option value="">All Reps</option>
                  {repOptions.map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
            </Field>

            <Field label="From" icon={CalendarDays} className="srv-f-date">
              <input
                type="date"
                className="srv-input"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </Field>

            <Field label="To" icon={CalendarDays} className="srv-f-date">
              <input
                type="date"
                className="srv-input"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </Field>

            <div className="srv-f-actions">
              <button className="srv-btn srv-btn-primary" onClick={() => loadReport(filters)} disabled={loading}>
                {loading ? <Loader2 size={16} className="srv-spin" /> : <Search size={16} />}
                {loading ? "Loading" : "Load"}
              </button>
              <button className="srv-btn srv-btn-ghost" onClick={handleClear} title="Clear Filter">
                <RotateCcw size={16} /> Clear
              </button>
            </div>
          </div>
        </div>

        {/* ============ STAT CARDS ============ */}
        <div className="srv-stats">
          <StatCard icon={FileText} label="Total Jobs" value={jobCount} tone={TONES.blue} />
          <StatCard icon={Receipt} label="Service Entries" value={entryCount} tone={TONES.violet} />
          <StatCard icon={Users} label="Service Reps" value={repCount} tone={TONES.amber} />
          <StatCard icon={IndianRupee} label="Total Service Value" value={money(grandTotal)} tone={TONES.sky} />
        </div>

        {/* ============ RESULT CARD ============ */}
        <div className="srv-card" style={{ overflow: "hidden" }}>
          <div className="srv-result-head">
            <div className="srv-result-title">
              <FileText size={18} color="#64748b" />
              {jobCount} jobs <span style={{ color: "#cbd5e1" }}>|</span> {entryCount} service entries
            </div>
            <div className="srv-chips">
              <span className="srv-chip" style={{ background: "#f1f5f9", color: "#475569" }}>
                <CalendarDays size={12} /> {fmtDMY(applied.from)} → {fmtDMY(applied.to)}
              </span>
              {applied.rep && (
                <span className="srv-chip" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                  <User size={12} /> {applied.rep}
                </span>
              )}
              {applied.q && (
                <span className="srv-chip" style={{ background: "#f5f3ff", color: "#6d28d9" }}>
                  <Search size={12} /> "{applied.q}"
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="srv-empty">
              <Loader2 size={32} className="srv-spin" />
              <div className="srv-empty-sub">Loading report...</div>
            </div>
          ) : !hasRows ? (
            <div className="srv-empty">
              <div className="srv-empty-icon"><Inbox size={30} /></div>
              <div className="srv-empty-title">No records found</div>
              <div className="srv-empty-sub">Date range / Service Rep maathi try pannunga</div>
            </div>
          ) : (
            <div className="srv-table-wrap">
              <table className="srv-table">
                <thead>
                  <tr>
                    <th className="c" style={{ width: 64 }}>SL</th>
                    <th><span className="srv-th"><Hash size={13} /> Job Sheet</span></th>
                    <th><span className="srv-th"><User size={13} /> Customer</span></th>
                    <th><span className="srv-th"><Users size={13} /> Service Rep</span></th>
                    <th className="r"><span className="srv-th"><IndianRupee size={13} /> Amount</span></th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(groupedData).map(([date, records]) => {
                    const subTotal = records.reduce((sum, r) => sum + Number(r.amount), 0);
                    return (
                      <React.Fragment key={date}>
                        <tr className="srv-date-row">
                          <td colSpan="5">
                            <div className="srv-date-cell">
                              <CalendarDays size={16} />
                              {fmtDMY(date)}
                              <span className="srv-count">
                                {records.length} {records.length > 1 ? "entries" : "entry"}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {records.map((item, i) => {
                          const rc = repColor(item.serviceRep);
                          return (
                            <tr key={i} className="srv-row">
                              <td className="c" style={{ color: "#94a3b8" }}>{i + 1}</td>
                              <td><span className="srv-jobpill">{item.jobSheetNo}</span></td>
                              <td>
                                <div className="srv-cust">{item.name || "-"}</div>
                                {item.contact && (
                                  <div className="srv-contact"><Phone size={11} /> {item.contact}</div>
                                )}
                              </td>
                              <td>
                                {item.serviceRep ? (
                                  <span className="srv-rep">
                                    <span className="srv-avatar" style={{ background: rc.bg, color: rc.fg }}>
                                      {item.serviceRep.charAt(0).toUpperCase()}
                                    </span>
                                    {item.serviceRep}
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>-</span>
                                )}
                              </td>
                              <td className="r srv-amt">{money(item.amount)}</td>
                            </tr>
                          );
                        })}

                        <tr className="srv-sub-row">
                          <td colSpan="4" className="r">Sub Total</td>
                          <td className="r srv-amt">{money(subTotal)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="srv-grand-row">
                    <td colSpan="4" className="r">Grand Total</td>
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
        .srv-page, .srv-page * { box-sizing: border-box; }
        .srv-page { min-height: 100vh; background: #f1f5f9; padding: 24px 32px; color: #1e293b; }
        .srv-container { max-width: 1400px; margin: 0 auto; }

        /* header */
        .srv-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
        .srv-header-left { display: flex; align-items: center; gap: 16px; }
        .srv-header-actions { display: flex; align-items: center; gap: 8px; }
        .srv-logo { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #fff;
          background: linear-gradient(135deg, #0ea5e9, #2563eb); box-shadow: 0 8px 18px rgba(14,165,233,.3); flex-shrink: 0; }
        .srv-title { margin: 0; font-size: 28px; font-weight: 800; line-height: 1.2; letter-spacing: -0.3px; color: #1e293b; }
        .srv-subtitle { margin-top: 2px; font-size: 14px; color: #64748b; }

        /* card */
        .srv-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .srv-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 16px; }

        /* filter row */
        .srv-filter-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; }
        .srv-f-search { flex: 2 1 260px; }
        .srv-f-rep { flex: 1 1 190px; }
        .srv-f-date { flex: 1 1 150px; }
        .srv-f-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
        .srv-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .srv-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #64748b; line-height: 1; }
        .srv-label svg { flex-shrink: 0; }

        /* inputs */
        .srv-input-wrap { position: relative; }
        .srv-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
        .srv-input { display: block; width: 100%; height: 40px; padding: 0 12px; font-size: 14px; color: #1e293b; background: #fff;
          border: 1px solid #cbd5e1; border-radius: 10px; outline: none; transition: border-color .15s, box-shadow .15s; font-family: inherit; }
        .srv-input.has-icon { padding-left: 38px; }
        .srv-input::placeholder { color: #94a3b8; }
        .srv-input:focus { border-color: #2563eb; box-shadow: 0 0 0 4px #dbeafe; }

        /* buttons */
        .srv-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 18px; font-size: 14px; font-weight: 600;
          border: 1px solid transparent; border-radius: 10px; cursor: pointer; white-space: nowrap; transition: background .15s, box-shadow .15s; font-family: inherit; line-height: 1; }
        .srv-btn:disabled { opacity: .55; cursor: not-allowed; }
        .srv-btn-primary { background: #2563eb; color: #fff; box-shadow: 0 1px 2px rgba(37,99,235,.35); }
        .srv-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .srv-btn-green { background: #059669; color: #fff; }
        .srv-btn-green:hover:not(:disabled) { background: #047857; }
        .srv-btn-ghost { background: #fff; color: #334155; border-color: #cbd5e1; }
        .srv-btn-ghost:hover:not(:disabled) { background: #f8fafc; }

        /* stat cards */
        .srv-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .srv-stat { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .srv-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .srv-stat-label { font-size: 12px; font-weight: 600; color: #64748b; }
        .srv-stat-value { font-size: 22px; font-weight: 800; color: #1e293b; line-height: 1.2; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* result head */
        .srv-result-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; }
        .srv-result-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #1e293b; }
        .srv-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .srv-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }

        /* empty */
        .srv-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 80px 20px; color: #94a3b8; }
        .srv-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
        .srv-empty-title { font-size: 16px; font-weight: 600; color: #64748b; }
        .srv-empty-sub { font-size: 14px; }
        .srv-spin { animation: srvSpin 1s linear infinite; }
        @keyframes srvSpin { to { transform: rotate(360deg); } }

        /* table */
        .srv-table-wrap { overflow-x: auto; }
        .srv-table { width: 100%; min-width: 760px; border-collapse: collapse; font-size: 14px; }
        .srv-table th { background: #1e293b; color: #f1f5f9; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; text-align: left; padding: 12px 16px; }
        .srv-table th.c, .srv-table td.c { text-align: center; }
        .srv-table th.r, .srv-table td.r { text-align: right; }
        .srv-th { display: inline-flex; align-items: center; gap: 6px; }
        .srv-table td { padding: 12px 16px; vertical-align: middle; }
        .srv-date-row td { background: #eff6ff; border-top: 1px solid #dbeafe; border-bottom: 1px solid #dbeafe; padding: 10px 16px; }
        .srv-date-cell { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #1e3a8a; }
        .srv-count { padding: 2px 8px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 600; }
        .srv-row td { border-bottom: 1px solid #f1f5f9; }
        .srv-row:hover td { background: #f8fafc; }
        .srv-jobpill { display: inline-block; padding: 3px 8px; border-radius: 6px; background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 700; }
        .srv-cust { font-weight: 600; color: #1e293b; }
        .srv-contact { display: flex; align-items: center; gap: 4px; margin-top: 2px; font-size: 12px; color: #64748b; }
        .srv-rep { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; color: #334155; }
        .srv-avatar { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .srv-amt { font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }
        .srv-sub-row td { background: #f8fafc; padding: 10px 16px; font-weight: 700; color: #1e293b; }
        .srv-sub-row td:first-child { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #64748b; }
        .srv-grand-row td { background: #0369a1; color: #fff; padding: 16px; font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; }
        .srv-grand-row td:first-child { font-size: 14px; letter-spacing: .06em; text-transform: uppercase; }

        @media (max-width: 640px) {
          .srv-page { padding: 16px; }
          .srv-title { font-size: 22px; }
        }

        @media print {
          .srv-noprint { display: none !important; }
          .srv-page { background: #fff; padding: 0; }
          .srv-card, .srv-stat { box-shadow: none !important; }
          .srv-row, .srv-sub-row { break-inside: avoid; }
          .srv-table th, .srv-grand-row td, .srv-date-row td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default ServiceReportPage;