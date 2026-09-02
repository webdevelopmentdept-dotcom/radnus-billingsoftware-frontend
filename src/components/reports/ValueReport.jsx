import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FileText, Wallet, Wrench, Cog, IndianRupee,
  Package, HandCoins, Scale, Printer, Download,
  Calendar, RotateCcw,
} from "lucide-react";
const ValueReport = () => {
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState([]);
 const [loading, setLoading] = useState(false);
  const [highlightKey, setHighlightKey] = useState(null);
  const [pendingJump, setPendingJump] = useState(null); 

 const jumpToEntry = (jobSheetNo, date, type) => {
    if (!date) return;
    const id = `entry-${jobSheetNo}-${date}-${type}`;

    // Already visible-ah irundha direct-ah scroll pannidalam
    const el = document.getElementById(id);
    if (el) {
      scrollAndHighlight(id);
      return;
    }

    // Illana — date filter range-ah expand pannunga, andha date cover aaganum
    let newFrom = fromDate;
    let newTo = toDate;
    if (fromDate && date < fromDate) newFrom = date;
    if (toDate && date > toDate) newTo = date;

    if (newFrom !== fromDate) setFromDate(newFrom);
    if (newTo !== toDate) setToDate(newTo);

    // Filter maarina pinnadi table re-render aagum, appuram jump pannanum
    setPendingJump(id);
  };
const scrollAndHighlight = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightKey(id);
      setTimeout(() => setHighlightKey(null), 2000);
    }
  };

  const extractDateFromKey = (key) => {
    if (!key) return null;
    const match = key.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  };

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => { fetchReport(); }, []);
useEffect(() => {
    if (!pendingJump) return;
    // filter state update aagi, table re-render aaganum ku konjam wait pannunga
    const t1 = requestAnimationFrame(() => {
      const t2 = requestAnimationFrame(() => {
        scrollAndHighlight(pendingJump);
        setPendingJump(null);
      });
      return () => cancelAnimationFrame(t2);
    });
    return () => cancelAnimationFrame(t1);
  }, [pendingJump, fromDate, toDate, data]);
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

  // ✅ Clear filter — dates clear + reload
  const handleClearFilter = () => {
    setFromDate("");
    setToDate("");
    fetchReport();
  };




