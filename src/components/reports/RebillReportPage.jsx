import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

/* =====================================================
   ✅ NEW HELPERS — cycle split + returned totals

   Spare/Raw Spare items are stored CUMULATIVE (full lifetime history,
   never wiped on rebill). The "baseline" saved at rebill time is the
   running-sum cutoff: walk the items array IN ORDER, and as long as the
   sum-so-far is still under the baseline, that item belongs to a PAST
   cycle ("before rebill"). Everything after is the CURRENT cycle.
   This mirrors exactly what SparePopup / RawSparePopup already do.

   `getCycleTotals` returns, for the CURRENT cycle only:
     - activeTotal   → sum of non-returned item amounts (real billable total)
     - returnedTotal → sum of returned item amounts (this cycle only)

   `getLifetimeReturned` returns total returned across ALL cycles — used
   because individual past-cycle item snapshots aren't stored in
   rebillHistory (only aggregate numbers are), so a *lifetime* returned
   figure is the most accurate thing we can show for "before rebill" data.
===================================================== */
const splitByCycle = (items = [], baseline = 0) => {
  let runningSum = 0;
  return items.map((item) => {
    const isOld = runningSum < baseline;
    runningSum += Number(item.amount || 0);
    return { item, isOld };
  });
};

const getCycleTotals = (items = [], baseline = 0) => {
  const withCycle = splitByCycle(items, baseline);
  const current = withCycle.filter(({ isOld }) => !isOld).map(({ item }) => item);
  const activeTotal = current
    .filter((i) => !i.isReturned)
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  const returnedTotal = current
    .filter((i) => i.isReturned)
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  return { activeTotal, returnedTotal };
};

const getLifetimeReturned = (items = []) =>
  items.filter((i) => i.isReturned).reduce((s, i) => s + Number(i.amount || 0), 0);

