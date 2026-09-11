import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const API_ENV = import.meta.env.VITE_API_URL;

/* ================= DATE HELPERS ================= */
const toISODate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const inRange = (isoDate, from, to) => {
  if (!isoDate) return false;
  if (from && isoDate < from) return false;
  if (to && isoDate > to) return false;
  return true;
};

/* ================= LIFETIME TOTAL HELPERS (FIX — same bug as ValueReport/ServiceRepReportPage) =================
   🔴 BUG this report had — "Service" column read the raw top-level
   `service.income` field, and "Spare" read the raw `service.spareCharge`
   field. Both fields get RESET on rebill (see backend's /rebill route),
   so once a job had been rebilled even once, this report only ever showed
   the CURRENT cycle's amount — the pre-rebill amount silently vanished
   from every subtotal and the grand total.

   ✅ FIX — same lifetime-total + dedup approach already used in the other
   reports:
   - revenueEntries (pushed on every Income/Service change, across every
     cycle) is the primary, date-wise ledger — sum it when present.
   - rebillHistory is only used as a FALLBACK for cycles revenueEntries
     never tracked — added via getUncoveredRebillEntries's cycle-window
     dedup check, so a cycle already covered by revenueEntries is never
     double-counted.
   - spareItems (top-level array, persists across rebill) replaces the raw
     spareCharge field so Spare is also lifetime-accurate and, when a
     Transaction Date range is active, restrictable to that range.

   Every helper below takes an optional `range` ({from, to}):
   - range = null (default) → full lifetime total (used for Received /
     Repaired / Delivered date-type filters, which only decide which jobs
     are grouped where — not what amount each job shows).
   - range = {from, to} → only entries whose OWN date falls inside the
     range are summed (used when Transaction Date filter has a range set —
     this is what stops a job with an August AND a September transaction
     from showing its combined lifetime total when you filter for
     September only). */

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

// "Service" column in this report has always meant the Income total (see
// original code's own comment) — kept as-is, just made rebill-safe + range-aware.
const getIncomeTotal = (job, range = null) => {
  const allEntries = job.service?.revenueEntries || [];
  const entries = range
    ? allEntries.filter((e) => inRange(toISODate(e.date), range.from, range.to))
    : allEntries;
  const fromEntries = entries.reduce((s, e) => s + Number(e.income || 0), 0);

  const allRebills = getUncoveredRebillEntries(job);
  const rebills = range
    ? allRebills.filter((rb) => inRange(toISODate(rb.incomeDate || rb.rebilledAt), range.from, range.to))
    : allRebills;
  const fromRebills = rebills.reduce((s, rb) => s + Number(rb.income || 0), 0);

  if (allEntries.length > 0) return fromEntries + fromRebills;
  return range ? fromRebills : Number(job.service?.income || 0) + fromRebills;
};

const getSpareTotal = (job, range = null) => {
  const items = job.spareItems || [];
  const filtered = range ? items.filter((si) => inRange(toISODate(si.date), range.from, range.to)) : items;
  if (items.length > 0) return filtered.reduce((s, si) => s + Number(si.amount || 0), 0);
  return range ? 0 : Number(job.service?.spareCharge || 0);
};

/* ================= DATE TYPE FILTER =================
   "received"  → job.createdAt (matches this report's own "Received" column)
   "repaired"  → job.service?.repairDate (matches the "Repaired" column)
   "delivered" → job.service?.deliveryDate (matches the "Delivered" column)
   "transaction" → job matches if ANY of its dated entries (revenueEntries /
                   spareItems / an uncovered rebillHistory cycle) falls
                   inside the range — catches a rebilled job even if its
                   repair/received/delivery date is outside the window. */
const jobMatchesDateFilter = (job, type, from, to) => {
  if (!from && !to) return true;

  if (type === "repaired") {
    const d = job.service?.repairDate ? toISODate(job.service.repairDate) : "";
    return inRange(d, from, to);
  }
  if (type === "delivered") {
    const d = job.service?.deliveryDate ? toISODate(job.service.deliveryDate) : "";
    return inRange(d, from, to);
  }
  if (type === "transaction") {
    const dates = [];
    (job.service?.revenueEntries || []).forEach((e) => e.date && dates.push(toISODate(e.date)));
    (job.spareItems || []).forEach((si) => si.date && dates.push(toISODate(si.date)));
    getUncoveredRebillEntries(job).forEach((rb) => {
      const d = rb.incomeDate || rb.rebilledAt;
      if (d) dates.push(toISODate(d));
    });
    if (dates.length === 0) {
      const fallback = toISODate(job.createdAt);
      if (fallback) dates.push(fallback);
    }
    return dates.some((d) => d && inRange(d, from, to));
  }

  // "received" (default)
  const d = toISODate(job.createdAt);
  return inRange(d, from, to);
};

