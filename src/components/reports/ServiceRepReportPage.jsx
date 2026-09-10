import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FaUserTie, FaUser, FaWrench, FaCogs, FaRupeeSign, FaBoxOpen,
  FaHandHoldingUsd, FaCoins, FaInstagram, FaStar, FaTable,
  FaChartBar, FaSearch, FaTimes, FaFileExcel, FaCalendarAlt,
  FaChevronLeft, FaChevronRight, FaArrowsAltH,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_URL;

const fmt = (n) => n ? "₹" + Number(n).toLocaleString("en-IN") : "₹0";

/* ================= LIFETIME TOTAL HELPERS (FIX) =================
   🔴 BUG — Service ₹ / Income ₹ columns were reading the raw top-level
   `service.serviceCharge` / `service.income` fields. Those fields get RESET
   TO 0 every time a job is rebilled (see backend's /rebill route), and the
   user re-enters fresh charges for the new cycle only. So once a job had
   been rebilled even once, this report only ever showed the CURRENT
   cycle's amount — the pre-rebill amount silently vanished from every
   total, subtotal, and grand total on this page.

   ✅ FIX — same lifetime-total + dedup approach already used in
   ValueReport.jsx / ServiceReportPage.jsx / IncomeReportPage.jsx:
   - revenueEntries (pushed by the backend's updateJobSheet controller on
     every Income/Service change, across every cycle) is the primary,
     date-wise ledger — sum it when present.
   - rebillHistory is only used as a FALLBACK for cycles revenueEntries
     never tracked (e.g. a job invoiced without ever going through a normal
     Update first) — added via getUncoveredRebillEntries's cycle-window
     dedup check, so a cycle already covered by revenueEntries is never
     double-counted.
   Spare ₹ is NOT touched — spareCharge is already cumulative by design
   (spareItems array persists across every rebill). Advance ₹ is also not
   reset by rebill, so it's already lifetime-accurate as-is.
   Others ₹ now sums othersItems (the per-expense list) when present, same
   idea as Spare — othersItems isn't cleared by rebill either, only the
   top-level othersAmount summary field is. */

