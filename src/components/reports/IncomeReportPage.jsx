import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const IncomeReportPage = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [groupedData, setGroupedData] = useState({});
  const [grandTotal, setGrandTotal] = useState(0);
  const API = import.meta.env.VITE_API_URL;

  const fetchReport = async () => {
    try {
      const res = await axios.get(`${API}/api/jobsheets/filter`, { params: {} });
      processData(res.data);
    } catch (err) {
      console.error(err);
      alert("Report load failed ❌");
    }
  };

  useEffect(() => { fetchReport(); }, []);

  /* ================= REBILL HISTORY DEDUP (FIX) =================
     Same fix as ValueReport.jsx — only fall back to a rebillHistory snapshot
     for a cycle when revenueEntries has NO entry inside that cycle's date
     window. Most jobs already have their pre-rebill income tracked date-wise
     in revenueEntries (via the normal Update flow); adding rebillHistory
     unconditionally on top of that double-counted them. */
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

  // ✅ AFTER — walk revenueEntries (one row per in-cycle date) AND the
  // uncovered rebillHistory cycles (one row per past invoiced cycle that
  // revenueEntries never tracked) so every past rebill's income shows on ITS
  // OWN date, same as ValueReport/ServiceReport — without double-counting
  // cycles revenueEntries already has.
  const processData = (jobsheets) => {
    const grouped = {};
    let gTotal = 0;

    jobsheets.forEach((item) => {
      const entries = item.service?.revenueEntries || [];
      const uncoveredRebills = getUncoveredRebillEntries(item);
      const repairDate = item.service?.repairDate?.slice(0, 10) || "";

      const pushRow = (date, amt) => {
        if (!amt || amt <= 0 || !date) return;
        const d = new Date(date).toISOString().slice(0, 10);
        if (fromDate && d < fromDate) return;
        if (toDate && d > toDate) return;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push({
          jobSheetNo: item.jobSheetNo,
          name: item.customer?.name || "",
          engineer: item.service?.engineer || "-",
          amount: amt,
        });
        gTotal += amt;
      };

      if (entries.length > 0) {
        // ✅ one row per in-cycle date entry — Aug's ₹1000 and Sep's ₹500
        // both show, each on its own date, instead of only the current
        // top-level value.
        entries.forEach((e) => pushRow(e.date, Number(e.income || 0)));
      } else if ((item.rebillHistory || []).length === 0) {
        // job never rebilled and never went through revenueEntries — old
        // single-value behaviour, unchanged
        const rawDate = item.service?.incomeDate || repairDate;
        pushRow(rawDate, Number(item.service?.income || 0));
      }

      // ✅ NEW — only the rebill cycles revenueEntries genuinely never
      // tracked, sourced from rebillHistory, dated by that cycle's own
      // incomeDate — not "today" or a guessed fallback.
      uncoveredRebills.forEach((rb) => {
        const d = rb.incomeDate || rb.rebilledAt || repairDate;
        pushRow(d, Number(rb.income || 0));
      });
    });

    const sorted = {};
    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach((k) => (sorted[k] = grouped[k]));
    setGroupedData(sorted);
    setGrandTotal(gTotal);
  };
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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">💵 Income Report</h1>
        <p className="text-sm text-gray-500">Date-wise income (grouped by the date income was recorded)</p>
      </div>

      <div className="bg-white p-5 rounded-xl shadow mb-6 flex flex-wrap gap-4 items-end print:hidden">
        <div className="flex flex-col">
          <label className="text-xs mb-1 text-gray-500">From Date</label>
          <input type="date" className="border px-3 py-2 rounded-lg" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-xs mb-1 text-gray-500">To Date</label>
          <input type="date" className="border px-3 py-2 rounded-lg" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <button onClick={fetchReport} className="bg-black text-white px-6 py-2 rounded-lg">🔍 Search</button>
        <button onClick={() => { setFromDate(""); setToDate(""); fetchReport(); }} className="bg-gray-500 text-white px-6 py-2 rounded-lg">Clear</button>
        <button onClick={handlePrint} className="bg-green-600 text-white px-6 py-2 rounded-lg">Print</button>
        <button onClick={handleExcel} className="bg-blue-600 text-white px-6 py-2 rounded-lg" disabled={Object.keys(groupedData).length === 0}>⬇ Excel</button>
      </div>

      <div className="bg-white rounded-xl shadow">
        <table className="w-full border text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-3">SL</th>
              <th className="border p-3">JobSheet</th>
              <th className="border p-3">Customer</th>
              <th className="border p-3">Engineer</th>
              <th className="border p-3">Income Amount</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(groupedData).length === 0 && (
              <tr>
                <td colSpan="5" className="text-center p-6 text-gray-400">No Data Found</td>
              </tr>
            )}

            {Object.entries(groupedData).map(([date, records], idx) => {
              const subTotal = records.reduce((sum, r) => sum + Number(r.amount), 0);
              return (
                <React.Fragment key={idx}>
                  <tr className="bg-blue-50 font-semibold">
                    <td colSpan="5" className="p-3 border">📅 {date}</td>
                  </tr>
                  {records.map((item, i) => (
                    <tr key={i}>
                      <td className="border p-2">{i + 1}</td>
                      <td className="border p-2">{item.jobSheetNo}</td>
                      <td className="border p-2">{item.name}</td>
                      <td className="border p-2">{item.engineer}</td>
                      <td className="border p-2 font-semibold">₹ {item.amount}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan="4" className="text-right p-2 border">Sub Total</td>
                    <td className="p-2 border">₹ {subTotal}</td>
                  </tr>
                </React.Fragment>
              );
            })}

            {Object.keys(groupedData).length > 0 && (
              <tr className="bg-green-100 font-bold text-lg">
                <td colSpan="4" className="text-right p-3 border">Grand Total</td>
                <td className="p-3 border">₹ {grandTotal}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`@media print { .print\\:hidden{ display:none; } body{ background:white; } }`}</style>
    </div>
  );
};

export default IncomeReportPage;