import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const toISODate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const inRange = (isoDate, from, to) => {
  if (!isoDate) return false;
  if (from && isoDate < from) return false;
  if (to && isoDate > to) return false;
  return true;
};

const EngineerReportPage = () => {
  const [rawData, setRawData] = useState([]); // everything from the backend, unfiltered
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // ✅ NEW — Date Type selector: which date column the From/To range filters
  // by. "Saved Date" (createdAt) and "Delivered Date" are the only two dated
  // columns this report actually shows, so those are the two options.
  const [dateFilterType, setDateFilterType] = useState("received"); // "received" | "delivered"
  const [engineerList, setEngineerList] = useState([]);
  const [selectedEngineer, setSelectedEngineer] = useState("");
  const API = import.meta.env.VITE_API_URL;

  /* FETCH — once on load. All filtering (engineer, search, date type/range)
     now happens client-side below via useMemo, so every filter re-applies
     instantly as you type/select — no need to click "Apply Filter" for it
     to take effect. The button is kept as a manual re-fetch ("Refresh"). */
  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobRes, engRes] = await Promise.all([
        axios.get(`${API}/api/jobsheets/filter`),
        axios.get(`${API}/api/engineers`),
      ]);
      setRawData(jobRes.data || []);
      setEngineerList(engRes.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed ❌");
      setRawData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleClear = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setDateFilterType("received");
    setSelectedEngineer("");
  };

  /* ================= FILTER — client-side, live ================= */
  const filtered = useMemo(() => {
    let out = rawData;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((item) =>
        (item.customer?.name || "").toLowerCase().includes(q) ||
        (item.customer?.contact || "").includes(search.trim()) ||
        (item.jobSheetNo || "").toLowerCase().includes(q)
      );
    }

    // ✅ FIX — a toDate-only range (no fromDate) previously matched nothing;
    // now From/To both work independently or together, same as the other reports.
    if (fromDate || toDate) {
      out = out.filter((item) => {
        const d = dateFilterType === "delivered"
          ? (item.service?.deliveryDate ? toISODate(item.service.deliveryDate) : "")
          : toISODate(item.createdAt);
        return inRange(d, fromDate, toDate);
      });
    }

    if (selectedEngineer) {
      out = out.filter(
        (item) => item.service?.engineer?.trim().toLowerCase() === selectedEngineer.toLowerCase()
      );
    }

    return out;
  }, [rawData, search, fromDate, toDate, dateFilterType, selectedEngineer]);

  /* ================= GROUP BY ENGINEER ================= */
  const groupedData = useMemo(() => {
    const grouped = {};
    filtered.forEach((item) => {
      const eng = item.service?.engineer?.trim() || "No Engineer";
      if (!grouped[eng]) grouped[eng] = [];
      grouped[eng].push(item);
    });
    return grouped;
  }, [filtered]);

  const dateTypeLabel = dateFilterType === "delivered" ? "Delivered Date" : "Saved Date";

  const handlePrint = () => window.print();

  const getStatusStyle = (status) => {
    if (status === "Delivered") return "bg-green-100 text-green-700";
    if (status === "Pending") return "bg-yellow-100 text-yellow-700";
    if (status === "Received") return "bg-blue-100 text-blue-700";
    if (status === "Delivered NR/NA") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  const handleExcelDownload = () => {
    const excelRows = [];

    Object.entries(groupedData).forEach(([engineer, records]) => {
      // Engineer header row
      excelRows.push({
        "SL No": `👨‍🔧 ${engineer} (${records.length} jobs)`,
        "Job No": "", "Customer": "", "Contact": "",
        "Saved Date": "", "Delivered Date": "", "Engineer": "", "Status": "",
      });

      // Data rows
      records.forEach((item, i) => {
        excelRows.push({
          "SL No": i + 1,
          "Job No": item.jobSheetNo || "-",
          "Customer": item.customer?.name || "-",
          "Contact": item.customer?.contact || "-",
          "Saved Date": toISODate(item.createdAt),
          "Delivered Date": item.service?.deliveryDate ? toISODate(item.service.deliveryDate) : "-",
          "Engineer": item.service?.engineer || "No Engineer",
          "Status": item.device?.mobileStatus || "-",
        });
      });

      // Blank separator
      excelRows.push({
        "SL No": "", "Job No": "", "Customer": "", "Contact": "",
        "Saved Date": "", "Delivered Date": "", "Engineer": "", "Status": "",
      });
    });

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Engineer Report");
    XLSX.writeFile(wb, `EngineerReport_${dateFilterType}_${fromDate || "All"}_to_${toDate || "All"}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Engineer Reports</h1>
        <p className="text-gray-500 text-sm">Engineer-wise job tracking report</p>
      </div>

      <div className="bg-white shadow-md rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center print:hidden">

        {/* ENGINEER DROPDOWN */}
        <select
          value={selectedEngineer}
          onChange={(e) => setSelectedEngineer(e.target.value)}
          className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Engineers</option>
          {engineerList.map((e) => (
            <option key={e._id} value={e.name}>{e.name}</option>
          ))}
        </select>

        {/* ✅ NEW — Date Type selector */}
        <select
          value={dateFilterType}
          onChange={(e) => setDateFilterType(e.target.value)}
          className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400 font-medium"
        >
          <option value="received">Saved Date</option>
          <option value="delivered">Delivered Date</option>
        </select>

        <input
          type="text"
          placeholder="Search name / contact / job no"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-400"
        />

        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>

        {(search || fromDate || toDate || selectedEngineer) && (
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

      {(fromDate || toDate) && (
        <p className="text-sm text-gray-500 mb-3">
          Filtered by <b className="text-gray-700">{dateTypeLabel}</b>: {fromDate || "All"} → {toDate || "All"}
        </p>
      )}

      {/* GROUPED SECTIONS */}
      {loading ? (
        <p className="text-center mt-6 text-gray-400">⏳ Loading...</p>
      ) : Object.keys(groupedData).length > 0 ? (
        Object.entries(groupedData).map(([engineer, records], idx) => (
          <div key={idx} className="mb-6 bg-white rounded-xl shadow-lg border">

            <div className="bg-blue-50 px-4 py-3 font-semibold text-gray-700 border-b rounded-t-xl">
              👨‍🔧 {engineer}
              <span className="ml-2 text-sm text-gray-500">({records.length} jobs)</span>
            </div>

            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-gray-100 z-10">
                  <tr className="text-gray-700">
                    <th className="p-3 border">SL No</th>
                    <th className="p-3 border">Job No</th>
                    <th className="p-3 border">Customer</th>
                    <th className="p-3 border">Contact</th>
                    <th className="p-3 border">Saved Date</th>
                    <th className="p-3 border">Delivered Date</th>
                    <th className="p-3 border">Engineer</th>

                    <th className="p-3 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((item, i) => (
                    <tr key={item._id || i} className={`border-b hover:bg-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="p-2 border">{i + 1}</td>
                      <td className="p-2 border font-medium text-blue-700">{item.jobSheetNo || "-"}</td>
                      <td className="p-2 border font-medium text-gray-700">{item.customer?.name || "-"}</td>
                      <td className="p-2 border">{item.customer?.contact || "-"}</td>
                      <td className="p-2 border">{toISODate(item.createdAt)}</td>
                      <td className="p-2 border">
                        {item.service?.deliveryDate ? toISODate(item.service.deliveryDate) : "-"}
                      </td>
                      <td className="p-2 border font-medium text-purple-700">
  {item.service?.engineer || "No Engineer"}
</td>
                      <td className="p-2 border">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(item.device?.mobileStatus)}`}>
                          {item.device?.mobileStatus || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center mt-6 text-gray-400">No Data Found</p>
      )}

      <style>{`
        @media print {
          .print\\:hidden { display: none; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
};

export default EngineerReportPage;