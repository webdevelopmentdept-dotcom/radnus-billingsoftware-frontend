import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Banknote, Search, User, Users, CalendarDays, RotateCcw, Printer,
  FileSpreadsheet, FileText, Receipt, IndianRupee, Loader2, Inbox,
  Phone, Filter, Hash, Wrench,
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
  teal: { bg: "#ccfbf1", fg: "#0d9488" },
};

/* ================= REBILL HISTORY DEDUP =================
   revenueEntries-la already track aagirundha cycle-ah rebillHistory-la thirumba
   serkaama, genuinely missing cycle-ah mattum add pannum. (Value/Service Report-la irukkura same logic) */
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
  <div className={`inc-field ${className}`}>
    <div className="inc-label">
      {Icon && <Icon size={12} />}
      <span>{label}</span>
    </div>
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="inc-stat">
    <div className="inc-stat-icon" style={{ background: tone.bg, color: tone.fg }}>
      <Icon size={20} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div className="inc-stat-label">{label}</div>
      <div className="inc-stat-value">{value}</div>
    </div>
  </div>
);

/* ================= PAGE ================= */
const IncomeReportPage = () => {
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
      const engineer = item.service?.engineer || "-";
      const repairDate = toYMD(item.service?.repairDate);
      const entries = item.service?.revenueEntries || [];

      // search: Job Sheet No / Name / Contact / Service Rep / Engineer
      if (q) {
        const hay = `${jobSheetNo} ${name} ${contact} ${serviceRep} ${engineer}`.toLowerCase();
        if (!hay.includes(q)) return;
      }
      // service rep dropdown filter
      if (applied.rep && serviceRep !== applied.rep) return;

      const pushRow = (date, amt) => {
        if (!amt || amt <= 0 || !date) return;
        const d = toYMD(date);
        if (applied.from && d < applied.from) return;
        if (applied.to && d > applied.to) return;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push({ jobSheetNo, name, contact, serviceRep, engineer, amount: amt });
        gTotal += amt;
        entryTotal += 1;
        jobSet.add(jobSheetNo);
        if (serviceRep) repSet.add(serviceRep);
      };

      if (entries.length > 0) {
        // in-cycle date-wise entries — ovvoru date-kum oru row
        entries.forEach((e) => pushRow(e.date, Number(e.income || 0)));
      } else if ((item.rebillHistory || []).length === 0) {
        // never rebilled + revenueEntries illa → old single-value behaviour
        pushRow(item.service?.incomeDate || repairDate, Number(item.service?.income || 0));
      }

      // rebillHistory — revenueEntries-la illaadha cycle-ah mattum, adhoda own incomeDate-la
      getUncoveredRebillEntries(item).forEach((rb) => {
        pushRow(rb.incomeDate || rb.rebilledAt || repairDate, Number(rb.income || 0));
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
          "Engineer": item.engineer,
          "Income Amount": item.amount,
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Income Report");
    XLSX.writeFile(wb, `Income_Report_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.xlsx`);
  };

  return (
    <div className="inc-page">
      <div className="inc-container">

        {/* ============ HEADER ============ */}
        <div className="inc-header">
          <div className="inc-header-left">
            <div className="inc-logo"><Banknote size={28} /></div>
            <div>
              <h1 className="inc-title">Income Report</h1>
              <div className="inc-subtitle">Date-wise income — grouped by the date income was recorded</div>
            </div>
          </div>

          <div className="inc-header-actions inc-noprint">
            <button className="inc-btn inc-btn-ghost" onClick={handlePrint}>
              <Printer size={16} /> Print
            </button>
            <button className="inc-btn inc-btn-green" onClick={handleExcel} disabled={!hasRows}>
              <FileSpreadsheet size={16} /> Excel Download
            </button>
          </div>
        </div>

        {/* ============ FILTER BAR ============ */}
        <div className="inc-card inc-noprint" style={{ padding: 20, marginBottom: 20 }}>
          <div className="inc-card-title">
            <Filter size={16} color="#2563eb" /> Filters
          </div>

          <div className="inc-filter-row">
            <Field label="Search" icon={Search} className="inc-f-search">
              <div className="inc-input-wrap">
                <Search size={16} className="inc-input-icon" />
                <input
                  type="text"
                  className="inc-input has-icon"
                  placeholder="Job No / Name / Contact / Rep"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") loadReport(filters); }}
                />
              </div>
            </Field>

            <Field label="Service Rep" icon={User} className="inc-f-rep">
              <div className="inc-input-wrap">
                <User size={16} className="inc-input-icon" />
                <select
                  className="inc-input has-icon"
                  value={filters.rep}
                  onChange={(e) => setFilters({ ...filters, rep: e.target.value })}
                >
                  <option value="">All Reps</option>
                  {repOptions.map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
            </Field>

            <Field label="From" icon={CalendarDays} className="inc-f-date">
              <input
                type="date"
                className="inc-input"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </Field>

            <Field label="To" icon={CalendarDays} className="inc-f-date">
              <input
                type="date"
                className="inc-input"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </Field>

            <div className="inc-f-actions">
              <button className="inc-btn inc-btn-primary" onClick={() => loadReport(filters)} disabled={loading}>
                {loading ? <Loader2 size={16} className="inc-spin" /> : <Search size={16} />}
                {loading ? "Loading" : "Load"}
              </button>
              <button className="inc-btn inc-btn-ghost" onClick={handleClear} title="Clear Filter">
                <RotateCcw size={16} /> Clear
              </button>
            </div>
          </div>
        </div>

        {/* ============ STAT CARDS ============ */}
        <div className="inc-stats">
          <StatCard icon={FileText} label="Total Jobs" value={jobCount} tone={TONES.blue} />
          <StatCard icon={Receipt} label="Income Entries" value={entryCount} tone={TONES.violet} />
          <StatCard icon={Users} label="Service Reps" value={repCount} tone={TONES.amber} />
          <StatCard icon={IndianRupee} label="Total Income" value={money(grandTotal)} tone={TONES.teal} />
        </div>

        {/* ============ RESULT CARD ============ */}
        <div className="inc-card" style={{ overflow: "hidden" }}>
          <div className="inc-result-head">
            <div className="inc-result-title">
              <FileText size={18} color="#64748b" />
              {jobCount} jobs <span style={{ color: "#cbd5e1" }}>|</span> {entryCount} income entries
            </div>
            <div className="inc-chips">
              <span className="inc-chip" style={{ background: "#f1f5f9", color: "#475569" }}>
                <CalendarDays size={12} /> {fmtDMY(applied.from)} → {fmtDMY(applied.to)}
              </span>
              {applied.rep && (
                <span className="inc-chip" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                  <User size={12} /> {applied.rep}
                </span>
              )}
              {applied.q && (
                <span className="inc-chip" style={{ background: "#f5f3ff", color: "#6d28d9" }}>
                  <Search size={12} /> "{applied.q}"
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="inc-empty">
              <Loader2 size={32} className="inc-spin" />
              <div className="inc-empty-sub">Loading report...</div>
            </div>
          ) : !hasRows ? (
            <div className="inc-empty">
              <div className="inc-empty-icon"><Inbox size={30} /></div>
              <div className="inc-empty-title">No records found</div>
              <div className="inc-empty-sub">Date range / Service Rep maathi try pannunga</div>
            </div>
          ) : (
            <div className="inc-table-wrap">
              <table className="inc-table">
                <thead>
                  <tr>
                    <th className="c" style={{ width: 64 }}>SL</th>
                    <th><span className="inc-th"><Hash size={13} /> Job Sheet</span></th>
                    <th><span className="inc-th"><User size={13} /> Customer</span></th>
                    <th><span className="inc-th"><Users size={13} /> Service Rep</span></th>
                    <th><span className="inc-th"><Wrench size={13} /> Engineer</span></th>
                    <th className="r"><span className="inc-th"><IndianRupee size={13} /> Income Amount</span></th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(groupedData).map(([date, records]) => {
                    const subTotal = records.reduce((sum, r) => sum + Number(r.amount), 0);
                    return (
                      <React.Fragment key={date}>
                        <tr className="inc-date-row">
                          <td colSpan="6">
                            <div className="inc-date-cell">
                              <CalendarDays size={16} />
                              {fmtDMY(date)}
                              <span className="inc-count">
                                {records.length} {records.length > 1 ? "entries" : "entry"}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {records.map((item, i) => {
                          const rc = repColor(item.serviceRep);
                          return (
                            <tr key={i} className="inc-row">
                              <td className="c" style={{ color: "#94a3b8" }}>{i + 1}</td>
                              <td><span className="inc-jobpill">{item.jobSheetNo}</span></td>
                              <td>
                                <div className="inc-cust">{item.name || "-"}</div>
                                {item.contact && (
                                  <div className="inc-contact"><Phone size={11} /> {item.contact}</div>
                                )}
                              </td>
                              <td>
                                {item.serviceRep ? (
                                  <span className="inc-rep">
                                    <span className="inc-avatar" style={{ background: rc.bg, color: rc.fg }}>
                                      {item.serviceRep.charAt(0).toUpperCase()}
                                    </span>
                                    {item.serviceRep}
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>-</span>
                                )}
                              </td>
                              <td>
                                {item.engineer && item.engineer !== "-" ? (
                                  <span className="inc-eng"><Wrench size={12} /> {item.engineer}</span>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>-</span>
                                )}
                              </td>
                              <td className="r inc-amt">{money(item.amount)}</td>
                            </tr>
                          );
                        })}

                        <tr className="inc-sub-row">
                          <td colSpan="5" className="r">Sub Total</td>
                          <td className="r inc-amt">{money(subTotal)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="inc-grand-row">
                    <td colSpan="5" className="r">Grand Total</td>
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
        .inc-page, .inc-page * { box-sizing: border-box; }
        .inc-page { min-height: 100vh; background: #f1f5f9; padding: 24px 32px; color: #1e293b; }
        .inc-container { max-width: 1400px; margin: 0 auto; }

        /* header */
        .inc-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
        .inc-header-left { display: flex; align-items: center; gap: 16px; }
        .inc-header-actions { display: flex; align-items: center; gap: 8px; }
        .inc-logo { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #fff;
          background: linear-gradient(135deg, #14b8a6, #0f766e); box-shadow: 0 8px 18px rgba(20,184,166,.3); flex-shrink: 0; }
        .inc-title { margin: 0; font-size: 28px; font-weight: 800; line-height: 1.2; letter-spacing: -0.3px; color: #1e293b; }
        .inc-subtitle { margin-top: 2px; font-size: 14px; color: #64748b; }

        /* card */
        .inc-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .inc-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 16px; }

        /* filter row */
        .inc-filter-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; }
        .inc-f-search { flex: 2 1 260px; }
        .inc-f-rep { flex: 1 1 190px; }
        .inc-f-date { flex: 1 1 150px; }
        .inc-f-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
        .inc-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .inc-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #64748b; line-height: 1; }
        .inc-label svg { flex-shrink: 0; }

        /* inputs */
        .inc-input-wrap { position: relative; }
        .inc-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
        .inc-input { display: block; width: 100%; height: 40px; padding: 0 12px; font-size: 14px; color: #1e293b; background: #fff;
          border: 1px solid #cbd5e1; border-radius: 10px; outline: none; transition: border-color .15s, box-shadow .15s; font-family: inherit; }
        .inc-input.has-icon { padding-left: 38px; }
        .inc-input::placeholder { color: #94a3b8; }
        .inc-input:focus { border-color: #2563eb; box-shadow: 0 0 0 4px #dbeafe; }

        /* buttons */
        .inc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 18px; font-size: 14px; font-weight: 600;
          border: 1px solid transparent; border-radius: 10px; cursor: pointer; white-space: nowrap; transition: background .15s, box-shadow .15s; font-family: inherit; line-height: 1; }
        .inc-btn:disabled { opacity: .55; cursor: not-allowed; }
        .inc-btn-primary { background: #2563eb; color: #fff; box-shadow: 0 1px 2px rgba(37,99,235,.35); }
        .inc-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .inc-btn-green { background: #059669; color: #fff; }
        .inc-btn-green:hover:not(:disabled) { background: #047857; }
        .inc-btn-ghost { background: #fff; color: #334155; border-color: #cbd5e1; }
        .inc-btn-ghost:hover:not(:disabled) { background: #f8fafc; }

        /* stat cards */
        .inc-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .inc-stat { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .inc-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .inc-stat-label { font-size: 12px; font-weight: 600; color: #64748b; }
        .inc-stat-value { font-size: 22px; font-weight: 800; color: #1e293b; line-height: 1.2; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* result head */
        .inc-result-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; }
        .inc-result-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #1e293b; }
        .inc-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .inc-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }

        /* empty */
        .inc-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 80px 20px; color: #94a3b8; }
        .inc-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
        .inc-empty-title { font-size: 16px; font-weight: 600; color: #64748b; }
        .inc-empty-sub { font-size: 14px; }
        .inc-spin { animation: incSpin 1s linear infinite; }
        @keyframes incSpin { to { transform: rotate(360deg); } }

        /* table */
        .inc-table-wrap { overflow-x: auto; }
        .inc-table { width: 100%; min-width: 820px; border-collapse: collapse; font-size: 14px; }
        .inc-table th { background: #1e293b; color: #f1f5f9; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; text-align: left; padding: 12px 16px; }
        .inc-table th.c, .inc-table td.c { text-align: center; }
        .inc-table th.r, .inc-table td.r { text-align: right; }
        .inc-th { display: inline-flex; align-items: center; gap: 6px; }
        .inc-table td { padding: 12px 16px; vertical-align: middle; }
        .inc-date-row td { background: #eff6ff; border-top: 1px solid #dbeafe; border-bottom: 1px solid #dbeafe; padding: 10px 16px; }
        .inc-date-cell { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #1e3a8a; }
        .inc-count { padding: 2px 8px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 600; }
        .inc-row td { border-bottom: 1px solid #f1f5f9; }
        .inc-row:hover td { background: #f8fafc; }
        .inc-jobpill { display: inline-block; padding: 3px 8px; border-radius: 6px; background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 700; }
        .inc-cust { font-weight: 600; color: #1e293b; }
        .inc-contact { display: flex; align-items: center; gap: 4px; margin-top: 2px; font-size: 12px; color: #64748b; }
        .inc-rep { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; color: #334155; }
        .inc-avatar { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .inc-eng { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; background: #f0fdfa; color: #0f766e; font-size: 12px; font-weight: 600; }
        .inc-amt { font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }
        .inc-sub-row td { background: #f8fafc; padding: 10px 16px; font-weight: 700; color: #1e293b; }
        .inc-sub-row td:first-child { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #64748b; }
        .inc-grand-row td { background: #0f766e; color: #fff; padding: 16px; font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; }
        .inc-grand-row td:first-child { font-size: 14px; letter-spacing: .06em; text-transform: uppercase; }

        @media (max-width: 640px) {
          .inc-page { padding: 16px; }
          .inc-title { font-size: 22px; }
        }

        @media print {
          .inc-noprint { display: none !important; }
          .inc-page { background: #fff; padding: 0; }
          .inc-card, .inc-stat { box-shadow: none !important; }
          .inc-row, .inc-sub-row { break-inside: avoid; }
          .inc-table th, .inc-grand-row td, .inc-date-row td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default IncomeReportPage;