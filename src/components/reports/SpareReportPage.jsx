// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import * as XLSX from "xlsx";
// const SpareReportPage = () => {

//   const [engineers, setEngineers] = useState([]);
//   const [engineer, setEngineer] = useState("");

//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");

//   const [groupedData, setGroupedData] = useState({});
//   const [grandTotal, setGrandTotal] = useState(0);
//   const API = import.meta.env.VITE_API_URL;

//   /* LOAD ENGINEERS */

//   const fetchEngineers = async () => {

//     try {

//       const res = await axios.get(`${API}/api/engineers`);
//       setEngineers(res.data);

//     } catch (err) {

//       console.error(err);

//     }

//   };

//   /* FETCH REPORT */

//   const fetchReport = async () => {

//     try {

//       const res = await axios.get(
//         `${API}/api/jobsheets/filter`,
//         {
//           params: {
//             engineer: engineer || undefined,
//             fromDate: fromDate || undefined,
//             toDate: toDate || undefined
//           }
//         }
//       );

//       processData(res.data);

//     } catch (err) {

//       console.error(err);
//       alert("Report load failed ❌");

//     }

//   };

//   useEffect(() => {

//     fetchEngineers();
//     fetchReport(); // 🔥 Page load → show all spare data

//   }, []);

//   /* PROCESS DATA */

//   const processData = (data) => {

//     const grouped = {};
//     let gTotal = 0;

//     data.forEach(job => {

//       const eng = job.service?.engineer || "No Engineer";

//       if (!job.spareItems || job.spareItems.length === 0) return;

//       if (!grouped[eng]) grouped[eng] = [];

//       job.spareItems.forEach(spare => {

//         grouped[eng].push({

//           jobSheet: job.jobSheetNo,
//           spare: spare.name,
//           qty: spare.qty,
//           rate: spare.rate,
//           amount: spare.amount

//         });

//         gTotal += Number(spare.amount);

//       });

//     });

//     setGroupedData(grouped);
//     setGrandTotal(gTotal);

//   };

//   const handlePrint = () => window.print();
// const handleExcel = () => {
//   const rows = [];

//   Object.entries(groupedData).forEach(([eng, records]) => {
//     records.forEach((item, i) => {
//       rows.push({
//         "Engineer":  eng,
//         "SL No":     i + 1,
//         "Job Sheet": item.jobSheet,
//         "Spare":     item.spare,
//         "Qty":       item.qty,
//         "Rate":      item.rate,
//         "Amount":    item.amount,
//       });
//     });
//   });

//   const ws = XLSX.utils.json_to_sheet(rows);
//   const wb = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(wb, ws, "Spare Report");
//   XLSX.writeFile(wb, `Spare_Report_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.xlsx`);
// };
//   return (

//     <div className="min-h-screen bg-gray-100 p-6">

//       {/* HEADER */}

//       <div className="mb-6">

//         <h1 className="text-2xl font-bold">
//           Spare Value Report
//         </h1>

//         <p className="text-sm text-gray-500">
//           Engineer wise spare usage report
//         </p>

//       </div>

//       {/* FILTER */}

//       <div className="bg-white p-5 rounded-xl shadow mb-6 flex flex-wrap gap-4 items-end print:hidden">

//         {/* ENGINEER */}

//         <div className="flex flex-col">

//           <label className="text-xs mb-1 text-gray-500">
//             Engineer
//           </label>

//           <select
//             className="border px-3 py-2 rounded-lg"
//             value={engineer}
//             onChange={(e)=>setEngineer(e.target.value)}
//           >

//             <option value="">
//               All Engineers
//             </option>

//             {engineers.map((eng)=>(
//               <option key={eng._id} value={eng.name}>
//                 {eng.name}
//               </option>
//             ))}

//           </select>

//         </div>

//         {/* FROM DATE */}

//         <div className="flex flex-col">

//           <label className="text-xs mb-1 text-gray-500">
//             From Date
//           </label>

//           <input
//             type="date"
//             className="border px-3 py-2 rounded-lg"
//             value={fromDate}
//             onChange={(e)=>setFromDate(e.target.value)}
//           />

//         </div>

//         {/* TO DATE */}

//         <div className="flex flex-col">

//           <label className="text-xs mb-1 text-gray-500">
//             To Date
//           </label>

//           <input
//             type="date"
//             className="border px-3 py-2 rounded-lg"
//             value={toDate}
//             onChange={(e)=>setToDate(e.target.value)}
//           />

//         </div>

//         {/* SEARCH */}

//         <button
//           onClick={fetchReport}
//           className="bg-black text-white px-6 py-2 rounded-lg"
//         >
//           🔍 Search
//         </button>

//         {/* PRINT */}