const EngineerValueReport = () => {
  const [engineer, setEngineer] = useState("");
  const [engineerList, setEngineerList] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // ✅ NEW — Date Type selector, same idea as ValueReport / ServiceRepReportPage
  const [dateFilterType, setDateFilterType] = useState("received"); // "received" | "repaired" | "delivered" | "transaction"
  // ✅ NEW — Job No / Name / Phone search
  const [searchText, setSearchText] = useState("");

  const [rawData, setRawData] = useState([]); // everything from the backend, unfiltered
  const [loading, setLoading] = useState(false);
  const API = API_ENV;

  /* LOAD ENGINEERS */
  useEffect(() => {
    axios.get(`${API}/api/engineers`)
      .then(res => setEngineerList(res.data))
      .catch(err => console.error(err));
  }, []);

  /* FETCH — no date params sent to the backend anymore; all date-type +
     range filtering happens client-side below so switching the Date Type
     dropdown or typing in From/To re-filters instantly without another
     API round-trip. Engineer is still applied server-side isn't needed
     either — everything is filtered client-side against rawData. */
  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/jobsheets/filter`);
      setRawData(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Report load failed ❌");
      setRawData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const handleClear = () => {
    setEngineer("");
    setFromDate("");
    setToDate("");
    setDateFilterType("received");
    setSearchText("");
  };

  // ✅ NEW — client-side: date-type filter + engineer filter + Job No/Name/Phone
  // search, all applied together on top of rawData. Recomputes instantly on
  // every change, no extra API call needed.
  const data = useMemo(() => {
    let out = rawData;

    if (fromDate || toDate) {
      out = out.filter((item) => jobMatchesDateFilter(item, dateFilterType, fromDate, toDate));
    }

    if (engineer) {
      out = out.filter(
        (item) => item.service?.engineer?.trim().toLowerCase() === engineer.toLowerCase()
      );
    }

    const q = searchText.trim().toLowerCase();
    if (q) {
      out = out.filter((item) => {
        const jobNo = (item.jobSheetNo || "").toLowerCase();
        const name  = (item.customer?.name || "").toLowerCase();
        const phone = (item.customer?.contact || "").toLowerCase();
        return jobNo.includes(q) || name.includes(q) || phone.includes(q);
      });
    }

    return out;
  }, [rawData, dateFilterType, fromDate, toDate, engineer, searchText]);

  // ✅ FIX — only Transaction Date restricts the AMOUNTS to the selected
  // window; Received/Repaired/Delivered still show each job's full lifetime
  // value (they just decide which jobs/groups are included).
  const activeRange = (dateFilterType === "transaction" && (fromDate || toDate))
    ? { from: fromDate || "", to: toDate || "" }
    : null;

  const dateTypeLabel = dateFilterType === "repaired" ? "Repaired Date"
    : dateFilterType === "delivered" ? "Delivered Date"
    : dateFilterType === "transaction" ? "Transaction Date"
    : "Received Date";

  /* GROUP — grouped by whichever date the Date Type dropdown is currently
     driving, so the section headers line up with what you actually filtered by. */
  const getGroupDate = (item) => {
    if (dateFilterType === "repaired")  return item.service?.repairDate ? toISODate(item.service.repairDate) : "Unknown";
    if (dateFilterType === "delivered") return item.service?.deliveryDate ? toISODate(item.service.deliveryDate) : "Unknown";
    if (dateFilterType === "transaction") {
      // group under the job's most recent in-range transaction date, falling
      // back to createdAt for a job with no dated sub-entries at all
      const dates = [];
      (item.service?.revenueEntries || []).forEach((e) => e.date && dates.push(toISODate(e.date)));
      (item.spareItems || []).forEach((si) => si.date && dates.push(toISODate(si.date)));
      getUncoveredRebillEntries(item).forEach((rb) => {
        const d = rb.incomeDate || rb.rebilledAt;
        if (d) dates.push(toISODate(d));
      });
      const inRangeDates = activeRange ? dates.filter((d) => inRange(d, activeRange.from, activeRange.to)) : dates;
      const pick = inRangeDates.length > 0 ? inRangeDates.sort().slice(-1)[0] : dates.sort().slice(-1)[0];
      return pick || toISODate(item.createdAt) || "Unknown";
    }
    return item.createdAt ? toISODate(item.createdAt) : "Unknown";
  };

  const groupByDate = (list) => {
    const grouped = {};
    list.forEach((item) => {
      const date = getGroupDate(item);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });
    return grouped;
  };

  const groupedData = groupByDate(data);

  /* TOTAL — rebill-safe, range-restricted when Transaction Date is active */
  const totalService = data.reduce((sum, i) => sum + getIncomeTotal(i, activeRange), 0);
  const totalSpare   = data.reduce((sum, i) => sum + getSpareTotal(i, activeRange), 0);
  const grandTotal   = totalService + totalSpare;

  const handlePrint = () => window.print();

  const handleExcelDownload = () => {
    const excelRows = [];

    Object.keys(groupedData).sort().forEach((date) => {
      const items = groupedData[date];

      // Date header
      excelRows.push({
        "Job No": `📅 ${date}`, "Name": "", "Engineer": "",
        "Received": "", "Repaired": "", "Delivered": "",
        "Service ₹": "", "Spare ₹": "", "Total ₹": "",
      });

      // Data rows
      items.forEach((item) => {
        const s  = getIncomeTotal(item, activeRange);
        const sp = getSpareTotal(item, activeRange);
        excelRows.push({
          "Job No": item.jobSheetNo || "-",
          "Name": item.customer?.name || "-",
          "Engineer": item.service?.engineer || "-",
          "Received": item.createdAt ? toISODate(item.createdAt) : "-",
          "Repaired": item.service?.repairDate ? toISODate(item.service.repairDate) : "-",
          "Delivered": item.service?.deliveryDate ? toISODate(item.service.deliveryDate) : "-",
          "Service ₹": s.toFixed(2),
          "Spare ₹": sp.toFixed(2),
          "Total ₹": (s + sp).toFixed(2),
        });
      });

      // Sub total
      const sTotal  = items.reduce((sum, i) => sum + getIncomeTotal(i, activeRange), 0);
      const spTotal = items.reduce((sum, i) => sum + getSpareTotal(i, activeRange), 0);
      excelRows.push({
        "Job No": "", "Name": "", "Engineer": "", "Received": "",
        "Repaired": "", "Delivered": "Sub Total",
        "Service ₹": sTotal.toFixed(2),
        "Spare ₹": spTotal.toFixed(2),
        "Total ₹": (sTotal + spTotal).toFixed(2),
      });

      // Blank row
      excelRows.push({
        "Job No": "", "Name": "", "Engineer": "", "Received": "",
        "Repaired": "", "Delivered": "", "Service ₹": "", "Spare ₹": "", "Total ₹": "",
      });
    });

    // Grand total
    excelRows.push({
      "Job No": "", "Name": "", "Engineer": "", "Received": "",
      "Repaired": "", "Delivered": "GRAND TOTAL",
      "Service ₹": totalService.toFixed(2),
      "Spare ₹": totalSpare.toFixed(2),
      "Total ₹": grandTotal.toFixed(2),
    });

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Engineer Value Report");
    XLSX.writeFile(wb, `EngineerValueReport_${dateFilterType}_${fromDate || "All"}_to_${toDate || "All"}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">

      {/* 🔥 HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Engineer Value Report
        </h1>
        <p className="text-gray-500 text-sm">
          Service value report by engineer
        </p>
      </div>

      {/* 🔥 FILTER BAR */}
      <div className="bg-white shadow-md rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center print:hidden">

        <select
          value={engineer}
          onChange={(e) => setEngineer(e.target.value)}
          className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Engineers</option>
          {engineerList.map(e => (
            <option key={e._id} value={e.name}>
              {e.name}
            </option>
          ))}
        </select>

        {/* ✅ NEW — Date Type selector */}
        <select
          value={dateFilterType}
          onChange={(e) => setDateFilterType(e.target.value)}
          className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 font-medium"
        >
          <option value="received">Received Date</option>
          <option value="repaired">Repaired Date</option>
          <option value="delivered">Delivered Date</option>
          <option value="transaction">Transaction Date (recommended for monthly revenue)</option>
        </select>

        <input
          type="date"
          className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />

        <input
          type="date"
          className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />

        {/* ✅ NEW — Job No / Name / Phone search */}
        <input
          type="text"
          placeholder="Search: Job No / Name / Phone"
          className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 w-56"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <button
          onClick={fetchReport}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow disabled:opacity-60"
        >
          {loading ? "Loading..." : "Load Report"}
        </button>

        {(engineer || fromDate || toDate || searchText) && (
          <button
            onClick={handleClear}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg shadow"
          >
            Clear
          </button>
        )}

        <button
          onClick={handlePrint}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
        >
          Print 
        </button>

        <button
          onClick={handleExcelDownload}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg shadow"
        >
          📥 Excel Download
        </button>
      </div>

      {/* 🔥 REPORT CARD */}
      <div className="bg-white rounded-xl shadow-lg border">

        {/* HEADER */}
        <div className="flex justify-between items-center flex-wrap gap-4 border-b p-4 bg-gray-50 rounded-t-xl">

          <div className="text-gray-600 text-sm">
            <span className="font-medium">Engineer:</span>{" "}
            <span className="font-bold text-gray-800">
              {engineer || "All"}
            </span>
            <br />
            <span className="font-medium">Total Jobs:</span>{" "}
            <span className="font-bold text-gray-800">{data.length}</span>
          </div>

          <div className="text-sm text-gray-600 text-right">
            <p><b>Filtered by:</b> {dateTypeLabel}</p>
            <p><b>From:</b> {fromDate || "-"} &nbsp; <b>To:</b> {toDate || "-"}</p>
          </div>

        </div>

        {/* 🔥 TABLE */}
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm border-collapse">

            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr className="text-gray-700">
                <th className="p-3 border">Job No</th>
                <th className="p-3 border">Name</th>
                 <th className="p-3 border">Engineer</th>  
                <th className="p-3 border">Received</th>
                <th className="p-3 border">Repaired</th>
                <th className="p-3 border">Delivered</th>
                <th className="p-3 border">Service</th>
                <th className="p-3 border">Spare</th>
                <th className="p-3 border">Total</th>
              </tr>
            </thead>

            <tbody>

              {loading && (
                <tr>
                  <td colSpan="9" className="text-center p-6 text-gray-400">
                    ⏳ Loading...
                  </td>
                </tr>
              )}

              {!loading && Object.keys(groupedData).length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center p-6 text-gray-400">
                    No Data Found
                  </td>
                </tr>
              )}

              {!loading && Object.keys(groupedData)
                .sort()
                .map((date, idx) => {

                  const items = groupedData[date];

                  const serviceTotal = items.reduce((sum, i) => sum + getIncomeTotal(i, activeRange), 0);
                  const spareTotal   = items.reduce((sum, i) => sum + getSpareTotal(i, activeRange), 0);
                  const total = serviceTotal + spareTotal;

                  return (
                    <React.Fragment key={idx}>

                      {/* DATE */}
                      <tr>
                        <td colSpan="9" className="p-2 bg-blue-50 font-semibold border">
                          📅 {date}
                        </td>
                      </tr>

                      {/* ROWS */}
                      {items.map((item, i) => {
                        const s  = getIncomeTotal(item, activeRange);
                        const sp = getSpareTotal(item, activeRange);

                        return (
                          <tr
                            key={item._id || i}
                            className={`border-b hover:bg-gray-50 ${
                              i % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            <td className="p-2 border">{item.jobSheetNo}</td>
                            <td className="p-2 border">{item.customer?.name || "-"}</td>
                            <td className="p-2 border font-medium text-blue-700">
  {item.service?.engineer || "-"}  {/* ✅ Engineer name */}
</td>

                            <td className="p-2 border">
                              {item.createdAt ? toISODate(item.createdAt) : "-"}
                            </td>

                            <td className="p-2 border">
                              {item.service?.repairDate ? toISODate(item.service.repairDate) : "-"}
                            </td>

                            <td className="p-2 border">
                              {item.service?.deliveryDate ? toISODate(item.service.deliveryDate) : "-"}
                            </td>

                            <td className="p-2 border text-right">₹ {s.toFixed(2)}</td>
                            <td className="p-2 border text-right">₹ {sp.toFixed(2)}</td>
                            <td className="p-2 border text-right font-semibold">
                              ₹ {(s + sp).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* SUB TOTAL */}
                      <tr className="font-semibold bg-gray-100">
                        <td colSpan="6" className="p-2 border text-right">
                          Sub Total
                        </td>
                        <td className="p-2 border text-right">
                          ₹ {serviceTotal.toFixed(2)}
                        </td>
                        <td className="p-2 border text-right">
                          ₹ {spareTotal.toFixed(2)}
                        </td>
                        <td className="p-2 border text-right">
                          ₹ {total.toFixed(2)}
                        </td>
                      </tr>

                    </React.Fragment>
                  );
                })}

              {/* GRAND TOTAL */}
              {!loading && Object.keys(groupedData).length > 0 && (
                <tr className="font-bold bg-green-100">
                  <td colSpan="6" className="p-2 border text-right">
                    Grand Total
                  </td>
                  <td className="p-2 border text-right">
                    ₹ {totalService.toFixed(2)}
                  </td>
                  <td className="p-2 border text-right">
                    ₹ {totalSpare.toFixed(2)}
                  </td>
                  <td className="p-2 border text-right">
                    ₹ {grandTotal.toFixed(2)}
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* PRINT */}
      <style>
        {`
          @media print {
            body {
              background: white;
            }
            .print\\:hidden {
              display: none;
            }
          }
        `}
      </style>

    </div>
  );
};

export default EngineerValueReport;