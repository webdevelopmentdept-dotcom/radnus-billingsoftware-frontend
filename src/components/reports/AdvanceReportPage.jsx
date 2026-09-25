import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Wallet, Search, User, Users, CalendarDays, RotateCcw, Printer,
  FileSpreadsheet, FileText, Receipt, IndianRupee, Loader2, Inbox,
  Phone, Filter, Hash, Tag, Layers,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

/* ================= HELPERS ================= */
const toYMD = (val) => (val ? new Date(val).toLocaleDateString("en-CA") : "");
const todayStr = () => new Date().toLocaleDateString("en-CA");
const fmtDMY = (ymd) => (ymd ? ymd.split("-").reverse().join("-") : "—");
const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ✅ CHANGED — Entry Type is now just a FILTER (Both / Advance / Balance), not a view switch.
   The table itself always shows BOTH "Advance ₹" and "Balance ₹" as separate columns. */
const emptyFilters = () => ({ q: "", rep: "", type: "Both", from: todayStr(), to: todayStr() });
const TYPE_LIST = ["Both", "Advance", "Balance"];

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

/* ✅ Type badge colors — used on each ROW now (Advance row / Balance row), not just the filter chip */
const TYPE_COLORS = {
  Advance: { bg: "#d1fae5", fg: "#047857" },
  Balance: { bg: "#fef3c7", fg: "#b45309" },
  Both: { bg: "#dbeafe", fg: "#1d4ed8" },
};
const typeColor = (name = "") => TYPE_COLORS[name] || { bg: "#f1f5f9", fg: "#475569" };

const TONES = {
  blue: { bg: "#dbeafe", fg: "#2563eb" },
  violet: { bg: "#ede9fe", fg: "#7c3aed" },
  amber: { bg: "#fef3c7", fg: "#d97706" },
  green: { bg: "#d1fae5", fg: "#059669" },
  teal: { bg: "#ccfbf1", fg: "#0f766e" },
};

/* ================= SMALL UI PARTS ================= */
const Field = ({ label, icon: Icon, className = "", children }) => (
  <div className={`adv-field ${className}`}>
    <div className="adv-label">
      {Icon && <Icon size={12} />}
      <span>{label}</span>
    </div>
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="adv-stat">
    <div className="adv-stat-icon" style={{ background: tone.bg, color: tone.fg }}>
      <Icon size={20} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div className="adv-stat-label">{label}</div>
      <div className="adv-stat-value">{value}</div>
    </div>
  </div>
);

