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

  const processData = (jobsheets) => {
    const grouped = {};
    let gTotal = 0;

    jobsheets.forEach((item) => {
      const jobSheetNo = item.jobSheetNo;
      const name       = item.customer?.name || "";
      const repairDate = item.service?.repairDate?.slice(0, 10) || "";
      const revenueEntries = item.service?.revenueEntries || [];

      let entries = [];
      if (revenueEntries.length > 0) {
        revenueEntries.forEach((e) => {
          const amt = Number(e.income || 0);
          if (amt > 0) {
            const d = e.date ? new Date(e.date).toISOString().slice(0, 10) : repairDate;
            entries.push({ date: d, amount: amt });
          }
        });
      } else {
        const amt = Number(item.service?.income || 0);
        if (amt > 0) entries.push({ date: repairDate, amount: amt });
      }

      entries.forEach((e) => {
        if (fromDate && e.date < fromDate) return;
        if (toDate && e.date > toDate) return;
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push({ jobSheetNo, name, amount: e.amount });
        gTotal += e.amount;
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
        rows.push({ "Date": date, "SL No": i + 1, "Job Sheet": item.jobSheetNo, "Customer": item.name, "Amount": item.amount });
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
        <h1 className="text-2xl font-bold">💵 Income Value Report</h1>
        <p className="text-sm text-gray-500">Date-wise income entries</p>
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
              <th className="border p-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedData).map(([date, records], idx) => {
              const subTotal = records.reduce((sum, r) => sum + Number(r.amount), 0);
              return (
                <React.Fragment key={idx}>
                  <tr className="bg-blue-50 font-semibold">
                    <td colSpan="4" className="p-3 border">📅 {date}</td>
                  </tr>
                  {records.map((item, i) => (
                    <tr key={i}>
                      <td className="border p-2">{i + 1}</td>
                      <td className="border p-2">{item.jobSheetNo}</td>
                      <td className="border p-2">{item.name}</td>
                      <td className="border p-2 font-semibold">₹ {item.amount}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan="3" className="text-right p-2 border">Sub Total</td>
                    <td className="p-2 border">₹ {subTotal}</td>
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="bg-green-100 font-bold text-lg">
              <td colSpan="3" className="text-right p-3 border">Grand Total</td>
              <td className="p-3 border">₹ {grandTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <style>{`@media print { .print\\:hidden{ display:none; } body{ background:white; } }`}</style>
    </div>
  );
};

export default IncomeReportPage;