const buildRows = (jobsheets) => {
    const rows = [];

    jobsheets.forEach((item) => {
      const name         = item.customer?.name || "";
      const jobSheetNo   = item.jobSheetNo || "";
      const repairDate   = item.service?.repairDate?.slice(0, 10) || "";
      const deliveryDate = item.service?.deliveryDate?.slice(0, 10) || "-";

      const revenueEntries = item.service?.revenueEntries || [];
      const advanceItems   = item.service?.advanceItems || [];
      const spareItemsArr  = item.spareItems || [];
      const othersItemsArr = item.service?.othersItems || [];

      const dateBucket = {};
      const addToBucket = (date, field, amount) => {
        if (!amount || amount <= 0) return;
        const d = date || repairDate;
        if (!dateBucket[d]) dateBucket[d] = { service: 0, spare: 0, income: 0, others: 0 };
        dateBucket[d][field] += amount;
      };

      if (revenueEntries.length > 0) {
        revenueEntries.forEach((entry) => {
          const d = entry.date ? new Date(entry.date).toISOString().slice(0, 10) : repairDate;
          addToBucket(d, "service", Number(entry.service || 0));
          addToBucket(d, "income",  Number(entry.income  || 0));
        });
      } else {
        addToBucket(repairDate, "service", Number(item.service?.serviceCharge || 0));
        addToBucket(repairDate, "income",  Number(item.service?.income        || 0));
      }

      if (spareItemsArr.length > 0) {
        spareItemsArr.forEach((si) => {
          const d = si.date ? new Date(si.date).toISOString().slice(0, 10) : repairDate;
          addToBucket(d, "spare", Number(si.amount || 0));
        });
      } else {
        addToBucket(repairDate, "spare", Number(item.service?.spareCharge || 0));
      }

      if (othersItemsArr.length > 0) {
        othersItemsArr.forEach((oi) => {
          const d = oi.date ? new Date(oi.date).toISOString().slice(0, 10) : repairDate;
          addToBucket(d, "others", Number(oi.amount || 0));
        });
      } else {
        addToBucket(repairDate, "others", Number(item.service?.othersAmount || 0));
      }

      const dateRows = Object.keys(dateBucket).map((d) => {
        const b = dateBucket[d];
        return { date: d, ...b, rowTotal: b.service + b.spare + b.income + b.others };
      }).filter((r) => r.rowTotal > 0);

      // ✅ FIX: Service ₹ already IS the collected/labour value for that transaction —
      // Income ₹ is just the same money re-shown as the "total collected" figure
      // (income = service + spare + others, set by the auto-calc on JobSheetPage).
      // Adding service + income here was double-counting the same rupee twice.
      // Only "service" should feed into the balanceable/collected & pending-balance total.
      const balanceableTotal = dateRows.reduce((s, r) => s + r.service, 0);
      const jobTotal = dateRows.reduce((s, r) => s + r.rowTotal, 0);

      // ── Advance events ──
      let advanceEvents = [];
      if (advanceItems.length > 0) {
        advanceItems.forEach((adv) => {
          const advDate = adv.date ? new Date(adv.date).toISOString().slice(0, 10) : repairDate;
          const advAmt = Number(adv.amount || 0);
          if (advAmt > 0) advanceEvents.push({ date: advDate, amount: advAmt, label: adv.label || "-" });
        });
      } else {
        const advAmt  = Number(item.service?.advanceAmount || 0);
        const advDate = item.service?.advanceDate
          ? new Date(item.service.advanceDate).toISOString().slice(0, 10)
          : repairDate;
        if (advAmt > 0) advanceEvents.push({ date: advDate, amount: advAmt, label: "-" });
      }

      const totalAdvancePaid = advanceEvents.reduce((s, a) => s + a.amount, 0);
      const hasAdvance = totalAdvancePaid > 0;

      // ── ELLAM SERTHU oru single chronological timeline (date order-la) ──
      const events = [
        ...dateRows.map((r) => ({ ...r, kind: "charge" })),
        ...advanceEvents.map((a) => ({ ...a, kind: "advance" })),
      ].sort((a, b) => a.date.localeCompare(b.date));

   // ── Timeline walk pannunga — ovvoru event-kum, ADHUKKU MUNNADI cumulative + source-date track pannunga ──
      let cumService = 0, cumSpare = 0, cumIncome = 0, cumOthers = 0, cumAdvance = 0;
      let srcServiceKey = null, srcSpareKey = null, srcIncomeKey = null, srcOthersKey = null, srcAdvanceKey = null;

      events.forEach((e) => {
        const priorService = cumService, priorSpare = cumSpare, priorIncome = cumIncome,
              priorOthers  = cumOthers,  priorAdvance = cumAdvance;
        const priorServiceKey = srcServiceKey, priorSpareKey = srcSpareKey,
              priorIncomeKey  = srcIncomeKey,  priorOthersKey = srcOthersKey,
              priorAdvanceKey = srcAdvanceKey;

        if (e.kind === "charge") {
          const rowKey = `entry-${jobSheetNo}-${e.date}-service`;   // ✅ exact ID stored here
          // ✅ FIX: was `e.service + e.income` (double-counted the same collected amount).
          // "service" alone is the correct collectible value for this transaction.
          const balanceablePart = e.service;
          const immediatePart   = e.spare + e.others;
      rows.push({
            date: e.date, jobSheetNo, name,
            type: "service", label: "-",
            service: e.service, spare: e.spare, income: e.income, others: e.others,
            advance: 0,
            collected: immediatePart + (hasAdvance ? 0 : balanceablePart),
            balance: null,
            jobTotal, hasAdvance, hideRow: false,
            rowTotal: e.rowTotal, repairDate, deliveryDate,
            priorService, priorSpare, priorIncome, priorOthers, priorAdvance,
            priorServiceKey, priorSpareKey, priorIncomeKey, priorOthersKey, priorAdvanceKey,
            priorServiceDate: extractDateFromKey(priorServiceKey),
            priorSpareDate:   extractDateFromKey(priorSpareKey),
            priorIncomeDate:  extractDateFromKey(priorIncomeKey),
            priorOthersDate:  extractDateFromKey(priorOthersKey),
            priorAdvanceDate: extractDateFromKey(priorAdvanceKey),
          });
          cumService += e.service; cumSpare += e.spare; cumIncome += e.income; cumOthers += e.others;
          if (e.service > 0) srcServiceKey = rowKey;
          if (e.spare   > 0) srcSpareKey   = rowKey;
          if (e.income  > 0) srcIncomeKey  = rowKey;
          if (e.others  > 0) srcOthersKey  = rowKey;
        } else {
          const rowKey = `entry-${jobSheetNo}-${e.date}-advance`;   // ✅ exact ID stored here
          cumAdvance += e.amount;
          srcAdvanceKey = rowKey;
          const remainingBalance = Math.max(0, balanceableTotal - cumAdvance);
          rows.push({
            date: e.date, jobSheetNo, name,
            type: "advance", label: e.label,
            service: 0, spare: 0, income: 0, others: 0,
            advance: e.amount, collected: e.amount,
            balance: remainingBalance,
            jobTotal, hasAdvance: true, hideRow: false,
            rowTotal: e.amount, repairDate, deliveryDate,
            priorService, priorSpare, priorIncome, priorOthers, priorAdvance,
            priorServiceKey, priorSpareKey, priorIncomeKey, priorOthersKey, priorAdvanceKey,
            priorServiceDate: extractDateFromKey(priorServiceKey),
            priorSpareDate:   extractDateFromKey(priorSpareKey),
            priorIncomeDate:  extractDateFromKey(priorIncomeKey),
            priorOthersDate:  extractDateFromKey(priorOthersKey),
            priorAdvanceDate: extractDateFromKey(priorAdvanceKey),
          });
        }
      });
    });

    return rows;
  };
  /* ================= FILTER ================= */
  const getFilteredRows = () => {
    const rows = buildRows(data);
    const visible = rows.filter(r => !r.hideRow);
    if (!fromDate && !toDate) return visible;
    return visible.filter((row) => {
      const d = row.date;
      if (!d) return false;
      if (fromDate && toDate) return d >= fromDate && d <= toDate;
      if (fromDate) return d >= fromDate;
      if (toDate)   return d <= toDate;
      return true;
    });
  };

  /* ================= GROUP BY DATE ================= */
  const groupByDate = (rows) => {
    const grouped = {};
    rows.forEach((row) => {
      const d = row.date || "Unknown";
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(row);
    });
    const sorted = {};
    Object.keys(grouped).sort((a, b) => b.localeCompare(a))
      .forEach((k) => (sorted[k] = grouped[k]));
    return sorted;
  };

  const allRows     = getFilteredRows();
  const groupedData = groupByDate(allRows);
