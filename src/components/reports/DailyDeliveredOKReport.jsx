import React, { useState } from "react";
import axios from "axios";

const DailyDeliveredOKReport = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const API = import.meta.env.VITE_API_URL;

  const fetchReport = async () => {
    if (!fromDate) {
      alert("Please select From Date ❌");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.get(
        `${API}/api/jobsheets/filter`,
        { params: { fromDate, toDate } }
      );

      let data = res.data;

      // FILTER ONLY DELIVERED (UNCHANGED)
      data = data.filter(
        item => item.device?.mobileStatus === "Delivered"
      );

      // GROUP BY DATE (UNCHANGED)
      const grouped = {};

      data.forEach(item => {
        if (!item.service?.repairDate) return;

        const date = new Date(item.service.repairDate)
          .toLocaleDateString("en-CA");

        if (!grouped[date]) grouped[date] = 0;
        grouped[date] += 1;
      });

      const result = Object.keys(grouped)
        .sort()
        .map(date => ({
          date,
          count: grouped[date]
        }));

      setSummary(result);

    } catch (err) {
      console.error(err);
      alert("Failed ❌");
    } finally {
      setLoading(false);
    }
  };

  const totalCount = summary.reduce((sum, i) => sum + i.count, 0);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">

      {/* 🔥 HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Daily Delivered Report
        </h1>
        <p className="text-gray-500 text-sm">
          Daily delivered device summary
        </p>
      </div>

      {/* 🔥 FILTER BAR */}
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
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load Report"}
        </button>

        <button
          onClick={handlePrint}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
        >
          Print / Download
        </button>
      </div>

      {/* 🔥 REPORT CARD */}
      <div className="bg-white rounded-xl shadow-lg border max-w-xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center border-b p-4 bg-gray-50 rounded-t-xl">

          <div className="text-gray-600 text-sm">
            <span className="font-medium">Total Days:</span>{" "}
            <span className="font-bold text-gray-800">
              {summary.length}
            </span>
          </div>

          <div className="text-sm text-gray-600 text-right">
            <p><b>From:</b> {fromDate || "-"}</p>
            <p><b>To:</b> {toDate || "-"}</p>
          </div>

        </div>

        {/* 🔥 CONTENT */}
        <div className="p-4">

          {/* LOADING */}
          {loading && (
            <p className="text-center text-blue-600 font-medium">
              Loading data...
            </p>
          )}

          {/* EMPTY */}
          {!loading && summary.length === 0 && (
            <p className="text-center text-gray-400 py-6">
              No Delivered Data Found
            </p>
          )}

          {/* TABLE */}
          {summary.length > 0 && (
            <>
              <table className="w-full text-sm border-collapse">

                <thead className="bg-gray-100">
                  <tr className="text-gray-700">
                    <th className="p-3 border text-center">Date</th>
                    <th className="p-3 border text-center">Delivered Count</th>
                  </tr>
                </thead>

                <tbody>
                  {summary.map((item, i) => (
                    <tr
                      key={i}
                      className={`border-b text-center ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="p-2 border font-medium">
                        {item.date}
                      </td>

                      <td className="p-2 border font-semibold text-green-700">
                        {item.count}
                      </td>
                    </tr>
                  ))}

                  {/* TOTAL */}
                  <tr className="font-bold bg-green-100 text-center">
                    <td className="p-3 border">Total</td>
                    <td className="p-3 border">{totalCount}</td>
                  </tr>

                </tbody>
              </table>

              {/* EXTRA TOTAL TEXT */}
              <p className="text-center mt-4 text-sm text-gray-600">
                Total Delivered:{" "}
                <span className="font-bold text-gray-800">
                  {totalCount}
                </span>
              </p>
            </>
          )}

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

export default DailyDeliveredOKReport;