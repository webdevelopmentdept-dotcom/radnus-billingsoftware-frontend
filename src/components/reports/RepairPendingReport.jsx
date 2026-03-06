import React, { useState } from "react";
import axios from "axios";

const RepairPendingReport = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState([]);
  const API = import.meta.env.VITE_API_URL;

  /* ================= FETCH REPORT ================= */
  const fetchReport = async () => {
    try {
      const res = await axios.get(
        `${API}/api/jobsheets/filter`,
        {
          params: {
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
          },
        }
      );

      let filtered = res.data;

      /* DATE FILTER */
      filtered = filtered.filter((item) => {
        if (!item.createdAt) return false;

        const date = new Date(item.createdAt)
          .toISOString()
          .slice(0, 10);

        if (fromDate && !toDate) return date === fromDate;
        if (fromDate && toDate) return date >= fromDate && date <= toDate;

        return true;
      });

      /* STATUS FILTER */
      filtered = filtered.filter(
  (item) => item.device?.mobileStatus === "Pending"
);

      setData(filtered);
    } catch (err) {
      console.error(err);
      alert("Report load failed ❌");
    }
  };

  /* PRINT */
  const handlePrint = () => window.print();

  /* STATUS STYLE */
  const getStatusStyle = (status) => {
    if (status === "Pending") return "bg-yellow-100 text-yellow-700";
    if (status === "Received") return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">

      {/* 🔥 MAIN HEADER (ONLY ONE TITLE NOW) */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Repair Pending Report
        </h1>
        <p className="text-gray-500 text-sm">
          Track all pending & received repair devices
        </p>
      </div>

      {/* 🔥 ACTION BAR */}
      <div className="bg-white shadow-md rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center print:hidden">

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

        <button
          onClick={fetchReport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
        >
          Load Report
        </button>

        <button
          onClick={handlePrint}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
        >
          Print / Download
        </button>
      </div>

      {/* 🔥 REPORT CARD */}
      <div className="bg-white rounded-xl shadow-lg border">

        {/* ✅ CLEAN HEADER (NO DUPLICATE TITLE) */}
        <div className="flex justify-between items-center flex-wrap gap-4 border-b p-4 bg-gray-50 rounded-t-xl">

          <div className="text-gray-600 text-sm">
            <span className="font-medium">Total Records:</span>{" "}
            <span className="font-bold text-gray-800">{data.length}</span>
          </div>

          <div className="text-sm text-gray-600 text-right">
            <p><b>From:</b> {fromDate || "-"}</p>
            <p><b>To:</b> {toDate || "-"}</p>
          </div>

        </div>

        {/* 🔥 TABLE */}
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm border-collapse">

            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr className="text-gray-700">
                <th className="p-3 border">Job No</th>
                <th className="p-3 border">Customer</th>
                <th className="p-3 border">Make</th>
                <th className="p-3 border">Model</th>
                <th className="p-3 border">Phone</th>
                <th className="p-3 border">Date</th>
                <th className="p-3 border">Fault</th>
                <th className="p-3 border">Status</th>
              </tr>
            </thead>

            <tbody>
              {data.length > 0 ? (
                data.map((item, i) => (
                  <tr
                    key={i}
                    className={`border-b hover:bg-gray-50 ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="p-2 border">{item.jobSheetNo || "-"}</td>

                    <td className="p-2 border font-medium text-gray-700">
                      {item.customer?.name || "-"}
                    </td>

                    <td className="p-2 border">{item.device?.make || "-"}</td>

                    <td className="p-2 border">{item.device?.model || "-"}</td>

                    <td className="p-2 border">
                      {item.customer?.contact || "-"}
                    </td>

                    <td className="p-2 border">
                      {item.createdAt
                        ? new Date(item.createdAt)
                            .toISOString()
                            .slice(0, 10)
                        : "-"}
                    </td>

                    <td className="p-2 border">
                      {item.visualIssues?.length
                        ? item.visualIssues.join(", ")
                        : "-"}
                    </td>

                    <td className="p-2 border">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(
                          item.device?.mobileStatus
                        )}`}
                      >
                        {item.device?.mobileStatus || "-"}
                      </span>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center p-6 text-gray-400">
                    No Data Found
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>

      {/* 🔥 PRINT STYLE */}
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

export default RepairPendingReport;