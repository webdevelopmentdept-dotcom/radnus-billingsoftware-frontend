import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import {
  FileText, Search, RotateCcw, Download, Printer,
  Instagram, Star, CheckCircle2, ThumbsUp, XCircle,
  Inbox, StickyNote, Loader2, IndianRupee,
} from "lucide-react";

const AllReportPage = () => {
    const navigate = useNavigate(); 
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("");
  const [engineer, setEngineer] = useState("");
  const [dealer, setDealer]     = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  const [engineerList, setEngineerList] = useState([]);

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    axios.get(`${API}/api/engineers`)
      .then(res => setEngineerList(res.data))
      .catch(err => console.error(err));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)   params.q        = search.trim();
      if (status)   params.status   = status;
      if (engineer) params.engineer = engineer;
      if (dealer)   params.dealer   = dealer.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate)   params.toDate   = toDate;

      const res = await axios.get(`${API}/api/jobsheets/filter`, { params });
      setFilteredData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch data ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleReset = () => {
    setSearch(""); setStatus(""); setEngineer("");
    setDealer(""); setFromDate(""); setToDate("");
    setTimeout(() => {
      axios.get(`${API}/api/jobsheets/filter`)
        .then(res => setFilteredData(res.data))
        .catch(err => console.error(err));
    }, 100);
  };

  const handlePrint = () => window.print();

  const handleExcelDownload = () => {
    if (filteredData.length === 0) { alert("No data to export ❌"); return; }

    const rows = filteredData.map((item, index) => ({
      "SL No":              index + 1,
      "Date":               new Date(item.createdAt).toLocaleDateString("en-IN"),
      "Job Sheet No":       item.jobSheetNo || "-",
      "Customer Name":      item.customer?.name || "-",
      "Contact":            item.customer?.contact || "-",
      "Alt Contact":        item.customer?.altContact || "-",
      "Email":              item.customer?.email || "-",
      "Address":            item.customer?.address || "-",
      "Make":               item.device?.make || "-",
      "Model":              item.device?.model || "-",
      "IMEI":               item.device?.imei || "-",
      "Warranty":           item.device?.warranty || "-",
      "Status":             item.device?.mobileStatus || "-",
      "Engineer":           item.service?.engineer || "-",
      "Dealer":             item.service?.dealer || "-",
      "Drawer":             item.service?.drawer || "-",
      "Total":              (Number(item.service?.income || 0) + Number(item.service?.spareCharge || 0)),
      "Payment Mode":       item.service?.paymentMode || "-",
      "Estimate":           item.service?.estimate || "-",
      "Repair Date":        item.service?.repairDate ? new Date(item.service.repairDate).toLocaleDateString("en-IN") : "-",
      "Delivery Date":      item.service?.deliveryDate ? new Date(item.service.deliveryDate).toLocaleDateString("en-IN") : "-",
      "Problems":           item.visualIssues?.join(", ") || "-",
      "Physical Condition": item.physicalCondition?.join(", ") || "-",
      "Accessories":        item.accessories?.join(", ") || "-",
      "Margin":             item.service?.margin || 0,
      "Remarks":            item.service?.remarks || "-",
      "Insta Follow":       item.service?.instaFollowers || "-",
      "Google Review":      item.service?.googleReview || "-",
      "Cancel Remarks":     item.cancelRemarks || "-",
      "Cancelled By":       item.cancelledBy   || "-",
      "Created By":         item.createdBy?.name || item.createdBy?.username || "-",
      "Service Rep":        item.service?.serviceRep || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 },  { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 13 },
      { wch: 13 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 16 },
      { wch: 17 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
      { wch: 12 }, { wch: 10 }, { wch: 13 },
      { wch: 14 }, { wch: 13 }, { wch: 14 }, { wch: 28 }, { wch: 28 },
      { wch: 22 }, { wch: 13 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, 
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Reports");
    XLSX.writeFile(wb, `All_Report_${fromDate || "all"}_to_${toDate || "all"}.xlsx`);
  };

 const getStatusStyle = (s) => {
  if (s === "Delivered")       return { background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" };
  if (s === "Pending")         return { background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" };
  if (s === "Received")        return { background: "#dbeafe", color: "#1e40af", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" };
  if (s === "Repaired")        return { background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }; // 👈 new
  if (s === "Delivered NR/NA") return { background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" };
  if (s === "Cancelled")       return { background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" };
  return { background: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600 };
};

  // ✅ Insta / Google badge helper
  const socialBadge = (val) => {
    if (!val || val === "-") return <span style={{ color: "#94a3b8" }}>—</span>;
    if (val === "Already Done")
      return <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={12} /> Already Done</span>;
    if (val === "Yes")
      return <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><ThumbsUp size={12} /> Yes</span>;
    if (val === "No")
      return <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><XCircle size={12} /> No</span>;
    return <span style={{ fontSize: 11 }}>{val}</span>;
  };

const totalService = filteredData.reduce((s, i) => s + Number(i.service?.income || 0), 0);
const totalSpare   = filteredData.reduce((s, i) => s + Number(i.service?.spareCharge || 0), 0);
const totalAmount  = totalService + totalSpare;

  const headers = [
    "SL", "Date", "Job No", "Name", "Contact", "Alt Contact",
    "Make", "Model", "IMEI", "Warranty", "Status",
    "Engineer", "Dealer", "Drawer",
    "Total ₹", "Payment",
    "Problems", "Physical Cond.", "Accessories",
    "Repair Date", "Delivery Date", "Margin ₹", "Remarks",
    "Insta", "Google",
    "Service Rep", 
    "Created By"
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "20px" }}>

      {/* HEADER */}
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0, color: "#1e293b", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={22} /> All Reports
        </h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>Complete job sheet report overview</p>
      </div>

      {/* FILTER BAR */}
      <div className="print-hidden" style={{ background: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Search</label>
            <input type="text" placeholder="Name / Contact / Job No / IMEI" value={search}
              onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchData()}
              style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", width: "220px" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", width: "150px" }}>
            <option value="">All Status</option>
<option value="Received">Received</option>
<option value="Pending">Pending</option>
<option value="Repaired">Repaired</option>   {/* 👈 new */}
<option value="Delivered">Delivered</option>
<option value="Delivered NR/NA">Delivered NR/NA</option>
<option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Engineer</label>
            <select value={engineer} onChange={e => setEngineer(e.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", width: "140px" }}>
              <option value="">All Engineers</option>
              {engineerList.map((eng, i) => <option key={i} value={eng.name || eng}>{eng.name || eng}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Dealer</label>
            <input type="text" placeholder="Dealer name" value={dealer} onChange={e => setDealer(e.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", width: "130px" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "13px" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>To Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "7px 10px", fontSize: "13px" }} />
          </div>

          <button onClick={fetchData} disabled={loading}
            style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 18px", fontWeight: 600, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {loading ? "Loading..." : "Apply Filter"}
          </button>
          <button onClick={handleReset}
            style={{ background: "#64748b", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 600, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={handleExcelDownload}
            style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 600, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <Download size={14} /> Excel Download
          </button>
          <button onClick={handlePrint}
            style={{ background: "#0891b2", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 600, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* SUMMARY ROW */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
        {[
          { label: "Total Records", icon: <FileText size={12} />, value: filteredData.length, color: "#2563eb" },
        
          { label: "Instagram",     icon: <Instagram size={12} />, value: filteredData.filter(i => i.service?.instaFollowers === "Yes").length, color: "#e11d48" },
          { label: "Google Review", icon: <Star size={12} />, value: filteredData.filter(i => i.service?.googleReview === "Yes").length, color: "#d97706" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: "10px", padding: "10px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", minWidth: "140px" }}>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
        <div style={{ background: "#fff", borderRadius: "10px", padding: "10px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", fontSize: "12px", color: "#64748b", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div><b>From:</b> {fromDate || "-"}</div>
          <div><b>To:</b>   {toDate   || "-"}</div>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 6px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "62vh", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>

            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr style={{ background: "#1e293b", color: "#fff" }}>
                {headers.map((h, i) => (
                  <th key={i} style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, fontSize: "11px", whiteSpace: "nowrap", borderRight: "1px solid #334155" }}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={headers.length} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  <Loader2 size={16} className="animate-spin" style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} /> Loading...
                </td></tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item, index) => {
              const svc   = Number(item.service?.income || 0);
const spare = Number(item.service?.spareCharge   || 0);
                  const rowBg = index % 2 === 0 ? "#fff" : "#f8fafc";
                  const td    = { padding: "8px 8px", borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", whiteSpace: "nowrap", color: "#1e293b" };
                  return (
                    <tr key={index}
                      style={{ background: rowBg, cursor: "pointer" }}
                      onDoubleClick={() => navigate(`/jobsheet/${item._id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}>

                      <td style={{ ...td, color: "#64748b" }}>{index + 1}</td>
                      <td style={{ ...td, color: "#0369a1", fontWeight: 600 }}>
                        {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                      </td>
                      <td style={{ ...td, fontWeight: 700, color: "#2563eb" }}>{item.jobSheetNo || "-"}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{item.customer?.name || "-"}</td>
                      <td style={td}>{item.customer?.contact || "-"}</td>
                      <td style={td}>{item.customer?.altContact || "-"}</td>
                      <td style={td}>{item.device?.make || "-"}</td>
                      <td style={td}>{item.device?.model || "-"}</td>
                      <td style={td}>{item.device?.imei || "-"}</td>
                      <td style={td}>{item.device?.warranty || "-"}</td>
                      <td style={td}>
                        <span style={getStatusStyle(item.device?.mobileStatus)}>
                          {item.device?.mobileStatus || "-"}
                        </span>
                        {item.isCancelled && item.cancelRemarks && (
                          <div style={{ fontSize: 10, color: "#dc3545", marginTop: 3, whiteSpace: "normal", maxWidth: 120, display: "flex", alignItems: "flex-start", gap: 3 }}>
                            <StickyNote size={11} style={{ flexShrink: 0, marginTop: 1 }} /> {item.cancelRemarks}
                          </div>
                        )}
                      </td>
                      <td style={td}>{item.service?.engineer || "-"}</td>
                      <td style={td}>{item.service?.dealer || "-"}</td>
                      <td style={td}>{item.service?.drawer || "-"}</td>
                      <td style={{ ...td, color: "#059669", fontWeight: 700 }}>₹{(svc + spare).toLocaleString("en-IN")}</td>
                      <td style={td}>{item.service?.paymentMode || "-"}</td>
                      <td style={{ ...td, maxWidth: "160px", whiteSpace: "normal", wordBreak: "break-word" }}>{item.visualIssues?.filter(Boolean).join(", ") || "-"}</td>
                      <td style={{ ...td, maxWidth: "160px", whiteSpace: "normal", wordBreak: "break-word" }}>{item.physicalCondition?.join(", ") || "-"}</td>
                      <td style={{ ...td, maxWidth: "120px", whiteSpace: "normal", wordBreak: "break-word" }}>{item.accessories?.join(", ") || "-"}</td>
                      <td style={td}>{item.service?.repairDate ? new Date(item.service.repairDate).toLocaleDateString("en-IN") : "-"}</td>
                      <td style={td}>{item.service?.deliveryDate ? new Date(item.service.deliveryDate).toLocaleDateString("en-IN") : "-"}</td>
                      <td style={{ ...td, color: "#059669", fontWeight: 600 }}>
                        {item.service?.margin ? `₹${Number(item.service.margin).toLocaleString("en-IN")}` : "-"}
                      </td>
                      <td style={{ ...td, maxWidth: "140px", whiteSpace: "normal", wordBreak: "break-word" }}>{item.service?.remarks || "-"}</td>
                      <td style={{ ...td, textAlign: "center" }}>{socialBadge(item.service?.instaFollowers)}</td>
                      <td style={{ ...td, textAlign: "center" }}>{socialBadge(item.service?.googleReview)}</td>

                       <td style={td}>{item.service?.serviceRep || "-"}</td>
                      <td style={td}>{item.createdBy?.name || item.createdBy?.username || "-"}</td>
                     

                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={headers.length} style={{ textAlign: "center", padding: "50px", color: "#94a3b8", fontSize: "15px" }}>
                  <Inbox size={20} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} /> No Data Found
                </td></tr>
              )}
            </tbody>

            {/* FOOTER — colSpan 14 covers cols 0-13, then Total ₹ at 14, then colSpan 12 for the rest */}
            {filteredData.length > 0 && (
              <tfoot>
                <tr style={{ background: "#1e293b", color: "#fff", fontWeight: 700 }}>
                  <td colSpan="14" style={{ padding: "10px 8px", textAlign: "right", fontSize: "12px" }}>
                    TOTAL ({filteredData.length} records):
                  </td>
                  <td style={{ padding: "10px 8px", color: "#6ee7b7" }}>₹{totalAmount.toLocaleString("en-IN")}</td>
                  <td colSpan="12"></td>
                </tr>
              </tfoot>
            )}

          </table>
        </div>
      </div>

      <style>{`
        @media print {
          .print-hidden { display: none !important; }
          body { background: white; font-size: 11px; }
          table { font-size: 10px; }
          th, td { padding: 4px 5px !important; }
        }
      `}</style>
    </div>
  );
};

export default AllReportPage;