const RebillReportPage = () => {
  const [data,           setData]           = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [search,         setSearch]         = useState("");
  const [repFilter,      setRepFilter]      = useState("");
  const [dateFilterType, setDateFilterType] = useState("created"); // "created" | "rebilled"
  const [fromDate,       setFromDate]       = useState("");
  const [toDate,         setToDate]         = useState("");
  const [loading,        setLoading]        = useState(false);
  const [expandedId,     setExpandedId]     = useState(null);

  const API      = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  /* ── FETCH ── */
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/jobsheets/filter`);
      // Only jobs that have been rebilled at least once
      const rebilled = res.data.filter(
        item => item.rebillHistory && item.rebillHistory.length > 0
      );
      setData(rebilled);
      setFiltered(rebilled);
    } catch (err) {
      console.error(err);
      alert("Failed to load ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Service Rep dropdown options (data-la irukkura reps)
  const repOptions = useMemo(() => {
    const set = new Set();
    data.forEach((j) => { if (j.service?.serviceRep) set.add(j.service.serviceRep); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  /* ================= DATE MATCH =================
     "created"  → job.createdAt (single date, job created on this day)
     "rebilled" → ANY entry in job.rebillHistory[].rebilledAt falls in range
                  (a job can be rebilled more than once; if ANY cycle's
                  rebill happened inside From/To, the job matches). */
  const matchesDateFilter = (item) => {
    if (!fromDate && !toDate) return true;

    const inRange = (d) => {
      if (!d) return false;
      if (fromDate && toDate) return d >= fromDate && d <= toDate;
      if (fromDate) return d >= fromDate;
      if (toDate)   return d <= toDate;
      return true;
    };

    if (dateFilterType === "rebilled") {
      const rebillDates = (item.rebillHistory || [])
        .map(rb => rb.rebilledAt ? new Date(rb.rebilledAt).toISOString().slice(0, 10) : null)
        .filter(Boolean);
      return rebillDates.some(inRange);
    }

    const created = item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : null;
    return inRange(created);
  };

  /* ── FILTER ── */
  const applyFilter = () => {
    let f = [...data];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      f = f.filter(item =>
        item.customer?.name?.toLowerCase().includes(q) ||
        item.customer?.contact?.includes(q) ||
        item.jobSheetNo?.toLowerCase().includes(q) ||
        item.service?.serviceRep?.toLowerCase().includes(q)
      );
    }
    if (repFilter) {
      f = f.filter(item => item.service?.serviceRep === repFilter);
    }
    f = f.filter(matchesDateFilter);
    setFiltered(f);
  };

  const handleReset = () => {
    setSearch("");
    setRepFilter("");
    setDateFilterType("created");
    setFromDate("");
    setToDate("");
    fetchData();
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

  const fmtCurrency = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN")}`;

  /* ── STATUS PILL ── */
  const statusStyle = (s) => {
    const map = {
      "Received":         { bg: "#DBEAFE", color: "#1D4ED8" },
      "Pending":          { bg: "#FEF3C7", color: "#92400E" },
      "Repairing":        { bg: "#EDE9FE", color: "#5B21B6" },
      "Diagnosing":       { bg: "#EDE9FE", color: "#5B21B6" },
      "Ready":            { bg: "#D1FAE5", color: "#065F46" },
      "Delivered":        { bg: "#D1FAE5", color: "#065F46" },
      "Delivered NR/NA":  { bg: "#D1FAE5", color: "#065F46" },
    };
    return map[s] || { bg: "#F3F4F6", color: "#374151" };
  };

  const totalRebills = filtered.reduce((sum, j) => sum + (j.rebillHistory?.length || 0), 0);

  const totalRevenue = filtered.reduce((sum, j) => {
    const histIncome = j.rebillHistory?.reduce((s, r) => s + Number(r.income || 0), 0) || 0;
    const currIncome = Number(j.service?.income || 0);
    return sum + histIncome + currIncome;
  }, 0);

  // ✅ NEW — Total outstanding Balance across every filtered job (current cycle only,
  // since Balance resets to 0 on every rebill — job.service.balance IS the current figure).
  const totalOutstandingBalance = filtered.reduce(
    (sum, j) => sum + Number(j.service?.balance || 0), 0
  );

  const handleExcel = () => {
    const rows = [];

    filtered.forEach((job) => {
      const spareBaseline    = Number(job.service?.spareBaseline    || 0);
      const rawSpareBaseline = Number(job.service?.rawSpareBaseline || 0);
      const othersBaseline   = Number(job.service?.othersBaseline   || 0);
      const advanceBaseline  = Number(job.service?.advanceBaseline  || 0);

      const spareCycle    = getCycleTotals(job.spareItems,    spareBaseline);
      const rawSpareCycle = getCycleTotals(job.rawSpareItems, rawSpareBaseline);

      const currentCycleOthers  = Math.max(0, Number(job.service?.othersAmount  || 0) - othersBaseline);
      const currentCycleAdvance = Math.max(0, Number(job.service?.advanceAmount || 0) - advanceBaseline);

      (job.rebillHistory || []).forEach((rb, ri) => {
        rows.push({
          "Job No":              job.jobSheetNo,
          "Customer":            job.customer?.name    || "-",
          "Contact":             job.customer?.contact || "-",
          "Device":              [job.device?.make, job.device?.model].filter(Boolean).join(" ") || "-",
          "Service Rep":         job.service?.serviceRep || "-",
          "Engineer":            job.service?.engineer || "-",
          "Cycle":               `Before Rebill #${ri + 1}`,
          "Income ₹":            rb.income         || 0,
          "Balance ₹":           rb.balance        || 0,
          "Service ₹":           rb.serviceCharge  || 0,
          "Spare ₹":             rb.spareCharge    || 0,
          "Raw Spare ₹":         rb.rawSpareCharge || 0,
          "Others ₹":            rb.othersAmount   || 0,
          "Advance ₹":           rb.advanceAmount  || 0,
          "Returned Spare ₹":    "-",   // not tracked per past cycle (see note in UI)
          "Returned Raw Spare ₹":"-",
          "Payment Mode":        rb.paymentMode || "-",
          "Status at time":      rb.status     || "-",
          "Remarks":             rb.remarks    || "-",
          "Rebilled By":         rb.rebilledBy || "-",
          "Rebilled At":         fmtDate(rb.rebilledAt),
          "Created At":          fmtDate(job.createdAt),
        });
      });

      rows.push({
        "Job No":              job.jobSheetNo,
        "Customer":            job.customer?.name    || "-",
        "Contact":             job.customer?.contact || "-",
        "Device":              [job.device?.make, job.device?.model].filter(Boolean).join(" ") || "-",
        "Service Rep":         job.service?.serviceRep || "-",
        "Engineer":            job.service?.engineer || "-",
        "Cycle":               `Current (After Rebill #${(job.rebillHistory?.length || 0)})`,
        "Income ₹":            job.service?.income        || 0,
        "Balance ₹":           job.service?.balance       || 0,
        "Service ₹":           job.service?.serviceCharge || 0,
        "Spare ₹":             spareCycle.activeTotal,
        "Raw Spare ₹":         rawSpareCycle.activeTotal,
        "Others ₹":            currentCycleOthers,
        "Advance ₹":           currentCycleAdvance,
        "Returned Spare ₹":    spareCycle.returnedTotal,
        "Returned Raw Spare ₹":rawSpareCycle.returnedTotal,
        "Payment Mode":        job.service?.paymentMode || "-",
        "Status at time":      job.device?.mobileStatus || "-",
        "Remarks":             job.service?.remarks || "-",
        "Rebilled By":         "-",
        "Rebilled At":         "-",
        "Created At":          fmtDate(job.createdAt),
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rebill Report");
    XLSX.writeFile(wb, `Rebill_Report_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.xlsx`);
  };

  const dateTypeLabel = dateFilterType === "rebilled" ? "Rebilled Date" : "Created Date";

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
        .rb-row { transition: background 0.12s; cursor: pointer; }
        .rb-row:hover { background: #f8fafc !important; }
        .filter-in { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 13px; outline: none; background: #fff; }
        .filter-in:focus { border-color: #6366f1; }
      `}</style>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 20px" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>🔄 Rebill Report</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Jobs that were reopened and rebilled after invoice — Income / Balance / Service / Spare / Raw Spare / Others / Advance / Returns shown before &amp; after each rebill</p>
          </div>
          <div className="no-print" style={{ display: "flex", gap: 8 }}>
            <button onClick={() => navigate(-1)}
              style={{ background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              ← Back
            </button>
            <button onClick={() => window.print()}
              style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              🖨️ Print
            </button>
            <button onClick={handleExcel}
              style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              ⬇ Excel
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
          {[
            { label: "Total Rebilled Jobs",    value: filtered.length,       color: "#6366f1", bg: "#eef2ff", icon: "📋" },
            { label: "Total Rebill Instances", value: totalRebills,           color: "#f59e0b", bg: "#fffbeb", icon: "🔄" },
            { label: "Total Income (All)",     value: fmtCurrency(totalRevenue), color: "#10b981", bg: "#f0fdf4", icon: "💰" },
            { label: "Outstanding Balance (Current)", value: fmtCurrency(totalOutstandingBalance), color: "#dc2626", bg: "#fef2f2", icon: "⏳" },
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, borderRadius: 12, padding: "16px 18px", border: `1.5px solid ${c.color}22` }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* FILTER BAR */}
        <div className="no-print" style={{ background: "#fff", borderRadius: 14, padding: "14px 20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Search</label>
            <input className="filter-in" placeholder="Job No / Name / Contact / Rep" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Service Rep</label>
            <select className="filter-in" value={repFilter} onChange={e => setRepFilter(e.target.value)} style={{ minWidth: 140 }}>
              <option value="">All Reps</option>
              {repOptions.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Date Type</label>
            <select className="filter-in" value={dateFilterType} onChange={e => setDateFilterType(e.target.value)} style={{ minWidth: 150 }}>
              <option value="created">Created Date</option>
              <option value="rebilled">Rebilled Date</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>From</label>
            <input type="date" className="filter-in" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>To</label>
            <input type="date" className="filter-in" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <button onClick={applyFilter}
            style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            🔍 Filter
          </button>
          <button onClick={handleReset}
            style={{ background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            🔄 Reset
          </button>
        </div>

        {/* TABLE */}
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden", border: "1px solid #e2e8f0" }}>

          <div style={{ padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>
              {filtered.length} job{filtered.length !== 1 ? "s" : ""} found
              {(fromDate || toDate) && (
                <span style={{ color: "#94a3b8", fontWeight: 500 }}> — filtered by {dateTypeLabel}</span>
              )}
            </span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Click a row to see full rebill breakdown (Income / Balance / Service / Spare / Raw Spare / Others / Advance / Returns)</span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px", color: "#94a3b8", fontSize: 14 }}>⏳ Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", color: "#94a3b8", fontSize: 14 }}>No rebill records found</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", color: "#475569" }}>
                    {["#", "Job No", "Customer", "Contact", "Device", "Service Rep", "Engineer", "Status", "Rebills", "Current Income ₹", "Current Balance ₹", "Lifetime Income ₹"].map((h, i) => (
                      <th key={i} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((job, idx) => {
                    const ss        = statusStyle(job.device?.mobileStatus);
                    const rebills   = job.rebillHistory?.length || 0;
                    const histIncome = job.rebillHistory?.reduce((s, r) => s + Number(r.income || 0), 0) || 0;
                    const currIncome = Number(job.service?.income || 0);
                    const allTimeIncome = histIncome + currIncome;
                    const isExpanded = expandedId === job._id;

                    // ✅ NEW — full current-cycle + lifetime-returned breakdown for this job
                    const spareBaseline    = Number(job.service?.spareBaseline    || 0);
                    const rawSpareBaseline = Number(job.service?.rawSpareBaseline || 0);
                    const othersBaseline   = Number(job.service?.othersBaseline   || 0);
                    const advanceBaseline  = Number(job.service?.advanceBaseline  || 0);

                    const spareCycle    = getCycleTotals(job.spareItems,    spareBaseline);
                    const rawSpareCycle = getCycleTotals(job.rawSpareItems, rawSpareBaseline);

                    const currentCycleOthers  = Math.max(0, Number(job.service?.othersAmount  || 0) - othersBaseline);
                    const currentCycleAdvance = Math.max(0, Number(job.service?.advanceAmount || 0) - advanceBaseline);

                    const spareReturnedLifetime    = getLifetimeReturned(job.spareItems);
                    const rawSpareReturnedLifetime = getLifetimeReturned(job.rawSpareItems);
                    const hasAnyReturns = spareReturnedLifetime > 0 || rawSpareReturnedLifetime > 0;

                    return (
                      <React.Fragment key={job._id}>
                        {/* MAIN ROW */}
                        <tr className="rb-row"
                          style={{ background: isExpanded ? "#f0f9ff" : idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}
                          onClick={() => setExpandedId(isExpanded ? null : job._id)}>
                          <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{idx + 1}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ color: "#2563eb", fontWeight: 700 }}>{job.jobSheetNo}</span>
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>{job.customer?.name || "-"}</td>
                          <td style={{ padding: "10px 12px", color: "#475569" }}>{job.customer?.contact || "-"}</td>
                          <td style={{ padding: "10px 12px", color: "#64748b" }}>{job.device?.make} {job.device?.model}</td>
                          <td style={{ padding: "10px 12px", color: "#475569", fontWeight: 600 }}>{job.service?.serviceRep || "-"}</td>
                          <td style={{ padding: "10px 12px", color: "#475569" }}>{job.service?.engineer || "-"}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ background: ss.bg, color: ss.color, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>
                              {job.device?.mobileStatus || "-"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 800, padding: "2px 9px", borderRadius: 20 }}>
                              🔄 ×{rebills}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>{fmtCurrency(currIncome)}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: Number(job.service?.balance || 0) > 0 ? "#dc2626" : "#0f172a" }}>
                            {fmtCurrency(job.service?.balance)}
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: "#6366f1" }}>{fmtCurrency(allTimeIncome)}</td>
                        </tr>

                        {/* EXPANDED — FULL REBILL BREAKDOWN */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={12} style={{ padding: "0 12px 12px 48px", background: "#f0f9ff" }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 8, marginTop: 8 }}>
                                📋 Full breakdown for {job.jobSheetNo} — Income / Balance / Service / Spare / Raw Spare / Others / Advance for every cycle
                              </div>

                              {/* ✅ NEW — lifetime returned summary (return history isn't stored
                                  per past cycle, only the aggregate up to now, so this is shown
                                  once for the whole job rather than repeated per cycle) */}
                              {hasAnyReturns && (
                                <div style={{
                                  background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
                                  padding: "8px 14px", marginBottom: 8, display: "flex", gap: 16, flexWrap: "wrap",
                                  fontSize: 12, color: "#991b1b", fontWeight: 600,
                                }}>
                                  <span>↩ Returned so far (lifetime, all cycles):</span>
                                  {spareReturnedLifetime > 0 && <span>Spare: {fmtCurrency(spareReturnedLifetime)}</span>}
                                  {rawSpareReturnedLifetime > 0 && <span>Raw Spare: {fmtCurrency(rawSpareReturnedLifetime)}</span>}
                                </div>
                              )}

                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {job.rebillHistory.map((rb, ri) => (
                                  <div key={ri} style={{
                                    background: "#fff", border: "1px solid #bfdbfe", borderRadius: 8,
                                    padding: "10px 14px", display: "flex", flexWrap: "wrap",
                                    justifyContent: "space-between", gap: 10,
                                  }}>
                                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                                      <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}>
                                        Before Rebill #{ri + 1}
                                      </span>
                                      <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>
                                        {fmtDate(rb.rebilledAt)}
                                      </span>
                                      <span style={{ color: "#0f172a", fontSize: 12, fontWeight: 700 }}>
                                        Income: {fmtCurrency(rb.income)}
                                      </span>
                                      <span style={{ color: "#dc2626", fontSize: 12 }}>
                                        Balance: <b>{fmtCurrency(rb.balance)}</b>
                                      </span>
                                      <span style={{ color: "#475569", fontSize: 12 }}>
                                        Service: <b style={{ color: "#0f172a" }}>{fmtCurrency(rb.serviceCharge)}</b>
                                      </span>
                                      <span style={{ color: "#475569", fontSize: 12 }}>
                                        Spare: <b style={{ color: "#0f172a" }}>{fmtCurrency(rb.spareCharge)}</b>
                                      </span>
                                      <span style={{ color: "#B45309", fontSize: 12 }}>
                                        Raw Spare: <b>{fmtCurrency(rb.rawSpareCharge)}</b>
                                      </span>
                                      <span style={{ color: "#475569", fontSize: 12 }}>
                                        Others: <b style={{ color: "#0f172a" }}>{fmtCurrency(rb.othersAmount)}</b>
                                      </span>
                                      <span style={{ color: "#0369A1", fontSize: 12 }}>
                                        Advance: <b>{fmtCurrency(rb.advanceAmount)}</b>
                                      </span>
                                      {rb.paymentMode && (
                                        <span style={{ color: "#64748b", fontSize: 11 }}>💳 {rb.paymentMode}</span>
                                      )}
                                      {rb.status && (
                                        <span style={{ background: statusStyle(rb.status).bg, color: statusStyle(rb.status).color, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12 }}>
                                          {rb.status}
                                        </span>
                                      )}
                                      {rb.remarks && (
                                        <span style={{ color: "#94a3b8", fontSize: 11, fontStyle: "italic" }}>
                                          "{rb.remarks}"
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                      <span style={{ fontSize: 11, color: "#64748b" }}>by <b>{rb.rebilledBy}</b></span>
                                    </div>
                                  </div>
                                ))}

                                {/* Current (active, after the latest rebill) cycle */}
                                <div style={{
                                  background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8,
                                  padding: "10px 14px", display: "flex", flexWrap: "wrap",
                                  justifyContent: "space-between", gap: 10,
                                }}>
                                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                                    <span style={{ background: "#d1fae5", color: "#065f46", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}>
                                      Current (After Rebill #{job.rebillHistory.length})
                                    </span>
                                    <span style={{ color: "#0f172a", fontSize: 12, fontWeight: 700 }}>
                                      Income: {fmtCurrency(job.service?.income)}
                                    </span>
                                    <span style={{ color: "#dc2626", fontSize: 12 }}>
                                      Balance: <b>{fmtCurrency(job.service?.balance)}</b>
                                    </span>
                                    <span style={{ color: "#475569", fontSize: 12 }}>
                                      Service: <b style={{ color: "#0f172a" }}>{fmtCurrency(job.service?.serviceCharge)}</b>
                                    </span>
                                    <span style={{ color: "#475569", fontSize: 12 }}>
                                      Spare: <b style={{ color: "#0f172a" }}>{fmtCurrency(spareCycle.activeTotal)}</b>
                                    </span>
                                    <span style={{ color: "#B45309", fontSize: 12 }}>
                                      Raw Spare: <b>{fmtCurrency(rawSpareCycle.activeTotal)}</b>
                                    </span>
                                    <span style={{ color: "#475569", fontSize: 12 }}>
                                      Others: <b style={{ color: "#0f172a" }}>{fmtCurrency(currentCycleOthers)}</b>
                                    </span>
                                    <span style={{ color: "#0369A1", fontSize: 12 }}>
                                      Advance: <b>{fmtCurrency(currentCycleAdvance)}</b>
                                    </span>
                                    {job.service?.paymentMode && (
                                      <span style={{ color: "#64748b", fontSize: 11 }}>💳 {job.service.paymentMode}</span>
                                    )}
                                    {(spareCycle.returnedTotal > 0 || rawSpareCycle.returnedTotal > 0) && (
                                      <span style={{ color: "#991B1B", fontSize: 12 }}>
                                        ↩ Returned (this cycle): <b>{fmtCurrency(spareCycle.returnedTotal + rawSpareCycle.returnedTotal)}</b>
                                      </span>
                                    )}
                                    {job.device?.mobileStatus && (
                                      <span style={{ background: statusStyle(job.device.mobileStatus).bg, color: statusStyle(job.device.mobileStatus).color, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12 }}>
                                        {job.device.mobileStatus}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={e => { e.stopPropagation(); navigate(`/jobsheet/${job._id}`); }}
                                    style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                    Open →
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default RebillReportPage;