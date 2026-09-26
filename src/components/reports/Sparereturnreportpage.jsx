import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Undo2, Search, User, Users, CalendarDays, RotateCcw, Printer,
  FileSpreadsheet, FileText, IndianRupee, Loader2, Inbox,
  Phone, Filter, Hash, Package, MessageSquareText,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;

/* ================= HELPERS ================= */
const toYMD = (val) => (val ? new Date(val).toLocaleDateString("en-CA") : "");
const todayStr = () => new Date().toLocaleDateString("en-CA");
const fmtDMY = (ymd) => (ymd ? ymd.split("-").reverse().join("-") : "—");
const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const emptyFilters = () => ({ q: "", rep: "", from: "", to: todayStr() });

const TONES = {
  blue: { bg: "#dbeafe", fg: "#2563eb" },
  violet: { bg: "#ede9fe", fg: "#7c3aed" },
  amber: { bg: "#fef3c7", fg: "#d97706" },
  red: { bg: "#fee2e2", fg: "#dc2626" },
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
/* ✅ Spare Return Report: lists every spare item marked isReturned:true
   across all job sheets, grouped by returnDate.

   ✅ FIX — Return now happens from SparePopup (Spare Used items), not from
   RawSparePopup anymore. Previously this report only scanned
   `job.rawSpareItems`, so after the Return flow moved, every new return
   showed up nowhere here — no return date, nothing. Now it scans BOTH
   `job.spareItems` (Spare Used — the new home of Return) and
   `job.rawSpareItems` (kept for any OLD returns saved before the move),
   tagging each row with its Source so it's clear which list it came from.
   Reads straight off /api/jobsheets/filter — no new backend route needed
   since both fields are already saved on the job sheet.

   ✅ NEW — the Remark typed in the Return bar in SparePopup (saved as
   `returnReason` on the item) is now shown clearly under the spare's row
   as a dedicated "Remark" note line, instead of a cramped table column
   that could get cut off. When no remark was entered, it just says so
   in muted text instead of a bare "-".

   ✅ FIX — double-entry bug. When a "From Raw Stock" Spare Used item is
   Returned, SparePopup auto-syncs the matching Raw Spare purchase entry
   to Returned too (same physical part, tagged `syncedReturn: true` on the
   raw entry). Previously this report scanned both lists independently, so
   that ONE return showed up as TWO rows here — once as "Spare Used", once
   as "Raw Spare" — doubling the item count and the returned value. Raw
   entries carrying `syncedReturn: true` are now skipped on the Raw Spare
   side, since they're already represented once under Spare Used. A raw
   entry Returned directly inside RawSparePopup (a genuine standalone
   purchase return that was never billed on a job) has no such flag and
   still shows correctly as its own "Raw Spare" row. */
const SpareReturnReportPage = () => {
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

  const { groupedData, grandTotal, jobCount, itemCount, repCount } = useMemo(() => {
    const grouped = {};
    const jobSet = new Set();
    const repSet = new Set();
    let gTotal = 0;
    let items = 0;
    const q = applied.q.trim().toLowerCase();

    rawData.forEach((item) => {
      const jobSheetNo = item.jobSheetNo || "";
      const name = item.customer?.name || "";
      const contact = item.customer?.contact || "";
      const serviceRep = item.service?.serviceRep || "";

      if (q) {
        const hay = `${jobSheetNo} ${name} ${contact} ${serviceRep}`.toLowerCase();
        if (!hay.includes(q)) return;
      }
      if (applied.rep && serviceRep !== applied.rep) return;

      // ✅ merge returned rows from BOTH sources: Spare Used
      // (spareItems, where Return is now given) and Raw Spare
      // (rawSpareItems, kept only for older returns saved before the move).
      const returnedUsed = (item.spareItems || [])
        .filter((ri) => ri.isReturned)
        .map((ri) => ({ ...ri, source: "Spare Used" }));
      // ✅ FIX — skip raw entries that were only marked Returned because
      // they're synced from a "From Raw Stock" Spare Used return (same
      // physical part, already counted once above via returnedUsed).
      // Only a genuine standalone Raw Spare return (no sync flag) shows here.
      const returnedRaw = (item.rawSpareItems || [])
        .filter((ri) => ri.isReturned && !ri.syncedReturn)
        .map((ri) => ({ ...ri, source: "Raw Spare" }));
      const returnedItems = [...returnedUsed, ...returnedRaw];

      returnedItems.forEach((ri) => {
        // ✅ return date first — this is what "when was it returned" means.
        // Falls back to the purchase/usage date only if returnDate is
        // somehow missing (older rows saved before the date picker existed).
        const date = ri.returnDate ? toYMD(ri.returnDate) : toYMD(ri.date);
        if (!date) return;
        if (applied.from && date < applied.from) return;
        if (applied.to && date > applied.to) return;

        if (!grouped[date]) grouped[date] = [];
        grouped[date].push({
          jobSheetNo, name, contact, serviceRep,
          spareName: ri.name, qty: ri.qty, rate: ri.rate,
          amount: Number(ri.amount || 0),
          // ✅ NEW — the Remark box in SparePopup's return bar saves into
          // returnReason; trim it so stray whitespace doesn't show as a note.
          remark: (ri.returnReason || "").trim(),
          source: ri.source,
        });
        gTotal += Number(ri.amount || 0);
        items += 1;
        jobSet.add(jobSheetNo);
        if (serviceRep) repSet.add(serviceRep);
      });
    });

    const sorted = {};
    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach((k) => (sorted[k] = grouped[k]));

    return { groupedData: sorted, grandTotal: gTotal, jobCount: jobSet.size, itemCount: items, repCount: repSet.size };
  }, [rawData, applied]);

  const hasRows = Object.keys(groupedData).length > 0;

  const handlePrint = () => window.print();

  const handleExcel = () => {
    const rows = [];
    Object.entries(groupedData).forEach(([date, records]) => {
      records.forEach((item, i) => {
        rows.push({
          "Return Date": date,
          "SL No": i + 1,
          "Job Sheet": item.jobSheetNo,
          "Customer": item.name,
          "Contact": item.contact,
          "Service Rep": item.serviceRep,
          "Source": item.source,
          "Spare Name": item.spareName,
          "Qty": item.qty,
          "Rate": item.rate,
          "Amount": item.amount,
          "Remark": item.remark || "-",
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Spare Return Report");
    XLSX.writeFile(wb, `Spare_Return_Report_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.xlsx`);
  };

  return (
    <div className="spr-page">
      <div className="spr-container">

        {/* ============ HEADER ============ */}
        <div className="spr-header">
          <div className="spr-header-left">
            <div className="spr-logo"><Undo2 size={28} /></div>
            <div>
              <h1 className="spr-title">Spare Return Report</h1>
              <div className="spr-subtitle">
                Spares marked as Returned (Spare Used or Raw Spare) — grouped by the date they were returned
              </div>
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
            <Filter size={16} color="#dc2626" /> Filters
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
          <StatCard icon={FileText} label="Job Sheets" value={jobCount} tone={TONES.blue} />
          <StatCard icon={Package} label="Returned Items" value={itemCount} tone={TONES.violet} />
          <StatCard icon={Users} label="Service Reps" value={repCount} tone={TONES.amber} />
          <StatCard icon={IndianRupee} label="Total Returned Value" value={money(grandTotal)} tone={TONES.red} />
        </div>

        {/* ============ RESULT CARD ============ */}
        <div className="spr-card" style={{ overflow: "hidden" }}>
          <div className="spr-result-head">
            <div className="spr-result-title">
              <FileText size={18} color="#64748b" />
              {jobCount} jobs <span style={{ color: "#cbd5e1" }}>|</span> {itemCount} returned items
            </div>
            <div className="spr-chips">
              <span className="spr-chip" style={{ background: "#f1f5f9", color: "#475569" }}>
                <CalendarDays size={12} /> {applied.from ? fmtDMY(applied.from) : "Start"} → {fmtDMY(applied.to)}
              </span>
              {applied.rep && (
                <span className="spr-chip" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                  <User size={12} /> {applied.rep}
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
              <div className="spr-empty-title">No returned spares found</div>
              <div className="spr-empty-sub">Date range / Service Rep maathi try pannunga</div>
            </div>
          ) : (
            <div className="spr-table-wrap">
              <table className="spr-table">
                <thead>
                  <tr>
                    <th className="c" style={{ width: 56 }}>SL</th>
                    <th><span className="spr-th"><Hash size={13} /> Job Sheet</span></th>
                    <th><span className="spr-th"><User size={13} /> Customer</span></th>
                    <th><span className="spr-th"><Users size={13} /> Service Rep</span></th>
                    <th>Source</th>
                    <th><span className="spr-th"><Package size={13} /> Spare Name</span></th>
                    <th className="c">Qty</th>
                    <th className="r">Rate ₹</th>
                    <th className="r"><span className="spr-th"><IndianRupee size={13} /> Amount</span></th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(groupedData).map(([date, records]) => {
                    const subTotal = records.reduce((sum, r) => sum + Number(r.amount), 0);
                    const colCount = 9;
                    return (
                      <React.Fragment key={date}>
                        <tr className="spr-date-row">
                          <td colSpan={colCount}>
                            <div className="spr-date-cell">
                              <CalendarDays size={16} />
                              {fmtDMY(date)}
                              <span className="spr-count">
                                {records.length} {records.length > 1 ? "items" : "item"}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {records.map((item, i) => (
                          <React.Fragment key={i}>
                            <tr className="spr-row">
                              <td className="c" style={{ color: "#94a3b8" }}>{i + 1}</td>
                              <td><span className="spr-jobpill">{item.jobSheetNo}</span></td>
                              <td>
                                <div className="spr-cust">{item.name || "-"}</div>
                                {item.contact && (
                                  <div className="spr-contact"><Phone size={11} /> {item.contact}</div>
                                )}
                              </td>
                              <td>{item.serviceRep || <span style={{ color: "#94a3b8" }}>-</span>}</td>
                              <td>
                                <span
                                  className="spr-source"
                                  style={
                                    item.source === "Spare Used"
                                      ? { background: "#eff6ff", color: "#2563eb" }
                                      : { background: "#fffbeb", color: "#b45309" }
                                  }
                                >
                                  {item.source}
                                </span>
                              </td>
                              <td style={{ fontWeight: 600 }}>{item.spareName}</td>
                              <td className="c">{item.qty}</td>
                              <td className="r">{item.rate}</td>
                              <td className="r spr-amt">{money(item.amount)}</td>
                            </tr>

                            {/* ✅ NEW — dedicated Remark / Notes line, right under the
                                returned spare it belongs to, so it's always visible
                                instead of hiding in a narrow table cell. */}
                            <tr className="spr-remark-row">
                              <td></td>
                              <td colSpan={colCount - 1}>
                                {item.remark ? (
                                  <div className="spr-remark">
                                    <MessageSquareText size={13} />
                                    <span><strong>Remark:</strong> {item.remark}</span>
                                  </div>
                                ) : (
                                  <div className="spr-remark spr-remark-empty">
                                    <MessageSquareText size={13} />
                                    <span>No remark added</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}

                        <tr className="spr-sub-row">
                          <td colSpan={colCount - 1} className="r">Sub Total</td>
                          <td className="r spr-amt">{money(subTotal)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="spr-grand-row">
                    <td colSpan={8} className="r">Grand Total</td>
                    <td className="r">{money(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ============ SCOPED STYLES ============ */}
      <style>{`
        .spr-page, .spr-page * { box-sizing: border-box; }
        .spr-page { min-height: 100vh; background: #f1f5f9; padding: 24px 32px; color: #1e293b; }
        .spr-container { max-width: 1400px; margin: 0 auto; }

        .spr-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
        .spr-header-left { display: flex; align-items: center; gap: 16px; }
        .spr-header-actions { display: flex; align-items: center; gap: 8px; }
        .spr-logo { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #fff;
          background: linear-gradient(135deg, #dc2626, #b91c1c); box-shadow: 0 8px 18px rgba(220,38,38,.28); flex-shrink: 0; }
        .spr-title { margin: 0; font-size: 28px; font-weight: 800; line-height: 1.2; letter-spacing: -0.3px; color: #1e293b; }
        .spr-subtitle { margin-top: 2px; font-size: 14px; color: #64748b; }

        .spr-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .spr-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 16px; }

        .spr-filter-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; }
        .spr-f-search { flex: 2 1 260px; }
        .spr-f-rep { flex: 1 1 170px; }
        .spr-f-date { flex: 1 1 150px; }
        .spr-f-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
        .spr-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .spr-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #64748b; line-height: 1; }
        .spr-label svg { flex-shrink: 0; }

        .spr-input-wrap { position: relative; }
        .spr-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
        .spr-input { display: block; width: 100%; height: 40px; padding: 0 12px; font-size: 14px; color: #1e293b; background: #fff;
          border: 1px solid #cbd5e1; border-radius: 10px; outline: none; transition: border-color .15s, box-shadow .15s; font-family: inherit; }
        .spr-input.has-icon { padding-left: 38px; }
        .spr-input::placeholder { color: #94a3b8; }
        .spr-input:focus { border-color: #dc2626; box-shadow: 0 0 0 4px #fee2e2; }

        .spr-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 18px; font-size: 14px; font-weight: 600;
          border: 1px solid transparent; border-radius: 10px; cursor: pointer; white-space: nowrap; transition: background .15s, box-shadow .15s; font-family: inherit; line-height: 1; }
        .spr-btn:disabled { opacity: .55; cursor: not-allowed; }
        .spr-btn-primary { background: #dc2626; color: #fff; box-shadow: 0 1px 2px rgba(220,38,38,.35); }
        .spr-btn-primary:hover:not(:disabled) { background: #b91c1c; }
        .spr-btn-green { background: #059669; color: #fff; }
        .spr-btn-green:hover:not(:disabled) { background: #047857; }
        .spr-btn-ghost { background: #fff; color: #334155; border-color: #cbd5e1; }
        .spr-btn-ghost:hover:not(:disabled) { background: #f8fafc; }

        .spr-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .spr-stat { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .spr-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .spr-stat-label { font-size: 12px; font-weight: 600; color: #64748b; }
        .spr-stat-value { font-size: 22px; font-weight: 800; color: #1e293b; line-height: 1.2; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .spr-result-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; }
        .spr-result-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #1e293b; }
        .spr-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .spr-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }

        .spr-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 80px 20px; color: #94a3b8; }
        .spr-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
        .spr-empty-title { font-size: 16px; font-weight: 600; color: #64748b; }
        .spr-empty-sub { font-size: 14px; }
        .spr-spin { animation: sprSpin 1s linear infinite; }
        @keyframes sprSpin { to { transform: rotate(360deg); } }

        .spr-table-wrap { overflow-x: auto; }
        .spr-table { width: 100%; min-width: 980px; border-collapse: collapse; font-size: 14px; }
        .spr-table th { background: #1e293b; color: #f1f5f9; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; text-align: left; padding: 12px 16px; }
        .spr-table th.c, .spr-table td.c { text-align: center; }
        .spr-table th.r, .spr-table td.r { text-align: right; }
        .spr-th { display: inline-flex; align-items: center; gap: 6px; }
        .spr-table td { padding: 12px 16px; vertical-align: middle; }
        .spr-date-row td { background: #fef2f2; border-top: 1px solid #fecaca; border-bottom: 1px solid #fecaca; padding: 10px 16px; }
        .spr-date-cell { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #991b1b; }
        .spr-count { padding: 2px 8px; border-radius: 999px; background: #fee2e2; color: #dc2626; font-size: 11px; font-weight: 600; }
        .spr-row td { border-bottom: none; }
        .spr-row:hover td, .spr-row:hover + .spr-remark-row td { background: #f8fafc; }
        .spr-jobpill { display: inline-block; padding: 3px 8px; border-radius: 6px; background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 700; }
        .spr-source { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .spr-cust { font-weight: 600; color: #1e293b; }
        .spr-contact { display: flex; align-items: center; gap: 4px; margin-top: 2px; font-size: 12px; color: #64748b; }
        .spr-amt { font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }

        /* ✅ NEW — the Remark note line under each returned-item row */
        .spr-remark-row td { padding: 0 16px 10px; border-bottom: 1px solid #f1f5f9; }
        .spr-remark { display: flex; align-items: flex-start; gap: 6px; font-size: 12.5px; color: #7c2d12; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 6px 10px; line-height: 1.4; white-space: normal; word-break: break-word; }
        .spr-remark strong { font-weight: 700; margin-right: 2px; }
        .spr-remark svg { flex-shrink: 0; margin-top: 2px; }
        .spr-remark-empty { color: #94a3b8; background: #f8fafc; border-color: #e2e8f0; font-style: italic; }

        .spr-sub-row td { background: #f8fafc; padding: 10px 16px; font-weight: 700; color: #1e293b; }
        .spr-sub-row td:first-child { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #64748b; }
        .spr-grand-row td { background: #dc2626; color: #fff; padding: 16px; font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; }
        .spr-grand-row td:first-child { font-size: 14px; letter-spacing: .06em; text-transform: uppercase; }

        @media (max-width: 640px) {
          .spr-page { padding: 16px; }
          .spr-title { font-size: 22px; }
        }

        @media print {
          .spr-noprint { display: none !important; }
          .spr-page { background: #fff; padding: 0; }
          .spr-card, .spr-stat { box-shadow: none !important; }
          .spr-row, .spr-sub-row, .spr-remark-row { break-inside: avoid; }
          .spr-table th, .spr-grand-row td, .spr-date-row td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default SpareReturnReportPage;