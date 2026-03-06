import React, { useState, useEffect } from "react";
import axios from "axios";

const EngineerValueReport = () => {
  const [engineer, setEngineer] = useState("");
  const [engineerList, setEngineerList] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState([]);
  const API = import.meta.env.VITE_API_URL;

  /* LOAD ENGINEERS */
  useEffect(() => {
    axios.get(`${API}/api/engineers`)
      .then(res => setEngineerList(res.data))
      .catch(err => console.error(err));
  }, []);

  /* FETCH */
  const fetchReport = async () => {
    try {
      const res = await axios.get(
        `${API}/api/jobsheets/filter`,
        { params: { fromDate, toDate } }
      );

      let filtered = res.data;

      /* DATE FILTER */
      filtered = filtered.filter(item => {
        if (!item.service?.repairDate) return false;

        const date = new Date(item.service.repairDate)
          .toISOString()
          .slice(0, 10);

        if (fromDate && !toDate) return date === fromDate;
        if (fromDate && toDate) return date >= fromDate && date <= toDate;

        return true;
      });

      /* ENGINEER FILTER */
      if (engineer) {
        filtered = filtered.filter(
          item =>
            item.service?.engineer?.trim().toLowerCase() ===
            engineer.toLowerCase()
        );
      }

      setData(filtered);

    } catch (err) {
      console.error(err);
      alert("Report load failed ❌");
    }
  };

  /* GROUP */
  const groupByDate = (data) => {
    const grouped = {};
    data.forEach(item => {
      if (!item.service?.repairDate) return;

      const date = new Date(item.service.repairDate)
        .toISOString()
        .slice(0, 10);

      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });
    return grouped;
  };

  const groupedData = groupByDate(data);

  /* TOTAL */
  const totalService = data.reduce(
    (sum, i) => sum + (i.service?.serviceCharge || 0),
    0
  );

  const totalSpare = data.reduce(
    (sum, i) => sum + (i.service?.spareCharge || 0),
    0
  );

  const grandTotal = totalService + totalSpare;

  const handlePrint = () => window.print();

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
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Received</th>
                <th className="p-3 border">Repaired</th>
                <th className="p-3 border">Delivered</th>
                <th className="p-3 border">Service</th>
                <th className="p-3 border">Spare</th>
                <th className="p-3 border">Total</th>
              </tr>
            </thead>

            <tbody>

              {Object.keys(groupedData).length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center p-6 text-gray-400">
                    No Data Found
                  </td>
                </tr>
              )}

              {Object.keys(groupedData)
                .sort()
                .map((date, idx) => {

                  const items = groupedData[date];

                  const serviceTotal = items.reduce(
                    (sum, i) => sum + (i.service?.serviceCharge || 0),
                    0
                  );

                  const spareTotal = items.reduce(
                    (sum, i) => sum + (i.service?.spareCharge || 0),
                    0
                  );

                  const total = serviceTotal + spareTotal;

                  return (
                    <React.Fragment key={idx}>

                      {/* DATE */}
                      <tr>
                        <td colSpan="8" className="p-2 bg-blue-50 font-semibold border">
                          📅 {date}
                        </td>
                      </tr>

                      {/* ROWS */}
                      {items.map((item, i) => {
                        const s = item.service?.serviceCharge || 0;
                        const sp = item.service?.spareCharge || 0;

                        return (
                          <tr
                            key={i}
                            className={`border-b hover:bg-gray-50 ${
                              i % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            <td className="p-2 border">{item.jobSheetNo}</td>
                            <td className="p-2 border">{item.customer?.name || "-"}</td>

                            <td className="p-2 border">
                              {item.createdAt
                                ? new Date(item.createdAt).toISOString().slice(0, 10)
                                : "-"}
                            </td>

                            <td className="p-2 border">
                              {item.service?.repairDate
                                ? new Date(item.service.repairDate).toISOString().slice(0, 10)
                                : "-"}
                            </td>

                            <td className="p-2 border">
                              {item.service?.deliveryDate
                                ? new Date(item.service.deliveryDate).toISOString().slice(0, 10)
                                : "-"}
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
                        <td colSpan="5" className="p-2 border text-right">
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
              <tr className="font-bold bg-green-100">
                <td colSpan="5" className="p-2 border text-right">
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