//         <button
//           onClick={handlePrint}
//           className="bg-green-600 text-white px-6 py-2 rounded-lg"
//         >
//           Print 
//         </button>
// <button
//   onClick={handleExcel}
//   className="bg-blue-600 text-white px-6 py-2 rounded-lg"
//   disabled={Object.keys(groupedData).length === 0}
// >
//   ⬇ Excel
// </button>
//       </div>

//       {/* TABLE */}

//       <div className="bg-white rounded-xl shadow">

//         <table className="w-full border text-sm">

//           <thead className="bg-gray-200">

//             <tr>

//               <th className="border p-3">SL</th>
//               <th className="border p-3">JobSheet</th>
//               <th className="border p-3">Spare</th>
//               <th className="border p-3">Qty</th>
//               <th className="border p-3">Rate</th>
//               <th className="border p-3">Amount</th>

//             </tr>

//           </thead>

//           <tbody>

//           {Object.entries(groupedData).map(([eng, records], idx)=>{

//             const subTotal = records.reduce(
//               (sum,r)=>sum + Number(r.amount),
//               0
//             );

//             return (
//               <React.Fragment key={idx}>

//                 <tr className="bg-blue-50 font-semibold">

//                   <td colSpan="6" className="p-3 border">
//                     👨‍🔧 {eng}
//                   </td>

//                 </tr>

//                 {records.map((item,i)=>(
//                   <tr key={i}>

//                     <td className="border p-2">{i+1}</td>
//                     <td className="border p-2">{item.jobSheet}</td>
//                     <td className="border p-2">{item.spare}</td>
//                     <td className="border p-2">{item.qty}</td>
//                     <td className="border p-2">₹ {item.rate}</td>
//                     <td className="border p-2 font-semibold">
//                       ₹ {item.amount}
//                     </td>

//                   </tr>
//                 ))}

//                 <tr className="bg-gray-100 font-semibold">

//                   <td colSpan="5" className="text-right p-2 border">
//                     Sub Total
//                   </td>

//                   <td className="p-2 border">
//                     ₹ {subTotal}
//                   </td>

//                 </tr>

//               </React.Fragment>
//             )

//           })}

//           <tr className="bg-green-100 font-bold text-lg">

//             <td colSpan="5" className="text-right p-3 border">
//               Grand Total
//             </td>

//             <td className="p-3 border">
//               ₹ {grandTotal}
//             </td>

//           </tr>

//           </tbody>

//         </table>

//       </div>

//       <style>
//       {`
//         @media print {

//           .print\\:hidden{
//             display:none;
//           }

//           body{
//             background:white;
//           }

//         }
//       `}
//       </style>

//     </div>

//   );

// };

// export default SpareReportPage;


import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const SpareReportPage = () => {
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
      const spareItems = item.spareItems || [];

      spareItems.forEach((si) => {
        const amt = Number(si.amount || 0);
        if (amt <= 0) return;
        const d = si.date ? new Date(si.date).toISOString().slice(0, 10) : repairDate;
        if (fromDate && d < fromDate) return;
        if (toDate && d > toDate) return;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push({ jobSheetNo, name, spare: si.name, qty: si.qty, rate: si.rate, amount: amt });
        gTotal += amt;
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
        rows.push({ "Date": date, "SL No": i + 1, "Job Sheet": item.jobSheetNo, "Customer": item.name, "Spare": item.spare, "Qty": item.qty, "Rate": item.rate, "Amount": item.amount });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Spare Report");
    XLSX.writeFile(wb, `Spare_Report_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🔧 Spare Value Report</h1>
        <p className="text-sm text-gray-500">Date-wise spare usage report</p>
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
              <th className="border p-3">Spare</th>
              <th className="border p-3">Qty</th>
              <th className="border p-3">Rate</th>
              <th className="border p-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedData).map(([date, records], idx) => {
              const subTotal = records.reduce((sum, r) => sum + Number(r.amount), 0);
              return (
                <React.Fragment key={idx}>
                  <tr className="bg-blue-50 font-semibold">
                    <td colSpan="7" className="p-3 border">📅 {date}</td>
                  </tr>
                  {records.map((item, i) => (
                    <tr key={i}>
                      <td className="border p-2">{i + 1}</td>
                      <td className="border p-2">{item.jobSheetNo}</td>
                      <td className="border p-2">{item.name}</td>
                      <td className="border p-2">{item.spare}</td>
                      <td className="border p-2">{item.qty}</td>
                      <td className="border p-2">₹ {item.rate}</td>
                      <td className="border p-2 font-semibold">₹ {item.amount}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan="6" className="text-right p-2 border">Sub Total</td>
                    <td className="p-2 border">₹ {subTotal}</td>
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="bg-green-100 font-bold text-lg">
              <td colSpan="6" className="text-right p-3 border">Grand Total</td>
              <td className="p-3 border">₹ {grandTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <style>{`@media print { .print\\:hidden{ display:none; } body{ background:white; } }`}</style>
    </div>
  );
};

export default SpareReportPage;