const grandService   = allRows.reduce((s, r) => s + r.service,          0);
const grandSpare     = allRows.reduce((s, r) => s + r.spare,            0);
const grandIncome    = allRows.reduce((s, r) => s + (r.income || 0),    0);
const grandOthers    = allRows.reduce((s, r) => s + (r.others || 0),    0);
const grandAdvance   = allRows.reduce((s, r) => s + r.advance,          0);
const grandCollected = allRows.reduce((s, r) => s + (r.collected || 0), 0);
const grandPending   = allRows.reduce((s, r) => s + (r.balance ?? 0),   0);

  /* ================= EXCEL DOWNLOAD ================= */
  const handleExcelDownload = () => {
    const excelRows = [];

    Object.keys(groupedData).forEach((date) => {
      const rows = groupedData[date];

      // Date header row
    excelRows.push({
  "Date": `📅 ${date}`,
  "Job No": "", "Type": "", "Label": "", "Name": "",
  "Repair Date": "", "Txn Date": "", "Delivery Date": "",
  "Service ₹": "", "Spare ₹": "", "Income ₹": "", "Others ₹": "", "Advance ₹": "",
  "Collected ₹": "", "Balance ₹": "",
});

      // Data rows
      rows.forEach((row) => {
        const balText = row.balance === null ? "-"
          : row.balance === 0 ? "Paid"
          : row.balance.toFixed(2);

      excelRows.push({
  "Date": date,
  "Job No": row.jobSheetNo,
  "Type": row.type === "advance" ? "Advance" : "Service",
  "Label": row.label,
  "Name": row.name,
  "Repair Date": row.repairDate || "-",
  "Txn Date": row.date,
  "Delivery Date": row.deliveryDate,
  "Service ₹": row.type === "advance"
    ? (row.serviceRef > 0 ? `(${row.serviceRef})` : "-")
    : (row.service > 0 ? row.service.toFixed(2) : "-"),
  "Spare ₹": row.spare > 0 ? row.spare.toFixed(2) : "-",
  "Income ₹": row.type === "advance"
    ? (row.incomeRef > 0 ? `(${row.incomeRef})` : "-")
    : (row.income > 0 ? row.income.toFixed(2) : "-"),
  "Others ₹": row.type === "advance"
    ? (row.othersRef > 0 ? `(${row.othersRef})` : "-")
    : (row.others > 0 ? row.others.toFixed(2) : "-"),
  "Advance ₹": row.advance > 0 ? row.advance.toFixed(2) : "-",
  "Collected ₹": (row.collected || 0) > 0 ? row.collected.toFixed(2) : "-",
  "Balance ₹": balText,
});
      });

  const subService   = rows.reduce((s, r) => s + r.service,          0);
const subSpare     = rows.reduce((s, r) => s + r.spare,            0);
const subIncome    = rows.reduce((s, r) => s + (r.income || 0),    0);
const subOthers    = rows.reduce((s, r) => s + (r.others || 0),    0);
const subAdvance   = rows.reduce((s, r) => s + r.advance,          0);
const subCollected = rows.reduce((s, r) => s + (r.collected || 0), 0);
const subBalance   = rows.reduce((s, r) => s + (r.balance ?? 0),   0);
excelRows.push({
  "Date": "", "Job No": "", "Type": "", "Label": "", "Name": "",
  "Repair Date": "", "Txn Date": "", "Delivery Date": `Sub Total (${date})`,
  "Service ₹": subService.toFixed(2),
  "Spare ₹": subSpare.toFixed(2),
  "Income ₹": subIncome.toFixed(2),
  "Others ₹": subOthers.toFixed(2),
  "Advance ₹": subAdvance.toFixed(2),
  "Collected ₹": subCollected.toFixed(2),
  "Balance ₹": subBalance === 0 ? "-" : subBalance.toFixed(2),
});

// Blank separator
excelRows.push({
  "Date": "", "Job No": "", "Type": "", "Label": "", "Name": "",
  "Repair Date": "", "Txn Date": "", "Delivery Date": "",
  "Service ₹": "", "Spare ₹": "", "Income ₹": "", "Others ₹": "", "Advance ₹": "",
  "Collected ₹": "", "Balance ₹": "",
});
});

// GRAND TOTAL — once, after all dates
excelRows.push({
  "Date": "", "Job No": "", "Type": "", "Label": "", "Name": "",
  "Repair Date": "", "Txn Date": "", "Delivery Date": "GRAND TOTAL",
  "Service ₹": grandService.toFixed(2),
  "Spare ₹": grandSpare.toFixed(2),
  "Income ₹": grandIncome.toFixed(2),
  "Others ₹": grandOthers.toFixed(2),
  "Advance ₹": grandAdvance.toFixed(2),
  "Collected ₹": grandCollected.toFixed(2),
  "Balance ₹": grandPending === 0 ? "-" : grandPending.toFixed(2),
});

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Value Report");

    const fileName = `ValueReport_${fromDate || "All"}_to_${toDate || "All"}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  /* ================= BALANCE CELL ================= */
  const renderBalance = (balance) => {
    if (balance === null) return { text: "-", color: "#94a3b8", bg: "transparent" };
    if (balance === 0)    return { text: "✅ Paid", color: "#15803d", bg: "#f0fdf4" };
    return { text: `₹ ${balance.toFixed(2)}`, color: "#be123c", bg: "#fff1f2" };
  };

  const handlePrint = () => window.print();

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "24px" }}>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1e293b", margin: 0 }}>
          📊 Value Report
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
          Service, spare &amp; advance — each transaction shown on its own date
        </p>
      </div>

      {/* ACTION BAR */}
      <div className="print-hidden" style={{
        background: "#fff", borderRadius: 10, padding: "14px 18px",
        marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 10,
        alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>FROM</label>
          <input type="date"
            style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", fontSize: 13 }}
            value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>TO</label>
          <input type="date"
            style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", fontSize: 13 }}
            value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <button onClick={fetchReport} disabled={loading} style={{
          background: "#2563eb", color: "#fff", border: "none",
          borderRadius: 7, padding: "7px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>
          {loading ? "Loading..." : "Load Report"}
        </button>

        {/* ✅ Clear Filter — dates clear + full reload */}
        <button onClick={handleClearFilter} style={{
          background: "#64748b", color: "#fff", border: "none",
          borderRadius: 7, padding: "7px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>
          Clear Filter
        </button>

        <button onClick={handlePrint} style={{
          background: "#16a34a", color: "#fff", border: "none",
          borderRadius: 7, padding: "7px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>
          🖨️ Print 
        </button>

        {/* ✅ Excel Download button */}
        <button onClick={handleExcelDownload} style={{
          background: "#15803d", color: "#fff", border: "none",
          borderRadius: 7, padding: "7px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>
          📥 Excel Download
        </button>

      {/* SUMMARY CHIPS */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "#eff6ff", color: "#1d4ed8", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
            <FileText size={13} /> {allRows.filter(r => r.type === "service").length} Jobs
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "#f0fdf4", color: "#15803d", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
            <Wallet size={13} /> Collected ₹{grandCollected.toFixed(2)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "#fef9c3", color: "#854d0e", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
            <Wrench size={13} /> Service ₹{grandService.toFixed(2)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "#f3e8ff", color: "#7e22ce", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
            <Cog size={13} /> Spare ₹{grandSpare.toFixed(2)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "#ecfeff", color: "#0e7490", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
            <IndianRupee size={13} /> Income ₹{grandIncome.toFixed(2)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff7ed", color: "#c2410c", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
            <Package size={13} /> Others ₹{grandOthers.toFixed(2)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "#f0fdf4", color: "#166534", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
            <HandCoins size={13} /> Advance ₹{grandAdvance.toFixed(2)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: grandPending > 0 ? "#fff1f2" : "#f0fdf4", color: grandPending > 0 ? "#be123c" : "#15803d", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
            <Scale size={13} /> Pending ₹{grandPending.toFixed(2)}
          </span>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 18px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
        }}>
          <span style={{ fontWeight: 700, color: "#334155", fontSize: 14 }}>
            {allRows.filter(r => r.type === "service").length} jobs &nbsp;|&nbsp;
            {allRows.filter(r => r.type === "advance").length} advance entries
          </span>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            {fromDate || toDate ? `${fromDate || "All"} → ${toDate || "All"}` : "All Dates"}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>⏳ Loading...</div>
        ) : allRows.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>No records found.</div>
        ) : (
          <div style={{ overflowX: "auto", maxHeight: 560 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#1e293b", color: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
                  <th style={th}>Job No</th>
                  <th style={th}>Type</th>
                  <th style={th}>Label</th>
                  <th style={th}>Name</th>
                  <th style={th}>Repair Date</th>
                  <th style={th}>Txn Date</th>
                  <th style={th}>Delivery Date</th>
                <th style={{ ...th, textAlign: "right" }}>Service ₹</th>
<th style={{ ...th, textAlign: "right" }}>Spare ₹</th>
<th style={{ ...th, textAlign: "right" }}>Income ₹</th>
<th style={{ ...th, textAlign: "right" }}>Others ₹</th>
<th style={{ ...th, textAlign: "right" }}>Advance ₹</th>
                  <th style={{ ...th, textAlign: "right" }}>Collected ₹</th>
                  <th style={{ ...th, textAlign: "right", background: "#be123c" }}>Balance ₹</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(groupedData).map((date, gIdx) => {
              const rows         = groupedData[date];
const subService   = rows.reduce((s, r) => s + r.service,          0);
const subSpare     = rows.reduce((s, r) => s + r.spare,            0);
const subIncome    = rows.reduce((s, r) => s + (r.income || 0),    0);
const subOthers    = rows.reduce((s, r) => s + (r.others || 0),    0);
const subAdvance   = rows.reduce((s, r) => s + r.advance,          0);
const subCollected = rows.reduce((s, r) => s + (r.collected || 0), 0);
const subBalance   = rows.reduce((s, r) => s + (r.balance ?? 0),   0);

                  return (
                    <React.Fragment key={gIdx}>
                      <tr>
                       <td colSpan={14} style={{
  padding: "7px 14px", background: "#dbeafe", color: "#1e40af",
                          fontWeight: 700, fontSize: 12,
                          borderTop: "2px solid #93c5fd", borderBottom: "1px solid #bfdbfe",
                        }}>
                          📅 {date}
                        </td>
                      </tr>

                      {rows.map((row, rIdx) => {
                        const bal = renderBalance(row.balance);
                        return (
                         <tr key={rIdx}
                            id={`entry-${row.jobSheetNo}-${row.date}-${row.type}`}
                            style={{
                            background: highlightKey === `entry-${row.jobSheetNo}-${row.date}-${row.type}`
                              ? "#fef08a"
                              : row.type === "advance"
                              ? rIdx % 2 === 0 ? "#f0fdf4" : "#dcfce7"
                              : rIdx % 2 === 0 ? "#fff" : "#f8fafc",
                            borderBottom: "1px solid #f1f5f9",
                            transition: "background 0.3s",
                          }}>
                            <td style={td}>{row.jobSheetNo}</td>
                            <td style={td}>
                              {row.type === "advance" ? (
                                <span style={{ background: "#bbf7d0", color: "#14532d", borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                                  💰 Advance
                                </span>
                              ) : (
                                <span style={{ background: "#dbeafe", color: "#1e3a8a", borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                                  🔧 Service
                                </span>
                              )}
                            </td>
                            <td style={{ ...td, color: "#64748b", fontSize: 12 }}>{row.label}</td>
      <td style={td}>{row.name}</td>
                            <td style={td}>{row.repairDate || "-"}</td>
                            <td style={{ ...td, fontWeight: 600, color: "#0f172a" }}>{row.date}</td>
                            <td style={td}>{row.deliveryDate}</td>
                            <td style={{ ...td, textAlign: "right" }}>
                              {row.service > 0 ? `₹ ${row.service.toFixed(2)}` : "-"}
                            {row.priorService > 0 && (
                                <div
                                  style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, cursor: "pointer", textDecoration: "underline" }}
                                  onClick={() => jumpToEntry(row.jobSheetNo, row.priorServiceDate, "service")}
                                >
                                  Already ₹{row.priorService}
                                </div>
                              )}
                            </td>
                          <td style={{ ...td, textAlign: "right" }}>
  {row.spare > 0 ? `₹ ${row.spare.toFixed(2)}` : "-"}
 {row.priorSpare > 0 && (
  <div
    style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, cursor: "pointer", textDecoration: "underline" }}
    onClick={() => jumpToEntry(row.jobSheetNo, row.priorSpareDate, "service")}
  >
    Already ₹{row.priorSpare}
  </div>
)}
</td>
<td style={{ ...td, textAlign: "right" }}>
  {row.income > 0 ? `₹ ${row.income.toFixed(2)}` : "-"}
{row.priorIncome > 0 && (
  <div
    style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, cursor: "pointer", textDecoration: "underline" }}
    onClick={() => jumpToEntry(row.jobSheetNo, row.priorIncomeDate, "service")}
  >
    Already ₹{row.priorIncome}
  </div>
)}
</td>
<td style={{ ...td, textAlign: "right" }}>
  {row.others > 0 ? `₹ ${row.others.toFixed(2)}` : "-"}
{row.priorOthers > 0 && (
  <div
    style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, cursor: "pointer", textDecoration: "underline" }}
    onClick={() => jumpToEntry(row.jobSheetNo, row.priorOthersDate, "service")}
  >
    Already ₹{row.priorOthers}
  </div>
)}
</td>
<td style={{ ...td, textAlign: "right", color: "#15803d", fontWeight: 600 }}>
  {row.advance > 0 ? `₹ ${row.advance.toFixed(2)}` : "-"}
{row.priorAdvance > 0 && (
  <div
    style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, cursor: "pointer", textDecoration: "underline" }}
    onClick={() => jumpToEntry(row.jobSheetNo, row.priorAdvanceDate, "advance")}
  >
    Already ₹{row.priorAdvance}
  </div>
)}
</td>
                            <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "#15803d" }}>
                              {(row.collected || 0) > 0 ? `₹ ${row.collected.toFixed(2)}` : "-"}
                            </td>
                            <td style={{ ...td, textAlign: "right", fontWeight: 700, color: bal.color, background: bal.bg }}>
                              {bal.text}
                            </td>
                          </tr>
                        );
                      })}

                      {/* SUB TOTAL */}
                    <tr style={{ background: "#f1f5f9", fontWeight: 700 }}>
  <td colSpan={7} style={{ ...td, textAlign: "right", color: "#475569" }}>
    Sub Total ({date})
  </td>
  <td style={{ ...td, textAlign: "right" }}>₹ {subService.toFixed(2)}</td>
  <td style={{ ...td, textAlign: "right" }}>₹ {subSpare.toFixed(2)}</td>
  <td style={{ ...td, textAlign: "right" }}>₹ {subIncome.toFixed(2)}</td>
  <td style={{ ...td, textAlign: "right" }}>₹ {subOthers.toFixed(2)}</td>
  <td style={{ ...td, textAlign: "right", color: "#15803d" }}>₹ {subAdvance.toFixed(2)}</td>
  <td style={{ ...td, textAlign: "right", color: "#15803d" }}>₹ {subCollected.toFixed(2)}</td>
  <td style={{
    ...td, textAlign: "right",
    color: subBalance > 0 ? "#be123c" : "#64748b",
    background: subBalance > 0 ? "#fff1f2" : "transparent",
  }}>
    {subBalance === 0 ? "-" : `₹ ${subBalance.toFixed(2)}`}
  </td>
</tr>
                    </React.Fragment>
                  );
                })}

                {/* GRAND TOTAL */}
             <tr style={{ background: "#1e293b", color: "#fff", fontWeight: 800, fontSize: 14 }}>
  <td colSpan={7} style={{ ...td, textAlign: "right", color: "#fff", borderTop: "2px solid #334155" }}>
    GRAND TOTAL
  </td>
  <td style={{ ...td, textAlign: "right", color: "#fde68a", borderTop: "2px solid #334155" }}>
    ₹ {grandService.toFixed(2)}
  </td>
  <td style={{ ...td, textAlign: "right", color: "#c4b5fd", borderTop: "2px solid #334155" }}>
    ₹ {grandSpare.toFixed(2)}
  </td>
  <td style={{ ...td, textAlign: "right", color: "#fbcfe8", borderTop: "2px solid #334155" }}>
    ₹ {grandIncome.toFixed(2)}
  </td>
  <td style={{ ...td, textAlign: "right", color: "#fed7aa", borderTop: "2px solid #334155" }}>
    ₹ {grandOthers.toFixed(2)}
  </td>
  <td style={{ ...td, textAlign: "right", color: "#86efac", borderTop: "2px solid #334155" }}>
    ₹ {grandAdvance.toFixed(2)}
  </td>
  <td style={{ ...td, textAlign: "right", color: "#86efac", borderTop: "2px solid #334155" }}>
    ₹ {grandCollected.toFixed(2)}
  </td>
  <td style={{ ...td, textAlign: "right", borderTop: "2px solid #334155", background: grandPending > 0 ? "#be123c" : "#166534", color: "#fff" }}>
    {grandPending === 0 ? "-" : `₹ ${grandPending.toFixed(2)}`}
  </td>
</tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .print-hidden { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
};

const th = {
  padding: "10px 12px", textAlign: "left", fontWeight: 700,
  fontSize: 12, whiteSpace: "nowrap", borderRight: "1px solid #334155",
};

const td = {
  padding: "8px 12px", fontSize: 13,
  whiteSpace: "nowrap", borderRight: "1px solid #e2e8f0",
};

export default ValueReport;