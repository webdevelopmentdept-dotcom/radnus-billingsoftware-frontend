import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  BarChart3, Search, User, Users, CalendarDays, RotateCcw, Printer,
  FileSpreadsheet, FileText, Wrench, Cog, IndianRupee, Package,
  HandCoins, Loader2, Inbox, Phone, Filter, Hash, Tag, Clock,
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

/* amount cell + "Already ₹xxx" jump link */
const AmountCell = ({ value, prior, onJump, className = "" }) => (
  <td className={`r ${className}`}>
    {value > 0 ? money(value) : <span className="val-dash">-</span>}
    {prior > 0 && (
      <div className="val-already" onClick={onJump}>Already ₹{prior}</div>
    )}
  </td>
);

/* ================= PAGE ================= */
const ValueReport = () => {
  const today = todayStr();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [searchText, setSearchText] = useState("");   // Job No / Name / Contact / Service Rep
  const [repFilter, setRepFilter] = useState("");     // ✅ NEW — Service Rep dropdown

  /* ================= DATE TYPE FILTER =================
     "received"    → service.repairDate
     "delivery"    → service.deliveryDate
     "created"     → job.createdAt
     "transaction" → row.date (entry-oda own date) — month-wise revenue + rebill-kku idhu thaan best. */
  const [dateFilterType, setDateFilterType] = useState("received");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightKey, setHighlightKey] = useState(null);
  const [pendingJump, setPendingJump] = useState(null);

  const jumpToEntry = (jobSheetNo, date, type) => {
    if (!date) return;
    const id = `entry-${jobSheetNo}-${date}-${type}`;

    const el = document.getElementById(id);
    if (el) {
      scrollAndHighlight(id);
      return;
    }

    // From/To clear pannina andha entry kandippa visible aagum
    if (fromDate) setFromDate("");
    if (toDate) setToDate("");
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

  useEffect(() => { fetchReport(); }, []);

  useEffect(() => {
    if (!pendingJump) return;
    const t1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollAndHighlight(pendingJump);
        setPendingJump(null);
      });
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

  // Clear filter — dates + search + rep clear, apparam reload
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

  /* ================= REBILL HISTORY DEDUP =================
     revenueEntries-la already track aagirundha cycle-ah rebillHistory-la thirumba
     serkaama, genuinely missing cycle-ah mattum add pannum. */
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

  const buildRows = (jobsheets) => {
    const rows = [];

    jobsheets.forEach((item) => {
      const name         = item.customer?.name || "";
      const contact      = item.customer?.contact || "";      // ✅ NEW
      const serviceRep   = item.service?.serviceRep || "";    // ✅ NEW
      const jobSheetNo   = item.jobSheetNo || "";
      const repairDate   = item.service?.repairDate?.slice(0, 10) || "";
      const deliveryDate = item.service?.deliveryDate?.slice(0, 10) || "-";
      const createdAt    = item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : "";

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

      getUncoveredRebillEntries(item).forEach((rb) => {
        const d = rb.incomeDate
          ? new Date(rb.incomeDate).toISOString().slice(0, 10)
          : rb.rebilledAt
          ? new Date(rb.rebilledAt).toISOString().slice(0, 10)
          : repairDate;
        addToBucket(d, "service", Number(rb.serviceCharge || 0));
        addToBucket(d, "income",  Number(rb.income || 0));
        addToBucket(d, "others",  Number(rb.othersAmount || 0));
      });

      const dateRows = Object.keys(dateBucket).map((d) => {
        const b = dateBucket[d];
        return { date: d, ...b, rowTotal: b.service + b.spare + b.income + b.others };
      }).filter((r) => r.rowTotal > 0);

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

      // ── Ellam serthu single chronological timeline ──
      const events = [
        ...dateRows.map((r) => ({ ...r, kind: "charge" })),
        ...advanceEvents.map((a) => ({ ...a, kind: "advance" })),
      ].sort((a, b) => a.date.localeCompare(b.date));

      let cumService = 0, cumSpare = 0, cumIncome = 0, cumOthers = 0, cumAdvance = 0;
      let srcServiceKey = null, srcSpareKey = null, srcIncomeKey = null, srcOthersKey = null, srcAdvanceKey = null;

      events.forEach((e) => {
        const priorService = cumService, priorSpare = cumSpare, priorIncome = cumIncome,
              priorOthers  = cumOthers,  priorAdvance = cumAdvance;
        const priorServiceKey = srcServiceKey, priorSpareKey = srcSpareKey,
              priorIncomeKey  = srcIncomeKey,  priorOthersKey = srcOthersKey,
              priorAdvanceKey = srcAdvanceKey;

        if (e.kind === "charge") {
          const rowKey = `entry-${jobSheetNo}-${e.date}-service`;
          rows.push({
            date: e.date, jobSheetNo, name, contact, serviceRep,
            type: "service", label: "-",
            service: e.service, spare: e.spare, income: e.income, others: e.others,
            advance: 0,
            jobTotal, hideRow: false,
            rowTotal: e.rowTotal, repairDate, deliveryDate, createdAt,
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
          const rowKey = `entry-${jobSheetNo}-${e.date}-advance`;
          cumAdvance += e.amount;
          srcAdvanceKey = rowKey;
          rows.push({
            date: e.date, jobSheetNo, name, contact, serviceRep,
            type: "advance", label: e.label,
            service: 0, spare: 0, income: 0, others: 0,
            advance: e.amount,
            jobTotal, hideRow: false,
            rowTotal: e.amount, repairDate, deliveryDate, createdAt,
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

  const getFilterDate = (row) => {
    if (dateFilterType === "created")     return row.createdAt || "";
    if (dateFilterType === "delivery")    return (row.deliveryDate && row.deliveryDate !== "-") ? row.deliveryDate : "";
    if (dateFilterType === "transaction") return row.date || "";
    return row.repairDate || "";
  };

  /* ================= FILTER ================= */
  const getFilteredRows = () => {
    const rows = buildRows(data);
    let visible = rows.filter((r) => !r.hideRow);

    // ✅ Search — Job No / Name / Contact / Service Rep
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      visible = visible.filter((row) =>
        `${row.jobSheetNo} ${row.name} ${row.contact} ${row.serviceRep}`.toLowerCase().includes(q)
      );
    }

    // ✅ Service Rep dropdown
    if (repFilter) {
      visible = visible.filter((row) => row.serviceRep === repFilter);
    }

    if (!fromDate && !toDate) return visible;
    return visible.filter((row) => {
      const d = getFilterDate(row);
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
      const d = getFilterDate(row) || row.date || "Unknown";
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

  const jobsCount = allRows.filter((r) => r.type === "service").length;
  const advCount  = allRows.filter((r) => r.type === "advance").length;

  const dateTypeLabel = dateFilterType === "created" ? "Created Date"
    : dateFilterType === "delivery" ? "Delivery Date"
    : dateFilterType === "transaction" ? "Transaction Date"
    : "Received Date";

  const hasRows = allRows.length > 0;

  /* ================= EXCEL DOWNLOAD ================= */
  const handleExcelDownload = () => {
    const blank = () => ({
      "Date": "", "Job No": "", "Type": "", "Label": "", "Name": "", "Contact": "", "Service Rep": "",
      "Repair Date": "", "Txn Date": "", "Delivery Date": "",
      "Service ₹": "", "Spare ₹": "", "Income ₹": "", "Others ₹": "", "Advance ₹": "",
    });
    const f2 = (n) => Number(n || 0).toFixed(2);
    const excelRows = [];

    Object.keys(groupedData).forEach((date) => {
      const rows = groupedData[date];

      excelRows.push({ ...blank(), "Date": `📅 ${date}` });

      rows.forEach((row) => {
        const isAdv = row.type === "advance";
        excelRows.push({
          "Date": date,
          "Job No": row.jobSheetNo,
          "Type": isAdv ? "Advance" : "Service",
          "Label": row.label,
          "Name": row.name,
          "Contact": row.contact,
          "Service Rep": row.serviceRep,
          "Repair Date": row.repairDate || "-",
          "Txn Date": row.date,
          "Delivery Date": row.deliveryDate,
          "Service ₹": isAdv ? "-" : (row.service > 0 ? f2(row.service) : "-"),
          "Spare ₹": row.spare > 0 ? f2(row.spare) : "-",
          "Income ₹": isAdv ? "-" : (row.income > 0 ? f2(row.income) : "-"),
          "Others ₹": isAdv ? "-" : (row.others > 0 ? f2(row.others) : "-"),
          "Advance ₹": row.advance > 0 ? f2(row.advance) : "-",
        });
      });

      excelRows.push({
        ...blank(),
        "Delivery Date": `Sub Total (${date})`,
        "Service ₹":   f2(rows.reduce((s, r) => s + r.service, 0)),
        "Spare ₹":     f2(rows.reduce((s, r) => s + r.spare, 0)),
        "Income ₹":    f2(rows.reduce((s, r) => s + (r.income || 0), 0)),
        "Others ₹":    f2(rows.reduce((s, r) => s + (r.others || 0), 0)),
        "Advance ₹":   f2(rows.reduce((s, r) => s + r.advance, 0)),
      });

      excelRows.push(blank());
    });

    excelRows.push({
      ...blank(),
      "Delivery Date": "GRAND TOTAL",
      "Service ₹": f2(grandService),
      "Spare ₹": f2(grandSpare),
      "Income ₹": f2(grandIncome),
      "Others ₹": f2(grandOthers),
      "Advance ₹": f2(grandAdvance),
    });

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Value Report");
    XLSX.writeFile(wb, `ValueReport_${dateFilterType}_${fromDate || "All"}_to_${toDate || "All"}.xlsx`);
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
              <div className="val-subtitle">Service, spare &amp; advance — each transaction shown on its own date</div>
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
                <option value="transaction">Transaction Date (Recommended)</option>
                <option value="received">Received Date</option>
                <option value="delivery">Delivery Date</option>
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
          <StatCard icon={FileText}    label="Total Jobs" value={jobsCount}            tone={TONES.blue} />
          <StatCard icon={Wrench}      label="Service"    value={money(grandService)}   tone={TONES.amber} />
          <StatCard icon={Cog}         label="Spare"      value={money(grandSpare)}     tone={TONES.violet} />
          <StatCard icon={IndianRupee} label="Income"     value={money(grandIncome)}    tone={TONES.cyan} />
          <StatCard icon={Package}     label="Others"     value={money(grandOthers)}    tone={TONES.orange} />
          <StatCard icon={HandCoins}   label="Advance"    value={money(grandAdvance)}   tone={TONES.green} />
        </div>

        {/* ============ RESULT CARD ============ */}
        <div className="val-card" style={{ overflow: "hidden" }}>
          <div className="val-result-head">
            <div className="val-result-title">
              <FileText size={18} color="#64748b" />
              {jobsCount} jobs <span style={{ color: "#cbd5e1" }}>|</span> {advCount} advance entries
            </div>
            <div className="val-chips">
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
              <div className="val-empty-sub">Date range / Service Rep maathi try pannunga</div>
            </div>
          ) : (
            <div className="val-table-wrap">
              <table className="val-table">
                <thead>
                  <tr>
                    <Th icon={Hash}>Job No</Th>
                    <Th icon={Tag}>Type</Th>
                    <Th>Label</Th>
                    <Th icon={User}>Name</Th>
                    <Th icon={Users}>Service Rep</Th>
                    <Th>Repair Date</Th>
                    <Th>Txn Date</Th>
                    <Th>Delivery Date</Th>
                    <Th className="r">Service ₹</Th>
                    <Th className="r">Spare ₹</Th>
                    <Th className="r">Income ₹</Th>
                    <Th className="r">Others ₹</Th>
                    <Th className="r">Advance ₹</Th>
                  </tr>
                </thead>

                <tbody>
                  {Object.keys(groupedData).map((date) => {
                    const rows         = groupedData[date];
                    const subService   = rows.reduce((s, r) => s + r.service,          0);
                    const subSpare     = rows.reduce((s, r) => s + r.spare,            0);
                    const subIncome    = rows.reduce((s, r) => s + (r.income || 0),    0);
                    const subOthers    = rows.reduce((s, r) => s + (r.others || 0),    0);
                    const subAdvance   = rows.reduce((s, r) => s + r.advance,          0);

                    return (
                      <React.Fragment key={date}>
                        <tr className="val-date-row">
                          <td colSpan={13}>
                            <div className="val-date-cell">
                              <CalendarDays size={16} />
                              {fmtDMY(date)}
                              <span className="val-count">
                                {rows.length} {rows.length > 1 ? "entries" : "entry"}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {rows.map((row, rIdx) => {
                          const rowId = `entry-${row.jobSheetNo}-${row.date}-${row.type}`;
                          const isAdv = row.type === "advance";
                          const rc = repColor(row.serviceRep);
                          return (
                            <tr
                              key={rIdx}
                              id={rowId}
                              className={`val-row ${isAdv ? "val-row-adv" : ""} ${highlightKey === rowId ? "val-hl" : ""}`}
                            >
                              <td><span className="val-jobpill">{row.jobSheetNo}</span></td>
                              <td>
                                {isAdv ? (
                                  <span className="val-badge val-badge-adv"><HandCoins size={12} /> Advance</span>
                                ) : (
                                  <span className="val-badge val-badge-svc"><Wrench size={12} /> Service</span>
                                )}
                              </td>
                              <td style={{ color: "#64748b", fontSize: 12 }}>{row.label}</td>
                              <td>
                                <div className="val-cust">{row.name || "-"}</div>
                                {row.contact && (
                                  <div className="val-contact"><Phone size={11} /> {row.contact}</div>
                                )}
                              </td>
                              <td>
                                {row.serviceRep ? (
                                  <span className="val-rep">
                                    <span className="val-avatar" style={{ background: rc.bg, color: rc.fg }}>
                                      {row.serviceRep.charAt(0).toUpperCase()}
                                    </span>
                                    {row.serviceRep}
                                  </span>
                                ) : (
                                  <span className="val-dash">-</span>
                                )}
                              </td>
                              <td>{fmtDMY(row.repairDate)}</td>
                              <td style={{ fontWeight: 600, color: "#0f172a" }}>{fmtDMY(row.date)}</td>
                              <td>{fmtDMY(row.deliveryDate)}</td>

                              <AmountCell
                                value={row.service}
                                prior={row.priorService}
                                onJump={() => jumpToEntry(row.jobSheetNo, row.priorServiceDate, "service")}
                              />
                              <AmountCell
                                value={row.spare}
                                prior={row.priorSpare}
                                onJump={() => jumpToEntry(row.jobSheetNo, row.priorSpareDate, "service")}
                              />
                              <AmountCell
                                value={row.income}
                                prior={row.priorIncome}
                                onJump={() => jumpToEntry(row.jobSheetNo, row.priorIncomeDate, "service")}
                              />
                              <AmountCell
                                value={row.others}
                                prior={row.priorOthers}
                                onJump={() => jumpToEntry(row.jobSheetNo, row.priorOthersDate, "service")}
                              />
                              <AmountCell
                                className="val-green"
                                value={row.advance}
                                prior={row.priorAdvance}
                                onJump={() => jumpToEntry(row.jobSheetNo, row.priorAdvanceDate, "advance")}
                              />
                            </tr>
                          );
                        })}

                        {/* SUB TOTAL */}
                        <tr className="val-sub-row">
                          <td colSpan={8} className="r">Sub Total ({fmtDMY(date)})</td>
                          <td className="r">{money(subService)}</td>
                          <td className="r">{money(subSpare)}</td>
                          <td className="r">{money(subIncome)}</td>
                          <td className="r">{money(subOthers)}</td>
                          <td className="r val-green">{money(subAdvance)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  {/* GRAND TOTAL */}
                  <tr className="val-grand-row">
                    <td colSpan={8} className="r">Grand Total</td>
                    <td className="r" style={{ color: "#fde68a" }}>{money(grandService)}</td>
                    <td className="r" style={{ color: "#c4b5fd" }}>{money(grandSpare)}</td>
                    <td className="r" style={{ color: "#a5f3fc" }}>{money(grandIncome)}</td>
                    <td className="r" style={{ color: "#fed7aa" }}>{money(grandOthers)}</td>
                    <td className="r" style={{ color: "#86efac" }}>{money(grandAdvance)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ============ SCOPED STYLES (Bootstrap-oda clash aagaadhu) ============ */}
      <style>{`
        .val-page, .val-page * { box-sizing: border-box; }
        .val-page { min-height: 100vh; background: #f1f5f9; padding: 24px 32px; color: #1e293b; }
        .val-container { max-width: 1600px; margin: 0 auto; }

        /* header */
        .val-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
        .val-header-left { display: flex; align-items: center; gap: 16px; }
        .val-header-actions { display: flex; align-items: center; gap: 8px; }
        .val-logo { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #fff;
          background: linear-gradient(135deg, #6366f1, #7c3aed); box-shadow: 0 8px 18px rgba(99,102,241,.3); flex-shrink: 0; }
        .val-title { margin: 0; font-size: 28px; font-weight: 800; line-height: 1.2; letter-spacing: -0.3px; color: #1e293b; }
        .val-subtitle { margin-top: 2px; font-size: 14px; color: #64748b; }

        /* card */
        .val-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .val-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 16px; }

        /* filter row */
        .val-filter-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; }
        .val-f-search { flex: 2 1 250px; }
        .val-f-rep { flex: 1 1 170px; }
        .val-f-type { flex: 1.3 1 220px; }
        .val-f-date { flex: 1 1 145px; }
        .val-f-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
        .val-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .val-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #64748b; line-height: 1; }
        .val-label svg { flex-shrink: 0; }

        /* inputs */
        .val-input-wrap { position: relative; }
        .val-input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
        .val-input { display: block; width: 100%; height: 40px; padding: 0 12px; font-size: 14px; color: #1e293b; background: #fff;
          border: 1px solid #cbd5e1; border-radius: 10px; outline: none; transition: border-color .15s, box-shadow .15s; font-family: inherit; }
        .val-input.has-icon { padding-left: 38px; }
        .val-input::placeholder { color: #94a3b8; }
        .val-input:focus { border-color: #2563eb; box-shadow: 0 0 0 4px #dbeafe; }

        /* buttons */
        .val-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 18px; font-size: 14px; font-weight: 600;
          border: 1px solid transparent; border-radius: 10px; cursor: pointer; white-space: nowrap; transition: background .15s; font-family: inherit; line-height: 1; }
        .val-btn:disabled { opacity: .55; cursor: not-allowed; }
        .val-btn-primary { background: #2563eb; color: #fff; box-shadow: 0 1px 2px rgba(37,99,235,.35); }
        .val-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .val-btn-green { background: #059669; color: #fff; }
        .val-btn-green:hover:not(:disabled) { background: #047857; }
        .val-btn-ghost { background: #fff; color: #334155; border-color: #cbd5e1; }
        .val-btn-ghost:hover:not(:disabled) { background: #f8fafc; }

        /* stat cards */
        .val-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-bottom: 20px; }
        .val-stat { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.05); }
        .val-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .val-stat-label { font-size: 12px; font-weight: 600; color: #64748b; }
        .val-stat-value { font-size: 20px; font-weight: 800; color: #1e293b; line-height: 1.2; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* result head */
        .val-result-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; }
        .val-result-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #1e293b; }
        .val-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .val-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }

        /* empty */
        .val-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 80px 20px; color: #94a3b8; }
        .val-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
        .val-empty-title { font-size: 16px; font-weight: 600; color: #64748b; }
        .val-empty-sub { font-size: 14px; }
        .val-spin { animation: valSpin 1s linear infinite; }
        @keyframes valSpin { to { transform: rotate(360deg); } }

        /* table */
        .val-table-wrap { overflow: auto; max-height: 640px; }
        .val-table { width: 100%; min-width: 1300px; border-collapse: collapse; font-size: 13px; }
        .val-table th { position: sticky; top: 0; z-index: 2; background: #1e293b; color: #f1f5f9; font-size: 11.5px; font-weight: 600; letter-spacing: .05em;
          text-transform: uppercase; text-align: left; padding: 12px 12px; white-space: nowrap; }
        .val-table th.r, .val-table td.r { text-align: right; }
        .val-th { display: inline-flex; align-items: center; gap: 6px; }
        .val-table td { padding: 10px 12px; vertical-align: middle; white-space: nowrap; }

        .val-date-row td { background: #eff6ff; border-top: 2px solid #93c5fd; border-bottom: 1px solid #bfdbfe; padding: 9px 14px; }
        .val-date-cell { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #1e3a8a; }
        .val-count { padding: 2px 8px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 600; }

        .val-row td { border-bottom: 1px solid #f1f5f9; transition: background .3s; }
        .val-row:hover td { background: #f8fafc; }
        .val-row-adv td { background: #f0fdf4; }
        .val-row-adv:hover td { background: #dcfce7; }
        .val-row.val-hl td { background: #fef08a !important; }

        .val-jobpill { display: inline-block; padding: 3px 8px; border-radius: 6px; background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 700; }
        .val-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .val-badge-adv { background: #bbf7d0; color: #14532d; }
        .val-badge-svc { background: #dbeafe; color: #1e3a8a; }
        .val-cust { font-weight: 600; color: #1e293b; }
        .val-contact { display: flex; align-items: center; gap: 4px; margin-top: 2px; font-size: 12px; color: #64748b; }
        .val-rep { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; color: #334155; }
        .val-avatar { width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .val-dash { color: #94a3b8; }
        .val-green { color: #15803d; }
        .val-table td.r { font-variant-numeric: tabular-nums; }
        .val-already { margin-top: 2px; font-size: 11px; font-weight: 500; color: #94a3b8; cursor: pointer; text-decoration: underline; }
        .val-already:hover { color: #2563eb; }

        .val-sub-row td { background: #f1f5f9; padding: 10px 12px; font-weight: 700; color: #1e293b; }
        .val-sub-row td:first-child { font-size: 12px; letter-spacing: .05em; text-transform: uppercase; color: #64748b; }
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
          .val-row, .val-sub-row { break-inside: avoid; }
          .val-table th, .val-grand-row td, .val-date-row td, .val-row-adv td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

export default ValueReport;