import React, { useEffect, useState } from "react";
import axios from "axios";

const EngineerReportPage = () => {
  const [data, setData] = useState([]);
  const [groupedData, setGroupedData] = useState({});

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
const API = import.meta.env.VITE_API_URL;
  /* FETCH */
  const fetchData = async () => {
    try {
      const res = await axios.get(
        `${API}/api/jobsheets/filter`
      );
      setData(res.data);
      processData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed ❌");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* PROCESS */
  const processData = (rawData) => {
    let filtered = [...rawData];

    if (search) {
      filtered = filtered.filter((item) =>
        item.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.customer?.contact?.includes(search)
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

    const grouped = {};

    filtered.forEach((item) => {
      const eng =
        item.service?.engineer?.trim()
          ? item.service.engineer.trim()
          : "No Engineer";

      if (!grouped[eng]) grouped[eng] = [];
      grouped[eng].push(item);
    });

    setGroupedData(grouped);
  };

  const applyFilter = () => processData(data);

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
          Engineer Reports
        </h1>
        <p className="text-gray-500 text-sm">
          Engineer-wise job tracking report
        </p>
      </div>

      {/* 🔥 FILTER BAR */}
      <div className="bg-white shadow-md rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center print:hidden">

        <input
          type="text"
          placeholder="Search name / contact"
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

      {/* 🔥 GROUPED SECTIONS */}
      {Object.keys(groupedData).length > 0 ? (
        Object.entries(groupedData).map(([engineer, records], idx) => (

          <div key={idx} className="mb-6 bg-white rounded-xl shadow-lg border">

            {/* ENGINEER HEADER */}
            <div className="bg-blue-50 px-4 py-3 font-semibold text-gray-700 border-b rounded-t-xl">
              👨‍🔧 {engineer} 
              <span className="ml-2 text-sm text-gray-500">
                ({records.length} jobs)
              </span>
            </div>

            {/* TABLE */}
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm border-collapse">

                <thead className="sticky top-0 bg-gray-100 z-10">
                  <tr className="text-gray-700">
                    <th className="p-3 border">SL No</th>
                    <th className="p-3 border">Customer</th>
                    <th className="p-3 border">Contact</th>
                    <th className="p-3 border">Saved Date</th>
                    <th className="p-3 border">Delivered Date</th>
                    <th className="p-3 border">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {records.map((item, i) => (
                    <tr
                      key={i}
                      className={`border-b hover:bg-gray-50 ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="p-2 border">{i + 1}</td>

                      <td className="p-2 border font-medium text-gray-700">
                        {item.customer?.name || "-"}
                      </td>

                      <td className="p-2 border">
                        {item.customer?.contact || "-"}
                      </td>

                      <td className="p-2 border">
                        {new Date(item.createdAt)
                          .toISOString()
                          .slice(0, 10)}
                      </td>

                      <td className="p-2 border">
                        {item.service?.deliveryDate
                          ? new Date(item.service.deliveryDate)
                              .toISOString()
                              .slice(0, 10)
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
                  ))}
                </tbody>

              </table>
            </div>

          </div>

        ))
      ) : (
        <p className="text-center mt-6 text-gray-400">
          No Data Found
        </p>
      )}

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

export default EngineerReportPage;