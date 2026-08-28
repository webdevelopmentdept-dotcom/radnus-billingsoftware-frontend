import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import logo from "../assets/logo.png";

const EstimateBill = () => {

  const { id } = useParams();

  const [data, setData] = useState(null);
  const [sending, setSending] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const isPDF = params.get("pdf");

  const API = import.meta.env.VITE_API_URL;


  /* ================= FETCH JOB ================= */

  useEffect(() => {

    axios
      .get(`${API}/api/jobsheets/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => console.error(err));

  }, [id, API]);


  // if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  if (!data) {
    return (
      <div style={{ padding: 20, fontFamily: "Segoe UI" }}>
        Loading Estimate...
      </div>
    );
  }


  const val = (v) => (v ? v : "NIL");


 const total =
    Number(data.service?.income || 0) +
    Number(data.service?.spareCharge || 0);

  /* ================= PRINT ================= */

  const handlePrint = () => {
    window.print();
  };


  /* ================= EMAIL ================= */

  const handleEmail = async () => {

    try {

      setSending(true);

      await axios.post(`${API}/api/jobsheets/send-estimate/${id}`);

      alert("Email sent successfully ✅");

    } catch (err) {

      console.error(err);

      alert("Email failed ❌");

    } finally {

      setSending(false);

    }

  };


  const btn = {
    padding: "10px 22px",
    border: "none",
    borderRadius: "6px",
    background: "#000",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  };


  const condLabel = {
    border: "1px solid #ddd",
    padding: "8px",
    fontWeight: 600,
    background: "#f4f4f4",
    width: "20%",
  };


  const condValue = {
    border: "1px solid #ddd",
    padding: "8px",
    width: "30%",
  };

  /* ================= INSPECTION LABELS =================
     Plain coloured text — no chip/pill background or border. */
  const chipWrap = { display: "flex", flexWrap: "wrap", gap: 10 };
  const chipBase = {
    display: "inline-block",
    fontSize: "13px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  };
  const chipFault = { ...chipBase, color: "#7F1D1D" };
  const chipPhysical = { ...chipBase, color: "#78350F" };
  const chipAccessory = { ...chipBase, color: "#1E3A8A" };
  const chipNil = { ...chipBase, color: "#111827" };

  const renderChips = (list, chipStyle) => {
    const items = (list || []).filter(Boolean);
    if (items.length === 0) {
      return <span style={chipNil}>NIL</span>;
    }
    return items.map((item, i) => (
      <span key={i} style={chipStyle}>{item}</span>
    ));
  };


  return (
    <>

      <style>{`

@page{
size:A4;
margin:0;
}

body{
margin:0;
font-family:'Segoe UI',sans-serif;
background:#f5f7fa;
-webkit-print-color-adjust: exact;
print-color-adjust: exact;
}

.wrapper{
display:flex;
justify-content:center;
padding:30px 0;
}

.a4{
width:210mm;
height:297mm;
padding:15mm;
box-sizing:border-box;
background:#fff;
box-shadow:0 10px 25px rgba(0,0,0,0.08);
border-radius:8px;
position:relative;
color:#111;
}

.watermark{
position:absolute;
top:45%;
left:50%;
transform:translate(-50%,-50%) rotate(-30deg);
font-size:90px;
color:rgba(0,0,0,0.04);
font-weight:bold;
}

/* ================= COMPANY HEADING — CENTERED ABOVE LOGO ================= */
.company-heading{
text-align:center;
font-size:22px;
font-weight:800;
color:#000;
letter-spacing:0.4px;
margin-bottom:10px;
}

.header{
display:grid;
grid-template-columns:1fr auto 1fr;
align-items:start;
border-bottom:2px solid #000;
padding-bottom:12px;
margin-bottom:20px;
color:#000;
}

.sub, .sub a, .sub span{
font-size:12.5px;
line-height:1.7;
color:#000 !important;
font-weight:500;
text-decoration:none;
}

/* ================= LOGO — MOVED SLIGHTLY DOWN ================= */
.logo-box{
text-align:center;
margin-top:18px;
}

.logo-box img{
height:60px;
}

.job-box{
justify-self:end;
color:#000;
}

.job-title{
text-align:center;
font-weight:800;
margin-bottom:6px;
color:#000;
}

.job-box table{
font-size:12.5px;
border-collapse:collapse;
color:#000;
}

.job-box td{
padding:2px 6px;
color:#000;
}

.section{
margin-bottom:18px;
}

.section-title{
font-size:14px;
font-weight:700;
margin-bottom:8px;
color:#000;
border-left:4px solid #000;
padding-left:8px;
text-transform:uppercase;
}

.box{
border:1px solid #ccc;
padding:12px;
border-radius:8px;
font-size:14px;
background:#fafafa;
color:#000;
}

.grid{
display:flex;
gap:15px;
}

.grid > div{
flex:1;
}

.estimate-box{
border:2px dashed #000;
padding:10px;
font-size:16px;
background:#f9f9f9;
color:#000;
}

.sign-row{
display:flex;
justify-content:space-between;
margin-top:30px;
}

.sign-box{
width:30%;
text-align:center;
}

.sign-line{
height:50px;
border-bottom:1px solid #000;
margin-bottom:6px;
}

.sign-label{
font-size:13px;
font-weight:600;
color:#000;
}

.no-print{
text-align:center;
margin-top:20px;
}

@media print{
body{background:#fff}
.wrapper{padding:0}
.a4{height:297mm;overflow:hidden}
.no-print{display:none}
}

`}</style>


      <div className="wrapper">

        <div className="a4">

          <div className="watermark">RADNUS</div>

          {/* ================= COMPANY HEADING — CENTERED ABOVE LOGO ================= */}
          <div className="company-heading">RADNUS COMMUNICATION</div>

          {/* HEADER */}

          <div className="header">

            <div className="sub">
  242, Sinnaya Plaza, MG Road,<br />
  Puducherry - 605001<br />
  Phone: 81222 73355, 99409 73030<br />
  98944 36987<br />
  Mon–Sat (10AM–7PM)<br />
  Website: www.radnus.in
</div>


            <div className="logo-box">
              <img src={logo} alt="logo" />
            </div>


            <div className="job-box">

              <div className="job-title">JOB SHEET</div>

              <table>
                <tbody>

                  <tr>
                    <td><b>Job No</b></td>
                    <td>:</td>
                    <td>{val(data.jobSheetNo)}</td>
                  </tr>

                  <tr>
                    <td><b>Created</b></td>
                    <td>:</td>
                    <td>{val(data.createdAt?.slice(0, 10))}</td>
                  </tr>

                  <tr>
                    <td><b>Delivery</b></td>
                    <td>:</td>
                    <td>{val(data.service?.deliveryDate?.slice(0, 10))}</td>
                  </tr>

                  <tr>
                    <td><b>Engineer</b></td>
                    <td>:</td>
                    <td>{val(data.service?.engineer)}</td>
                  </tr>

                </tbody>
              </table>

            </div>
          </div>


          {/* CUSTOMER + DEVICE */}

          <div className="grid section">

            <div>

              <div className="section-title">Customer</div>

              {/* ================= CUSTOMER BOX — TALUK/DISTRICT MERGED INTO ADDRESS (FIX) =================
                  🔴 FIX: Taluk and District were shown as separate lines below Address.
                  Now they're combined into the single Address line — e.g.
                  "Address: 12 Main St, Villianur, Puducherry" — matching how it's
                  actually filled on the Job Sheet. Empty parts are skipped automatically. */}
              <div className="box">
                Name: {val(data.customer?.name)}<br />
                Phone: {val(data.customer?.contact)}<br />
                Email: {val(data.customer?.email)}<br />
                Address: {[data.customer?.address, data.customer?.taluk, data.customer?.district].filter(Boolean).join(", ") || "NIL"}
              </div>

            </div>


            <div>

              <div className="section-title">Device</div>

              <div className="box">
                Brand: {val(data.device?.make)}<br />
                Model: {val(data.device?.model)}<br />
                IMEI: {val(data.device?.imei)}
              </div>

            </div>

          </div>

          {/* ================= INSPECTION DETAILS =================
              Visual Inspection (faults), Physical Condition, Accessories Received —
              plain coloured labels (no chip/pill background or border). */}
          <div className="section">

            <div className="section-title">Inspection Details</div>

            <div className="grid">

              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#000", marginBottom: 6 }}>
                  Visual Inspection
                </div>
                <div className="box" style={chipWrap}>
                  {renderChips(data.visualIssues, chipFault)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#000", marginBottom: 6 }}>
                  Physical Condition
                </div>
                <div className="box" style={chipWrap}>
                  {renderChips(data.physicalCondition, chipPhysical)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#000", marginBottom: 6 }}>
                  Accessories Received
                </div>
                <div className="box" style={chipWrap}>
                  {renderChips(data.accessories, chipAccessory)}
                </div>
              </div>

            </div>

          </div>


          {/* ESTIMATE */}

          <div className="section">

            <div className="section-title">Estimate Amount</div>

            <div className="estimate-box">

              <div style={{ display: "flex", justifyContent: "space-between" }}>
             <span>Service Charge</span>
<span>₹ {data.service?.income || 0}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span>Spare Charge</span>
                <span>₹ {data.service?.spareCharge || 0}</span>
              </div>

              <hr />

              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                <span>Total Estimate</span>
                <span>₹ {total}</span>
              </div>

            </div>

          </div>
{/* REMARKS */}
{data.service?.remarks && (
  <div className="section">
    <div className="section-title">Remarks</div>
    <div style={{
      border: "1px solid #d0d0d0",
      borderLeft: "4px solid #2c2c2c",
      borderRadius: "4px",
      padding: "12px 16px",
      background: "#f9f9f9",
      fontSize: "13px",
      lineHeight: "1.7",
      whiteSpace: "pre-wrap",
      color: "#222"
    }}>
      {data.service.remarks}
    </div>
  </div>
)}

          {/* SIGN */}

          <div className="sign-row">

            <div className="sign-box">
              <div className="sign-line"></div>
              <div className="sign-label">Customer Signature</div>
            </div>

            <div className="sign-box">
              <div className="sign-line"></div>
              <div className="sign-label">For RADNUS</div>
            </div>

            <div className="sign-box">
              <div className="sign-line"></div>
              <div className="sign-label">Authorized Signatory</div>
            </div>

          </div>


        </div>
      </div>

      {!isPDF && (
        <div className="no-print">

          <button onClick={handlePrint} style={btn}>
            🖨 Print / Download
          </button>

          <button
            onClick={handleEmail}
            style={{ ...btn, marginLeft: 10 }}
            disabled={sending}
          >
            {sending ? "Sending..." : "📧 Send Email"}
          </button>

        </div>
      )}

    </>
  );
};

export default EstimateBill;
//---end----