const getUncoveredRebillEntries = (job) => {
  const entries = job.service?.revenueEntries || [];
  const rebillHistoryArr = job.rebillHistory || [];
  if (rebillHistoryArr.length === 0) return [];

  const sorted = [...rebillHistoryArr].sort(
    (a, b) => new Date(a.rebilledAt || 0) - new Date(b.rebilledAt || 0)
  );

  const uncovered = [];
  let cycleStart = null; // no lower bound for the very first cycle

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

const getServiceTotal = (job) => {
  const entries = job.service?.revenueEntries || [];
  const fromEntries = entries.reduce((s, e) => s + Number(e.service || 0), 0);
  const fromRebills = getUncoveredRebillEntries(job).reduce((s, rb) => s + Number(rb.serviceCharge || 0), 0);
  return entries.length > 0
    ? fromEntries + fromRebills
    : Number(job.service?.serviceCharge || 0) + fromRebills;
};

const getIncomeTotal = (job) => {
  const entries = job.service?.revenueEntries || [];
  const fromEntries = entries.reduce((s, e) => s + Number(e.income || 0), 0);
  const fromRebills = getUncoveredRebillEntries(job).reduce((s, rb) => s + Number(rb.income || 0), 0);
  return entries.length > 0
    ? fromEntries + fromRebills
    : Number(job.service?.income || 0) + fromRebills;
};

const getOthersTotal = (job) => {
  const items = job.service?.othersItems || [];
  if (items.length > 0) return items.reduce((s, oi) => s + Number(oi.amount || 0), 0);
  return Number(job.service?.othersAmount || 0);
};

/* ================= PER-DATE BREAKDOWN (rebill detail, NEW) =================
   Returns [{ label: "02 Sep", amount: 1200 }, ...] combining revenueEntries
   dates with any uncovered rebillHistory cycle's date, for a given field
   ("service" | "income"). Only returned when there's genuinely more than
   one date to show (single-cycle jobs stay pill-free — no visual noise),
   so a rebilled job's "already billed vs new cycle" split becomes visible
   right under its amount. */
const getBreakdown = (job, field) => {
  const entries = job.service?.revenueEntries || [];
  const list = entries
    .filter((e) => Number(e[field] || 0) > 0)
    .map((e) => ({
      label: new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      amount: Number(e[field]),
    }));

  const rebillField = field === "service" ? "serviceCharge" : "income";
  getUncoveredRebillEntries(job).forEach((rb) => {
    const amt = Number(rb[rebillField] || 0);
    if (amt <= 0) return;
    const d = rb.incomeDate || rb.rebilledAt;
    list.push({
      label: d
        ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
        : "Rebilled",
      amount: amt,
    });
  });

  return list.length > 1 ? list : [];
};

const BreakdownPills = ({ items, color }) => {
  if (!items || items.length === 0) return null;
  return (
    <div style={{
      marginTop: 4, paddingTop: 3, borderTop: "1px dashed #e2e8f0",
      display: "flex", flexDirection: "column", gap: 1,
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 8, fontSize: 10, lineHeight: 1.35,
        }}>
          <span style={{ color: "#94a3b8", fontWeight: 500 }}>{it.label}</span>
          <span style={{ color, fontWeight: 700 }}>₹{it.amount.toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
};

const statusColors = {
  Received:          { bg: "#E1F5EE", color: "#0F6E56" },
  Pending:           { bg: "#FAEEDA", color: "#854F0B" },
  Repaired:          { bg: "#E6F1FB", color: "#185FA5" },
  Delivered:         { bg: "#EAF3DE", color: "#3B6D11" },
  "Delivered NR/NA": { bg: "#FAECE7", color: "#993C1D" },
  Cancelled:         { bg: "#FAEAEA", color: "#991b1b" },
};

const StatusBadge = ({ status }) => {
  const s = statusColors[status] || { bg: "#F1EFE8", color: "#5F5E5A" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>
      {status || "—"}
    </span>
  );
};

const SocialText = ({ val }) => {
  if (!val || val === "-" || val === "") return <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>;
  if (val === "Already Done") return <span style={{ fontSize: 11, color: "#1e293b" }}>Done</span>;
  if (val === "Yes")  return <span style={{ fontSize: 11, color: "#1e293b" }}>Yes</span>;
  if (val === "No")   return <span style={{ fontSize: 11, color: "#1e293b" }}>No</span>;
  return <span style={{ fontSize: 11, color: "#1e293b" }}>{val}</span>;
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
    <div style={{ width: 34, height: 34, borderRadius: "50%", background: c.bg, color: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
};

const SummaryCard = ({ label, value, accent, icon }) => (
  <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #e9ecef", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
    <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
      {icon} {label}
    </div>
    <div style={{ fontSize: 20, fontWeight: 600, color: accent || "#212529" }}>{value}</div>
  </div>
);

const JOB_HEADERS = [
  "#", "Job Sheet", "Service Rep", "Created By", "Customer",
  "Contact", "Device", "Status",
  "Service ₹", "Spare ₹", "Others ₹", "Advance ₹", "Adv. Date", "Income ₹",
  "Insta", "Google",
  "Received Date", "Delivered Date"
];

const JobRow = ({ job, i, rep }) => {
  // ✅ FIX — Service ₹ / Income ₹ / Others ₹ now use the lifetime totals
  // (rebill-safe), not the raw top-level fields that reset to 0 on rebill.
  const sc  = getServiceTotal(job);
  const sp  = Number(job.service?.spareCharge   || 0);   // already cumulative
  const inc = getIncomeTotal(job);
  const oth = getOthersTotal(job);
  const adv = Number(job.service?.advanceAmount || 0);   // not touched by rebill
  const serviceBreakdown = getBreakdown(job, "service");
  const incomeBreakdown  = getBreakdown(job, "income");
  return (
    <tr style={{ borderBottom: "1px solid #f0f0f0" }}
      onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
      onMouseLeave={e => e.currentTarget.style.background = ""}>
      <td style={{ padding: "8px 10px", color: "#6c757d" }}>{i + 1}</td>
      <td style={{ padding: "8px 10px", color: "#0d6efd", fontWeight: 500 }}>{job.jobSheetNo}</td>
      <td style={{ padding: "8px 10px" }}>
        <span style={{ background: "#f0fdf4", color: "#166534", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <FaUserTie size={10} /> {job.service?.serviceRep || rep || "—"}
        </span>
      </td>
      <td style={{ padding: "8px 10px" }}>
        <span style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <FaUser size={10} /> {job.createdBy?.username || "—"}
        </span>
      </td>
      <td style={{ padding: "8px 10px" }}>{job.customer?.name || "—"}</td>
      <td style={{ padding: "8px 10px", color: "#6c757d" }}>{job.customer?.contact || "—"}</td>
      <td style={{ padding: "8px 10px", color: "#6c757d" }}>
        {[job.device?.make, job.device?.model].filter(Boolean).join(" ") || "—"}
      </td>
      <td style={{ padding: "8px 10px" }}>
        <StatusBadge status={job.device?.mobileStatus} />
      </td>
      <td style={{ padding: "8px 10px", color: "#7c3aed", fontWeight: 500, whiteSpace: "normal", verticalAlign: "top" }}>
        {sc ? fmt(sc) : "—"}
        <BreakdownPills items={serviceBreakdown} color="#7c3aed" />
      </td>
      <td style={{ padding: "8px 10px", color: "#db2777", fontWeight: 500 }}>{sp ? fmt(sp) : "—"}</td>
      <td style={{ padding: "8px 10px", color: "#c2410c", fontWeight: 500 }}>{oth ? fmt(oth) : "—"}</td>
      <td style={{ padding: "8px 10px", color: "#0d6efd", fontWeight: 500 }}>{adv ? fmt(adv) : "—"}</td>
      <td style={{ padding: "8px 10px", color: "#0369a1", fontSize: 11, whiteSpace: "nowrap" }}>
        {(() => {
          // ✅ FIX — fall back to the latest advanceItems date when the
          // single service.advanceDate field was never set (multi-item advances).
          const advDate = job.service?.advanceDate || job.service?.advanceItems?.slice(-1)[0]?.date;
          return advDate
            ? new Date(advDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
            : "—";
        })()}
      </td>
      <td style={{ padding: "8px 10px", color: "#0e7490", fontWeight: 500, whiteSpace: "normal", verticalAlign: "top" }}>
        {inc ? fmt(inc) : "—"}
        <BreakdownPills items={incomeBreakdown} color="#0e7490" />
      </td>
      <td style={{ padding: "8px 10px", textAlign: "center" }}><SocialText val={job.service?.instaFollowers} /></td>
      <td style={{ padding: "8px 10px", textAlign: "center" }}><SocialText val={job.service?.googleReview} /></td>
      <td style={{ padding: "8px 10px", color: "#6c757d", whiteSpace: "nowrap" }}>
        {new Date(job.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
      </td>
      <td style={{ padding: "8px 10px", color: "#3B6D11", fontSize: 11, whiteSpace: "nowrap" }}>
        {job.service?.deliveryDate
          ? new Date(job.service.deliveryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
          : "—"}
      </td>
    </tr>
  );
};

const TableHead = () => (
  <thead>
    <tr style={{ background: "#f8f9fa" }}>
      {JOB_HEADERS.map(h => (
        <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e9ecef", color: "#6c757d", fontWeight: 500, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
      ))}
    </tr>
  </thead>
);

// ---------------------------------------------------------------------
// ✅ NEW — reusable horizontal-scroll control.
// Sits below the search bar. Clicking left/right scrolls EVERY table
// on the page (every element carrying the "scrollable-table" class)
// together, so it works whether there's one rep's table or many
// stacked underneath each other.
// ---------------------------------------------------------------------
const ScrollControls = () => {
  const scrollTables = (amount) => {
    document.querySelectorAll(".scrollable-table").forEach((el) => {
      el.scrollBy({ left: amount, behavior: "smooth" });
    });
  };

  const btnStyle = {
    width: 30, height: 30, borderRadius: 6, border: "1px solid #dee2e6",
    background: "#fff", color: "#495057", display: "flex",
    alignItems: "center", justifyContent: "center", cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 12, color: "#6c757d", display: "flex", alignItems: "center", gap: 5 }}>
        <FaArrowsAltH size={11} /> 
      </span>
      <button type="button" style={btnStyle} onClick={() => scrollTables(-300)} title="Scroll left">
        <FaChevronLeft size={12} />
      </button>
      <button type="button" style={btnStyle} onClick={() => scrollTables(300)} title="Scroll right">
        <FaChevronRight size={12} />
      </button>
    </div>
  );
};

const ServiceRepReportPage = () => {
  const currentUser = JSON.parse(sessionStorage.getItem("user"));
  const currentRole = currentUser?.role;

  const currentUsername    = currentUser?.username || "";
  const currentDisplayName = currentUser?.name || currentUser?.username || "";
  const currentName        = currentUsername || currentDisplayName;

  const [data,       setData]       = useState({});
  const [loading,    setLoading]    = useState(false);
  const [searchText, setSearchText] = useState("");
  const [fromDate,   setFromDate]   = useState("");
  const [toDate,     setToDate]     = useState("");
  const [repFilter,  setRepFilter]  = useState("");
  const [view,       setView]       = useState("table");

  useEffect(() => {
    if (currentRole !== "admin") {
      fetchData(currentName, "", "");
    } else {
      fetchData();
    }
  }, []);

  const fetchData = async (search = "", from = "", to = "") => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/jobsheets/salesrep-report`, {
        params: { salesRep: search || undefined, fromDate: from || undefined, toDate: to || undefined },
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
  const handleClear  = () => { setSearchText(""); setFromDate(""); setToDate(""); fetchData(); };

  const allJobs      = Object.values(data).flat();
  const repList      = Object.keys(data).sort();
  const totalJobs    = allJobs.length;
  const today        = new Date().toLocaleDateString();
  const todayJobs    = allJobs.filter(j => new Date(j.createdAt).toLocaleDateString() === today).length;
  // ✅ FIX — lifetime totals (rebill-safe) instead of raw top-level fields
  const totalService = allJobs.reduce((s, j) => s + getServiceTotal(j), 0);
  const totalSpare   = allJobs.reduce((s, j) => s + Number(j.service?.spareCharge   || 0), 0);
  const totalIncome  = allJobs.reduce((s, j) => s + getIncomeTotal(j), 0);
  const totalOthers  = allJobs.reduce((s, j) => s + getOthersTotal(j), 0);
  const totalAdvance = allJobs.reduce((s, j) => s + Number(j.service?.advanceAmount || 0), 0);
  const grandTotal   = totalService + totalSpare + totalIncome + totalOthers;
  const totalInstaYes  = allJobs.filter(j => j.service?.instaFollowers === "Yes").length;
  const totalGoogleYes = allJobs.filter(j => j.service?.googleReview   === "Yes").length;

  const repSummaries = repList.map((rep) => {
    const jobs = data[rep];
    // ✅ FIX — lifetime totals (rebill-safe) instead of raw top-level fields
    const sc  = jobs.reduce((s, j) => s + getServiceTotal(j), 0);
    const sp  = jobs.reduce((s, j) => s + Number(j.service?.spareCharge   || 0), 0);
    const inc = jobs.reduce((s, j) => s + getIncomeTotal(j), 0);
    const oth = jobs.reduce((s, j) => s + getOthersTotal(j), 0);
    const adv = jobs.reduce((s, j) => s + Number(j.service?.advanceAmount || 0), 0);
    const instaYes  = jobs.filter(j => j.service?.instaFollowers === "Yes").length;
    const googleYes = jobs.filter(j => j.service?.googleReview   === "Yes").length;
    const statusCount = {};
    jobs.forEach(j => {
      const st = j.device?.mobileStatus || "Unknown";
      statusCount[st] = (statusCount[st] || 0) + 1;
    });
    return { rep, jobs: jobs.length, serviceCharge: sc, spareCharge: sp, income: inc, others: oth, advance: adv, instaYes, googleYes, statusCount };
  });

  const dashRep  = repFilter || repList[0] || "";
  const dashJobs = dashRep && data[dashRep] ? data[dashRep] : [];

  const handleExcel = () => {
    const rows = [];
    repList.forEach(rep => {
      data[rep].forEach((job, i) => {
        // ✅ FIX — lifetime totals (rebill-safe) in the Excel export too
        const sc  = getServiceTotal(job);
        const sp  = Number(job.service?.spareCharge   || 0);
        const inc = getIncomeTotal(job);
        const oth = getOthersTotal(job);
        rows.push({
          "Service Rep":    job.service?.serviceRep || rep,
          "Created By":     job.createdBy?.username || "—",
          "SL No":          i + 1,
          "Job Sheet":      job.jobSheetNo,
          "Customer":       job.customer?.name    || "—",
          "Contact":        job.customer?.contact || "—",
          "Device":         [job.device?.make, job.device?.model].filter(Boolean).join(" ") || "—",
          "Status":         job.device?.mobileStatus || "—",
          "Service Charge": sc,
          "Spare Charge":   sp,
          "Others":         oth,
          "Advance":        Number(job.service?.advanceAmount || 0),
          "Advance Date":   job.service?.advanceDate
            ? new Date(job.service.advanceDate).toLocaleDateString("en-IN")
            : "—",
          "Income":         inc,

          "Insta Follow":   job.service?.instaFollowers || "—",
          "Google Review":  job.service?.googleReview   || "—",
          "Received Date":  new Date(job.createdAt).toLocaleDateString("en-IN"),
          "Delivered Date": job.service?.deliveryDate
            ? new Date(job.service.deliveryDate).toLocaleDateString("en-IN")
            : "—",
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SalesRep Report");
    XLSX.writeFile(wb, `SalesRepReport_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.xlsx`);
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui, sans-serif" }}>

      {/* ================= CUSTOM SCROLLBAR (matches AllReportPage) =================
          Applies to every ".scrollable-table" wrapper on this page — the per-rep
          tables AND the dashboard tables — so all horizontal scrollbars here use
          the same high-contrast blue thumb instead of the flat default grey. */}
      <style>{`
        .scrollable-table::-webkit-scrollbar {
          height: 12px;
          width: 12px;
        }
        .scrollable-table::-webkit-scrollbar-track {
          background: #e2e8f0;
          border-radius: 8px;
        }
        .scrollable-table::-webkit-scrollbar-thumb {
          background: #2563eb;
          border-radius: 8px;
          border: 2px solid #e2e8f0;
        }
        .scrollable-table::-webkit-scrollbar-thumb:hover {
          background: #1d4ed8;
        }
        .scrollable-table {
          scrollbar-width: thin;
          scrollbar-color: #2563eb #e2e8f0;
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h4 style={{ fontWeight: 700, margin: 0, fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <FaUserTie /> {currentRole !== "admin" ? `${currentDisplayName}'s Report` : "Service Rep Report"}
        </h4>
        <div style={{ display: "flex", background: "#f1f3f5", borderRadius: 8, padding: 3 }}>
          {[["table", "Table", FaTable], ["dashboard", "Dashboard", FaChartBar]].map(([val, label, Icon]) => (
            <button key={val} onClick={() => setView(val)} style={{
              padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6,
              background: view === val ? "#fff"    : "transparent",
              color:      view === val ? "#0d6efd" : "#6c757d",
              boxShadow:  view === val ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}><Icon size={12} /> {label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
        <SummaryCard label="Total Reps"    value={repList.length} icon={<FaUserTie size={11} color="#6c757d" />} />
        <SummaryCard label="Total Jobs"    value={totalJobs} icon={<FaTable size={11} color="#6c757d" />} />
        <SummaryCard label="Today's Jobs"  value={todayJobs} icon={<FaCalendarAlt size={11} color="#6c757d" />} />
        <SummaryCard label="Service Total" value={fmt(totalService)}  accent="#7c3aed" icon={<FaWrench size={11} color="#7c3aed" />} />
        <SummaryCard label="Spare Total"   value={fmt(totalSpare)}    accent="#db2777" icon={<FaCogs size={11} color="#db2777" />} />
        <SummaryCard label="Income Total"  value={fmt(totalIncome)}   accent="#0e7490" icon={<FaRupeeSign size={11} color="#0e7490" />} />
        <SummaryCard label="Others Total"  value={fmt(totalOthers)}   accent="#c2410c" icon={<FaBoxOpen size={11} color="#c2410c" />} />

        <SummaryCard label="Total Advance" value={fmt(totalAdvance)}  accent="#0d6efd" icon={<FaHandHoldingUsd size={11} color="#0d6efd" />} />
        <SummaryCard label="Instagram"     value={totalInstaYes}      accent="#e11d48" icon={<FaInstagram size={11} color="#e11d48" />} />
        <SummaryCard label="Google Review" value={totalGoogleYes}     accent="#d97706" icon={<FaStar size={11} color="#d97706" />} />
      </div>

      {currentRole === "admin" ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
          <input className="form-control" style={{ maxWidth: 240 }}
            placeholder="Search service rep name..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()} />
          <div>
            <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 3 }}>From</div>
            <input type="date" className="form-control" style={{ maxWidth: 150 }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 3 }}>To</div>
            <input type="date" className="form-control" style={{ maxWidth: 150 }} value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <button className="btn btn-primary d-flex align-items-center gap-1" onClick={handleSearch}><FaSearch size={12} /> Search</button>
          {(searchText || fromDate || toDate) && (
            <button className="btn btn-outline-secondary d-flex align-items-center gap-1" onClick={handleClear}><FaTimes size={12} /> Clear</button>
          )}
          <button className="btn btn-success ms-auto d-flex align-items-center gap-1" onClick={handleExcel} disabled={repList.length === 0}>
            <FaFileExcel size={13} /> Excel
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 3 }}>From</div>
            <input type="date" className="form-control" style={{ maxWidth: 150 }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 3 }}>To</div>
            <input type="date" className="form-control" style={{ maxWidth: 150 }} value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <button className="btn btn-primary d-flex align-items-center gap-1" onClick={() => fetchData(currentName, fromDate, toDate)}><FaSearch size={12} /> Search</button>
          <button className="btn btn-success ms-auto d-flex align-items-center gap-1" onClick={handleExcel} disabled={repList.length === 0}>
            <FaFileExcel size={13} /> Excel
          </button>
        </div>
      )}

      {/* ✅ NEW — scroll control, right below the search/filter bar */}
      <ScrollControls />

      {loading && <div className="text-center py-4 text-muted">Loading...</div>}
      {!loading && repList.length === 0 && <div className="text-center text-muted py-4">No data found</div>}

      {!loading && view === "table" && repList.map((rep, idx) => {
        const jobs = data[rep];
        // ✅ FIX — lifetime totals (rebill-safe) for each rep's subtotal chips
        const uSC  = jobs.reduce((s, j) => s + getServiceTotal(j), 0);
        const uSP  = jobs.reduce((s, j) => s + Number(j.service?.spareCharge   || 0), 0);
        const uINC = jobs.reduce((s, j) => s + getIncomeTotal(j), 0);
        const uOTH = jobs.reduce((s, j) => s + getOthersTotal(j), 0);
        const uADV = jobs.reduce((s, j) => s + Number(j.service?.advanceAmount || 0), 0);
        const uInsta  = jobs.filter(j => j.service?.instaFollowers === "Yes").length;
        const uGoogle = jobs.filter(j => j.service?.googleReview   === "Yes").length;

        return (
          <div key={rep} style={{ border: "1px solid #e9ecef", borderRadius: 10, overflow: "hidden", marginBottom: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "10px 16px", background: "#f8f9fa", borderBottom: "1px solid #e9ecef" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={rep} idx={idx} />
                <div>
                  <span style={{ fontWeight: 700, fontSize: 15, display: "inline-flex", alignItems: "center", gap: 6 }}><FaUserTie size={13} /> {rep}</span>
                  <span style={{ fontSize: 12, color: "#6c757d", marginLeft: 8 }}>{jobs.length} jobs</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Service",   val: fmt(uSC),  color: "#7c3aed" },
                  { label: "Spare",     val: fmt(uSP),  color: "#db2777" },
                  { label: "Others",    val: fmt(uOTH), color: "#c2410c" },
                  { label: "Advance",   val: fmt(uADV), color: "#0d6efd" },
                  { label: "Income",    val: fmt(uINC), color: "#0e7490" },
                  { label: "Insta",  val: uInsta,    color: "#e11d48" },
                  { label: "Google", val: uGoogle,   color: "#d97706" },
                ].map(p => (
                  <div key={p.label} style={{ background: "#fff", border: "1px solid #e9ecef", borderRadius: 20, padding: "3px 12px", fontSize: 12 }}>
                    <span style={{ color: "#6c757d" }}>{p.label}: </span>
                    <span style={{ fontWeight: 600, color: p.color }}>{p.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ✅ className added so ScrollControls buttons can find & scroll this */}
            <div className="scrollable-table" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <TableHead />
                <tbody>
                  {jobs.map((job, i) => <JobRow key={job._id} job={job} i={i} rep={rep} />)}

                  <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>
                    <td colSpan={8} style={{ padding: "8px 10px", fontWeight: 700, fontSize: 13, color: "#166534" }}>Subtotal — {rep}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#7c3aed" }}>{fmt(uSC)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#db2777" }}>{fmt(uSP)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#c2410c" }}>{fmt(uOTH)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0d6efd" }}>{fmt(uADV)}</td>
                    <td />
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0e7490" }}>{fmt(uINC)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#e11d48", textAlign: "center" }}>{uInsta}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#d97706", textAlign: "center" }}>{uGoogle}</td>
                    <td />
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
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "#6c757d", marginBottom: 4, fontWeight: 500 }}>Select Service Rep</div>
            <select className="form-select" style={{ maxWidth: 240 }} value={repFilter} onChange={e => setRepFilter(e.target.value)}>
              <option value="">All Reps</option>
              {repList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {!repFilter && (
            <div style={{ border: "1px solid #e9ecef", borderRadius: 10, overflow: "hidden", marginBottom: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: "10px 16px", background: "#f8f9fa", borderBottom: "1px solid #e9ecef", fontWeight: 600, fontSize: 14 }}>All Service Reps — Overview</div>
              <div className="scrollable-table" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa" }}>
                      {["Service Rep", "Total Jobs", "Service ₹", "Spare ₹", "Others ₹", "Advance ₹", "Income ₹", "Insta Yes", "Google Yes"].map(h => (
                        <th key={h} style={{ padding: "9px 12px", borderBottom: "1px solid #e9ecef", color: "#6c757d", fontWeight: 500, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {repSummaries.map((u, idx) => (
                      <tr key={u.rep} style={{ borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}
                        onClick={() => setRepFilter(u.rep)}>
                        <td style={{ padding: "9px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar name={u.rep} idx={idx} />
                            <span style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><FaUserTie size={12} /> {u.rep}</span>
                          </div>
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "center" }}>
                          <span style={{ background: "#e9ecef", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{u.jobs}</span>
                        </td>
                        <td style={{ padding: "9px 12px", color: "#7c3aed", fontWeight: 600 }}>{fmt(u.serviceCharge)}</td>
                        <td style={{ padding: "9px 12px", color: "#db2777", fontWeight: 600 }}>{fmt(u.spareCharge)}</td>
                        <td style={{ padding: "9px 12px", color: "#c2410c", fontWeight: 600 }}>{fmt(u.others)}</td>
                        <td style={{ padding: "9px 12px", color: "#0d6efd", fontWeight: 600 }}>{fmt(u.advance)}</td>
                        <td style={{ padding: "9px 12px", color: "#0e7490", fontWeight: 600 }}>{fmt(u.income)}</td>
                        <td style={{ padding: "9px 12px", color: "#e11d48", fontWeight: 600, textAlign: "center" }}>{u.instaYes}</td>
                        <td style={{ padding: "9px 12px", color: "#d97706", fontWeight: 600, textAlign: "center" }}>{u.googleYes}</td>
                      </tr>
                    ))}
                    <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>

                      <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 700 }}>{totalJobs}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#7c3aed" }}>{fmt(totalService)}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#db2777" }}>{fmt(totalSpare)}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#c2410c" }}>{fmt(totalOthers)}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#0d6efd" }}>{fmt(totalAdvance)}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#0e7490" }}>{fmt(totalIncome)}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#e11d48", textAlign: "center" }}>{totalInstaYes}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#d97706", textAlign: "center" }}>{totalGoogleYes}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {repFilter && dashRep && (
            <div>
              <button className="btn btn-outline-secondary btn-sm mb-3" onClick={() => setRepFilter("")}>← All Reps</button>
              {(() => {
                const u = repSummaries.find(x => x.rep === dashRep);
                if (!u) return null;
                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <Avatar name={u.rep} idx={repList.indexOf(u.rep)} />
                      <span style={{ fontWeight: 700, fontSize: 16, display: "inline-flex", alignItems: "center", gap: 6 }}><FaUserTie size={14} /> {u.rep}</span>
                      <span style={{ fontSize: 13, color: "#6c757d" }}>{u.jobs} jobs</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
                      <SummaryCard label="Total Jobs"     value={u.jobs} />
                      <SummaryCard label="Service Charge" value={fmt(u.serviceCharge)} accent="#7c3aed" icon={<FaWrench size={11} color="#7c3aed" />} />
                      <SummaryCard label="Spare Charge"   value={fmt(u.spareCharge)}   accent="#db2777" icon={<FaCogs size={11} color="#db2777" />} />
                      <SummaryCard label="Others"         value={fmt(u.others)}        accent="#c2410c" icon={<FaBoxOpen size={11} color="#c2410c" />} />
                      <SummaryCard label="Advance"        value={fmt(u.advance)}        accent="#0d6efd" icon={<FaHandHoldingUsd size={11} color="#0d6efd" />} />
                      <SummaryCard label="Income"         value={fmt(u.income)}        accent="#0e7490" icon={<FaRupeeSign size={11} color="#0e7490" />} />
                      <SummaryCard label="Insta Yes"  value={u.instaYes}             accent="#e11d48" icon={<FaInstagram size={11} color="#e11d48" />} />
                      <SummaryCard label="Google Yes" value={u.googleYes}            accent="#d97706" icon={<FaStar size={11} color="#d97706" />} />
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                      {Object.entries(u.statusCount).map(([st, cnt]) => {
                        const sc = statusColors[st] || { bg: "#f1f3f5", color: "#495057" };
                        return (
                          <div key={st} style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 500, border: `1px solid ${sc.color}22` }}>
                            {st}: <strong>{cnt}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div style={{ border: "1px solid #e9ecef", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div className="scrollable-table" style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <TableHead />
                    <tbody>
                      {dashJobs.map((job, i) => <JobRow key={job._id} job={job} i={i} rep={dashRep} />)}
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

export default ServiceRepReportPage;