import React, { useState } from "react";
import axios from "axios";

const DailyRepairedReport = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [summary, setSummary] = useState([]);
  const API = import.meta.env.VITE_API_URL;

  const fetchReport = async () => {
    try {
      const res = await axios.get(
        `${API}/api/jobsheets/filter`,
        { params: { fromDate, toDate } }
      );

      let data = res.data;

      // FILTER ONLY REPAIRED (UNCHANGED)
      data = data.filter(
        item => item.device?.mobileStatus === "Pending"
      );

      // GROUP BY DATE (UNCHANGED)
      const grouped = {};

      data.forEach(item => {
        const date = item.service?.repairDate?.slice(0, 10);

        if (!grouped[date]) grouped[date] = 0;
        grouped[date] += 1;
      });

      const result = Object.keys(grouped).map(date => ({
        date,
        count: grouped[date]
      }));

      setSummary(result);

    } catch (err) {
      console.error(err);
      alert("Failed ❌");
    }
  };

  const totalCount = summary.reduce((sum, i) => sum + i.count, 0);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">

      {/* 🔥 HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Daily Repaired Report
        </h1>
        <p className="text-gray-500 text-sm">
          Daily repaired device summary
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

        {/* 🔥 TABLE */}
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">

            <thead className="bg-gray-100">
              <tr className="text-gray-700">
                <th className="p-3 border text-center">Date</th>
                <th className="p-3 border text-center">Repaired Count</th>
              </tr>
            </thead>

            <tbody>
              {summary.length > 0 ? (
                summary.map((item, i) => (
                  <tr
                    key={i}
                    className={`border-b text-center ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="p-2 border font-medium text-gray-700">
                      {item.date}
                    </td>

                    <td className="p-2 border font-semibold text-green-700">
                      {item.count}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="text-center p-6 text-gray-400">
                    No Data Found
                  </td>
                </tr>
              )}

              {/* TOTAL */}
              <tr className="font-bold bg-green-100 text-center">
                <td className="p-3 border">Total</td>
                <td className="p-3 border">{totalCount}</td>
              </tr>

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

export default DailyRepairedReport;