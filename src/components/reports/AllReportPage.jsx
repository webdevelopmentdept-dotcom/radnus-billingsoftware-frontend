import React, { useEffect, useState } from "react";
import axios from "axios";

const AllReportPage = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const API = import.meta.env.VITE_API_URL;

  /* FETCH DATA */
  const fetchData = async () => {
    try {
      const res = await axios.get(
        `${API}/api/jobsheets/filter`
      );
      setData(res.data);
      setFilteredData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed ❌");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* FILTER */
  const applyFilter = () => {
    let filtered = [...data];

    if (search) {
      filtered = filtered.filter((item) =>
        item.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.customer?.contact?.includes(search) ||
        item.jobSheetNo?.toLowerCase().includes(search.toLowerCase()) ||
        item.device?.imei?.includes(search)
      );
    }

    if (fromDate && toDate) {
      filtered = filtered.filter((item) => {
        const date = new Date(item.createdAt)
          .toISOString()
          .slice(0, 10);
        return date >= fromDate && date <= toDate;
      });
    }

    if (fromDate && !toDate) {
      filtered = filtered.filter((item) => {
        const date = new Date(item.createdAt)
          .toISOString()
          .slice(0, 10);
        return date === fromDate;
      });
    }

    setFilteredData(filtered);
  };

  const handlePrint = () => window.print();

  /* STATUS STYLE */
  const getStatusStyle = (status) => {
    if (status === "Delivered") return "bg-green-100 text-green-700";
    if (status === "Pending") return "bg-yellow-100 text-yellow-700";
    if (status === "Received") return "bg-blue-100 text-blue-700";
    if (status === "Delivered NR/NA") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">

      {/* 🔥 HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          All Reports
        </h1>
        <p className="text-gray-500 text-sm">
          Complete job sheet report overview
        </p>
      </div>

      {/* 🔥 FILTER BAR */}
      <div className="bg-white shadow-md rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center print:hidden">

        <input
          type="text"
          placeholder="Search name / contact / job / IMEI"
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
          onClick={applyFilter}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
        >
          Apply Filter
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

        {/* HEADER */}
        <div className="flex justify-between items-center flex-wrap gap-4 border-b p-4 bg-gray-50 rounded-t-xl">

          <div className="text-gray-600 text-sm">
            <span className="font-medium">Total Records:</span>{" "}
            <span className="font-bold text-gray-800">
              {filteredData.length}
            </span>
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
                <th className="p-3 border">SL No</th>
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Contact</th>
                <th className="p-3 border">Saved Date</th>
                <th className="p-3 border">Delivered Date</th>
                <th className="p-3 border">Engineer</th>
                <th className="p-3 border">Status</th>
                <th className="p-3 border">Model</th>
                <th className="p-3 border">Problem</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr
                    key={index}
                    className={`border-b hover:bg-gray-50 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="p-2 border">{index + 1}</td>

                    <td className="p-2 border font-medium text-gray-700">
                      {item.customer?.name || "-"}
                    </td>

                    <td className="p-2 border">
                      {item.customer?.contact || "-"}
                    </td>

                    <td className="p-2 border">
                      {new Date(item.createdAt).toISOString().slice(0, 10)}
                    </td>

                    <td className="p-2 border">
                      {item.service?.deliveryDate
                        ? new Date(item.service.deliveryDate)
                            .toLocaleDateString("en-CA")
                        : "-"}
                    </td>

                    <td className="p-2 border">
                      {item.service?.engineer || "-"}
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

                    <td className="p-2 border">
                      {item.device?.model || "-"}
                    </td>

                    <td className="p-2 border">
                      {item.visualIssues?.join(", ") || "-"}
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="text-center p-6 text-gray-400">
                    No Data Found
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
            .print\\:hidden {
              display: none;
            }
            body {
              background: white;
            }
          }
        `}
      </style>

    </div>
  );
};

export default AllReportPage;