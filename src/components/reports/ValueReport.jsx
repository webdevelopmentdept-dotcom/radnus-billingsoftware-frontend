import React, { useState } from "react";
import axios from "axios";

const ValueReport = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState([]);
  const API = import.meta.env.VITE_API_URL;

  /* ================= FETCH ================= */
  const fetchReport = async () => {
    try {
      const res = await axios.get(
        `${API}/api/jobsheets/filter`,
        {
          params: { fromDate, toDate }
        }
      );

      let filtered = res.data;

      // DATE FILTER (UNCHANGED)
      filtered = filtered.filter(item => {
        const date = item.service?.repairDate?.slice(0, 10);

        if (fromDate && !toDate) return date === fromDate;
        if (fromDate && toDate) return date >= fromDate && date <= toDate;

        return true;
      });

      setData(filtered);

    } catch (err) {
      console.error(err);
      alert("Report load failed ❌");
    }
  };

  /* ================= GROUP ================= */
  const groupByDate = (data) => {
    const grouped = {};
    data.forEach(item => {
      const date = item.service?.repairDate?.slice(0, 10);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });
    return grouped;
  };

  const groupedData = groupByDate(data);

  /* ================= TOTAL ================= */
  const totalService = data.reduce(
    (sum, item) => sum + (item.service?.serviceCharge || 0),
    0
  );

  const totalSpare = data.reduce(
    (sum, item) => sum + (item.service?.spareCharge || 0),
    0
  );

  const grandTotal = totalService + totalSpare;

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">

      {/* 🔥 HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Value Report
        </h1>
        <p className="text-gray-500 text-sm">
          Service & spare value summary report
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

        {/* HEADER */}
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
                <th className="p-3 border">Name</th>
                <th className="p-3 border">Recd</th>
                <th className="p-3 border">Repd</th>
                <th className="p-3 border">Deld</th>
                <th className="p-3 border">Service</th>
                <th className="p-3 border">Spare</th>
                <th className="p-3 border">Total</th>
              </tr>
            </thead>

            <tbody>
              {Object.keys(groupedData).map((date, idx) => {
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
                      <td colSpan="8" className="p-2 bg-blue-50 font-semibold text-gray-700 border">
                        📅 {date}
                      </td>
                    </tr>

                    {/* ROWS */}
                    {items.map((item, i) => {
                      const service = item.service?.serviceCharge || 0;
                      const spare = item.service?.spareCharge || 0;
                      const rowTotal = service + spare;

                      return (
                        <tr
                          key={i}
                          className={`border-b hover:bg-gray-50 ${
                            i % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="p-2 border">{item.jobSheetNo}</td>
                          <td className="p-2 border">{item.customer?.name}</td>
                          <td className="p-2 border">
                            {item.service?.repairDate?.slice(0, 10)}
                          </td>
                          <td className="p-2 border">
                            {item.service?.repairDate?.slice(0, 10)}
                          </td>
                          <td className="p-2 border">
                            {item.service?.deliveryDate?.slice(0, 10) || "-"}
                          </td>
                          <td className="p-2 border text-right">
                            ₹ {service.toFixed(2)}
                          </td>
                          <td className="p-2 border text-right">
                            ₹ {spare.toFixed(2)}
                          </td>
                          <td className="p-2 border text-right font-semibold">
                            ₹ {rowTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* SUBTOTAL */}
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

export default ValueReport;