/* ================= PAGE ================= */
const AdvanceReportPage = () => {
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

  /* ===== Filter + group by date =====
     ✅ CHANGED — instead of switching SOURCE based on applied.type, we now build a
     single combined entry list: each entry carries entryType ("Advance" | "Balance"),
     and the row renders BOTH "Advance ₹" and "Balance ₹" columns — only the matching
     column is filled per row, the other shows "-". applied.type ("Both"/"Advance"/
     "Balance") just filters WHICH entries get included, it no longer changes the
     table shape. */
  const {
    groupedData, grandTotal, advanceTotal, balanceTotal,
    jobCount, entryCount, repCount,
  } = useMemo(() => {
    const grouped = {};
    const jobSet = new Set();
    const repSet = new Set();
    let advTotal = 0;
    let balTotal = 0;
    let entries = 0;
    const q = applied.q.trim().toLowerCase();
    const wantAdvance = applied.type === "Both" || applied.type === "Advance";
    const wantBalance = applied.type === "Both" || applied.type === "Balance";

    rawData.forEach((item) => {
      const jobSheetNo = item.jobSheetNo || "";
      const name = item.customer?.name || "";
      const contact = item.customer?.contact || "";
      const serviceRep = item.service?.serviceRep || "";
      const repairDate = toYMD(item.service?.repairDate);

      if (q) {
        const hay = `${jobSheetNo} ${name} ${contact} ${serviceRep}`.toLowerCase();
        if (!hay.includes(q)) return;
      }
      if (applied.rep && serviceRep !== applied.rep) return;

      const list = [];

      // ---- Advance entries ----
      if (wantAdvance) {
        const advanceItems = item.service?.advanceItems || [];
        if (advanceItems.length > 0) {
          advanceItems.forEach((adv) => {
            const amt = Number(adv.amount || 0);
            if (amt > 0) {
              list.push({
                entryType: "Advance",
                date: adv.date ? toYMD(adv.date) : repairDate,
                label: adv.label || "-",
                amount: amt,
              });
            }
          });
        } else {
          const amt = Number(item.service?.advanceAmount || 0);
          if (amt > 0) {
            list.push({
              entryType: "Advance",
              date: item.service?.advanceDate ? toYMD(item.service.advanceDate) : repairDate,
              label: "-",
              amount: amt,
            });
          }
        }
      }

      // ---- Balance entry ----
      if (wantBalance) {
        const bal = Number(item.service?.balance || 0);
        if (bal > 0) {
          list.push({
            entryType: "Balance",
            date: item.service?.balanceDate ? toYMD(item.service.balanceDate) : repairDate,
            label: "-",
            amount: bal,
          });
        }
      }

      list.forEach((e) => {
        if (applied.from && e.date < applied.from) return;
        if (applied.to && e.date > applied.to) return;
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push({
          jobSheetNo, name, contact, serviceRep,
          entryType: e.entryType, label: e.label, amount: e.amount,
        });
        if (e.entryType === "Advance") advTotal += e.amount;
        else balTotal += e.amount;
        entries += 1;
        jobSet.add(jobSheetNo);
        if (serviceRep) repSet.add(serviceRep);
      });
    });

    const sorted = {};
    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach((k) => (sorted[k] = grouped[k]));

    return {
      groupedData: sorted,
      grandTotal: advTotal + balTotal,
      advanceTotal: advTotal,
      balanceTotal: balTotal,
      jobCount: jobSet.size,
      entryCount: entries,
      repCount: repSet.size,
    };
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
          "Type": item.entryType,
          "Label": item.entryType === "Advance" ? item.label : "-",
          "Advance ₹": item.entryType === "Advance" ? item.amount : 0,
          "Balance ₹": item.entryType === "Balance" ? item.amount : 0,
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Advance & Balance Report");
    XLSX.writeFile(wb, `Advance_Balance_Report_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.xlsx`);
  };

  return (
    <div className="adv-page">
      <div className="adv-container">

        {/* ============ HEADER ============ */}
        <div className="adv-header">
          <div className="adv-header-left">
            <div className="adv-logo"><Wallet size={28} /></div>
            <div>
              <h1 className="adv-title">Advance &amp; Balance Report</h1>
              <div className="adv-subtitle">
                Advance payments &amp; pending balances — each entry shown on its own date
              </div>
            </div>
          </div>

          <div className="adv-header-actions adv-noprint">
            <button className="adv-btn adv-btn-ghost" onClick={handlePrint}>
              <Printer size={16} /> Print
            </button>
            <button className="adv-btn adv-btn-green" onClick={handleExcel} disabled={!hasRows}>
              <FileSpreadsheet size={16} /> Excel Download
            </button>
          </div>
        </div>

        {/* ============ FILTER BAR ============ */}
        <div className="adv-card adv-noprint" style={{ padding: 20, marginBottom: 20 }}>
          <div className="adv-card-title">
            <Filter size={16} color="#2563eb" /> Filters
          </div>

          <div className="adv-filter-row">
            <Field label="Search" icon={Search} className="adv-f-search">
              <div className="adv-input-wrap">
                <Search size={16} className="adv-input-icon" />
                <input
                  type="text"
                  className="adv-input has-icon"
                  placeholder="Job No / Name / Contact / Rep"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") loadReport(filters); }}
                />
              </div>
            </Field>

            {/* ✅ CHANGED — Entry Type now just FILTERS which rows show (table always
                has both Advance ₹ / Balance ₹ columns) */}
            <Field label="Entry Type" icon={Layers} className="adv-f-rep">
              <div className="adv-input-wrap">
                <Layers size={16} className="adv-input-icon" />
                <select
                  className="adv-input has-icon"
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                >
                  {TYPE_LIST.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
            </Field>

            <Field label="Service Rep" icon={User} className="adv-f-rep">
              <div className="adv-input-wrap">
                <User size={16} className="adv-input-icon" />
                <select
                  className="adv-input has-icon"
                  value={filters.rep}
                  onChange={(e) => setFilters({ ...filters, rep: e.target.value })}
                >
                  <option value="">All Reps</option>
                  {repOptions.map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
            </Field>

            <Field label="From" icon={CalendarDays} className="adv-f-date">
              <input
                type="date"
                className="adv-input"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </Field>

            <Field label="To" icon={CalendarDays} className="adv-f-date">
              <input
                type="date"
                className="adv-input"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </Field>

            <div className="adv-f-actions">
              <button className="adv-btn adv-btn-primary" onClick={() => loadReport(filters)} disabled={loading}>
                {loading ? <Loader2 size={16} className="adv-spin" /> : <Search size={16} />}
                {loading ? "Loading" : "Load"}
              </button>
              <button className="adv-btn adv-btn-ghost" onClick={handleClear} title="Clear Filter">
                <RotateCcw size={16} /> Clear
              </button>
            </div>
          </div>
        </div>

        {/* ============ STAT CARDS ============ */}
        <div className="adv-stats">
          <StatCard icon={FileText} label="Total Jobs" value={jobCount} tone={TONES.blue} />
          <StatCard icon={Receipt} label="Total Entries" value={entryCount} tone={TONES.violet} />
          <StatCard icon={Users} label="Service Reps" value={repCount} tone={TONES.amber} />
          <StatCard icon={IndianRupee} label="Total Advance" value={money(advanceTotal)} tone={TONES.green} />
          <StatCard icon={IndianRupee} label="Total Balance" value={money(balanceTotal)} tone={TONES.teal} />
        </div>

        {/* ============ RESULT CARD ============ */}
        <div className="adv-card" style={{ overflow: "hidden" }}>
          <div className="adv-result-head">
            <div className="adv-result-title">
              <FileText size={18} color="#64748b" />
              {jobCount} jobs <span style={{ color: "#cbd5e1" }}>|</span> {entryCount} entries
            </div>
            <div className="adv-chips">
              <span className="adv-chip" style={{ background: typeColor(applied.type).bg, color: typeColor(applied.type).fg }}>
                <Layers size={12} /> {applied.type}
              </span>
              <span className="adv-chip" style={{ background: "#f1f5f9", color: "#475569" }}>
                <CalendarDays size={12} /> {fmtDMY(applied.from)} → {fmtDMY(applied.to)}
              </span>
              {applied.rep && (
                <span className="adv-chip" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                  <User size={12} /> {applied.rep}
                </span>
              )}
              {applied.q && (
                <span className="adv-chip" style={{ background: "#f5f3ff", color: "#6d28d9" }}>
                  <Search size={12} /> "{applied.q}"
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="adv-empty">
              <Loader2 size={32} className="adv-spin" />
              <div className="adv-empty-sub">Loading report...</div>
            </div>
          ) : !hasRows ? (
            <div className="adv-empty">
              <div className="adv-empty-icon"><Inbox size={30} /></div>
              <div className="adv-empty-title">No records found</div>
              <div className="adv-empty-sub">Date range / Entry Type / Service Rep maathi try pannunga</div>
            </div>
          ) : (
            <div className="adv-table-wrap">
              <table className="adv-table">
                <thead>
                  <tr>
                    <th className="c" style={{ width: 56 }}>SL</th>
                    <th><span className="adv-th"><Hash size={13} /> Job Sheet</span></th>
                    <th><span className="adv-th"><User size={13} /> Customer</span></th>
                    <th><span className="adv-th"><Users size={13} /> Service Rep</span></th>
                    <th className="c"><span className="adv-th"><Layers size={13} /> Type</span></th>
                    <th><span className="adv-th"><Tag size={13} /> Label</span></th>
                    <th className="r"><span className="adv-th"><IndianRupee size={13} /> Advance ₹</span></th>
                    <th className="r"><span className="adv-th"><IndianRupee size={13} /> Balance ₹</span></th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(groupedData).map(([date, records]) => {
                    const subAdvance = records.filter(r => r.entryType === "Advance").reduce((s, r) => s + Number(r.amount), 0);
                    const subBalance = records.filter(r => r.entryType === "Balance").reduce((s, r) => s + Number(r.amount), 0);
                    const colCount = 8;
                    return (
                      <React.Fragment key={date}>
                        <tr className="adv-date-row">
                          <td colSpan={colCount}>
                            <div className="adv-date-cell">
                              <CalendarDays size={16} />
                              {fmtDMY(date)}
                              <span className="adv-count">
                                {records.length} {records.length > 1 ? "entries" : "entry"}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {records.map((item, i) => {
                          const rc = repColor(item.serviceRep);
                          const tc = typeColor(item.entryType);
                          const isAdv = item.entryType === "Advance";
                          return (
                            <tr key={i} className="adv-row">
                              <td className="c" style={{ color: "#94a3b8" }}>{i + 1}</td>
                              <td><span className="adv-jobpill">{item.jobSheetNo}</span></td>
                              <td>
                                <div className="adv-cust">{item.name || "-"}</div>
                                {item.contact && (
                                  <div className="adv-contact"><Phone size={11} /> {item.contact}</div>
                                )}
                              </td>
                              <td>
                                {item.serviceRep ? (
                                  <span className="adv-rep">
                                    <span className="adv-avatar" style={{ background: rc.bg, color: rc.fg }}>
                                      {item.serviceRep.charAt(0).toUpperCase()}
                                    </span>
                                    {item.serviceRep}
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>-</span>
                                )}
                              </td>
                              <td className="c">
                                <span className="adv-typebadge" style={{ background: tc.bg, color: tc.fg }}>
                                  {item.entryType}
                                </span>
                              </td>
                              <td style={{ color: "#475569" }}>{isAdv ? item.label : "-"}</td>
                              <td className="r adv-amt">{isAdv ? money(item.amount) : <span style={{ color: "#cbd5e1" }}>-</span>}</td>
                              <td className="r adv-amt">{!isAdv ? money(item.amount) : <span style={{ color: "#cbd5e1" }}>-</span>}</td>
                            </tr>
                          );
                        })}

                        <tr className="adv-sub-row">
                          <td colSpan={6} className="r">Sub Total</td>
                          <td className="r adv-amt">{money(subAdvance)}</td>
                          <td className="r adv-amt">{money(subBalance)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="adv-grand-row">
                    <td colSpan={6} className="r">Grand Total</td>
                    <td className="r">{money(advanceTotal)}</td>
                    <td className="r">{money(balanceTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ============ SCOPED STYLES ============ */}
      <style>{`
        .adv-page, .adv-page * { box-sizing: border-box; }
        .adv-page { min-height: 100vh; background: #f1f5f9; padding: 24px 32px; color: #1e293b; }
        .adv-container { max-width: 1500px; margin: 0 auto; }

        .adv-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
        .adv-header-left { display: flex; align-items: center; gap: 16px; }
        .adv-header-actions { display: flex; align-items: center; gap: 8px; }
        .adv-logo { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #fff;
          background: linear-gradient(135deg, #10b981, #0d9488); box-shadow: 0 8px 18px rgba(16,185,129,.28); flex-shrink: 0; }
        .adv-title { margin: 0; font-size: 28px; font-weight: 800; line-height: 1.2; letter-spacing: -0.3px; color: #1e293b; }
        .adv-subtitle { margin-top: 2px; font-size: 14px; color: #64748b; }

        .adv-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .adv-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 16px; }

        .adv-filter-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; }
        .adv-f-search { flex: 2 1 260px; }
        .adv-f-rep { flex: 1 1 170px; }
        .adv-f-date { flex: 1 1 150px; }
        .adv-f-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
        .adv-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .adv-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #64748b; line-height: 1; }
        .adv-label svg { flex-shrink: 0; }

        .adv-input-wrap { position: relative; }
        .adv-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
        .adv-input { display: block; width: 100%; height: 40px; padding: 0 12px; font-size: 14px; color: #1e293b; background: #fff;
          border: 1px solid #cbd5e1; border-radius: 10px; outline: none; transition: border-color .15s, box-shadow .15s; font-family: inherit; }
        .adv-input.has-icon { padding-left: 38px; }
        .adv-input::placeholder { color: #94a3b8; }
        .adv-input:focus { border-color: #2563eb; box-shadow: 0 0 0 4px #dbeafe; }

        .adv-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 18px; font-size: 14px; font-weight: 600;
          border: 1px solid transparent; border-radius: 10px; cursor: pointer; white-space: nowrap; transition: background .15s, box-shadow .15s; font-family: inherit; line-height: 1; }
        .adv-btn:disabled { opacity: .55; cursor: not-allowed; }
        .adv-btn-primary { background: #2563eb; color: #fff; box-shadow: 0 1px 2px rgba(37,99,235,.35); }
        .adv-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .adv-btn-green { background: #059669; color: #fff; }
        .adv-btn-green:hover:not(:disabled) { background: #047857; }
        .adv-btn-ghost { background: #fff; color: #334155; border-color: #cbd5e1; }
        .adv-btn-ghost:hover:not(:disabled) { background: #f8fafc; }

        .adv-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .adv-stat { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .adv-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .adv-stat-label { font-size: 12px; font-weight: 600; color: #64748b; }
        .adv-stat-value { font-size: 22px; font-weight: 800; color: #1e293b; line-height: 1.2; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .adv-result-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; }
        .adv-result-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #1e293b; }
        .adv-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .adv-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }

        .adv-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 80px 20px; color: #94a3b8; }
        .adv-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
        .adv-empty-title { font-size: 16px; font-weight: 600; color: #64748b; }
        .adv-empty-sub { font-size: 14px; }
        .adv-spin { animation: advSpin 1s linear infinite; }
        @keyframes advSpin { to { transform: rotate(360deg); } }

        .adv-table-wrap { overflow-x: auto; }
        .adv-table { width: 100%; min-width: 980px; border-collapse: collapse; font-size: 14px; }
        .adv-table th { background: #1e293b; color: #f1f5f9; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; text-align: left; padding: 12px 16px; }
        .adv-table th.c, .adv-table td.c { text-align: center; }
        .adv-table th.r, .adv-table td.r { text-align: right; }
        .adv-th { display: inline-flex; align-items: center; gap: 6px; }
        .adv-table td { padding: 12px 16px; vertical-align: middle; }
        .adv-date-row td { background: #eff6ff; border-top: 1px solid #dbeafe; border-bottom: 1px solid #dbeafe; padding: 10px 16px; }
        .adv-date-cell { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #1e3a8a; }
        .adv-count { padding: 2px 8px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 600; }
        .adv-row td { border-bottom: 1px solid #f1f5f9; }
        .adv-row:hover td { background: #f8fafc; }
        .adv-jobpill { display: inline-block; padding: 3px 8px; border-radius: 6px; background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 700; }
        .adv-typebadge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .adv-cust { font-weight: 600; color: #1e293b; }
        .adv-contact { display: flex; align-items: center; gap: 4px; margin-top: 2px; font-size: 12px; color: #64748b; }
        .adv-rep { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; color: #334155; }
        .adv-avatar { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .adv-amt { font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }
        .adv-sub-row td { background: #f8fafc; padding: 10px 16px; font-weight: 700; color: #1e293b; }
        .adv-sub-row td:first-child { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #64748b; }
        .adv-grand-row td { background: #059669; color: #fff; padding: 16px; font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; }
        .adv-grand-row td:first-child { font-size: 14px; letter-spacing: .06em; text-transform: uppercase; }

        @media (max-width: 640px) {
          .adv-page { padding: 16px; }
          .adv-title { font-size: 22px; }
        }

        @media print {
          .adv-noprint { display: none !important; }
          .adv-page { background: #fff; padding: 0; }
          .adv-card, .adv-stat { box-shadow: none !important; }
          .adv-row, .adv-sub-row { break-inside: avoid; }
          .adv-table th, .adv-grand-row td, .adv-date-row td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default AdvanceReportPage;