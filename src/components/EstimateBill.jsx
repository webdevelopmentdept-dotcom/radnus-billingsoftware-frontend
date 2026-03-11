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
    Number(data.service?.serviceCharge || 0) +
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

.header{
display:grid;
grid-template-columns:1fr auto 1fr;
align-items:center;
border-bottom:2px solid #222;
padding-bottom:12px;
margin-bottom:20px;
}

.company{
font-size:18px;
font-weight:700;
}

.sub{
font-size:12px;
line-height:1.6;
color:#444;
}

.logo-box{
text-align:center;
}

.logo-box img{
height:60px;
}

.job-box{
justify-self:end;
}

.job-title{
text-align:center;
font-weight:700;
margin-bottom:6px;
}

.job-box table{
font-size:12px;
border-collapse:collapse;
}

.job-box td{
padding:2px 6px;
}

.section{
margin-bottom:18px;
}

.section-title{
font-size:14px;
font-weight:700;
margin-bottom:8px;
color:#222;
border-left:4px solid #000;
padding-left:8px;
text-transform:uppercase;
}

.box{
border:1px solid #ddd;
padding:12px;
border-radius:8px;
font-size:14px;
background:#fafafa;
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


          {/* HEADER */}

          <div className="header">

            <div>
              <div className="company">RADNUS COMMUNICATION</div>

              <div className="sub">
                242, Sinnaya Plaza, MG Road,<br />
                Puducherry - 605001<br />
                Phone: 81222 73355<br />
                Mon–Sat (10AM–7PM)<br />
                Website: www.radnus.in
              </div>
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

              <div className="box">
                Name: {val(data.customer?.name)}<br />
                Phone: {val(data.customer?.contact)}<br />
                Email: {val(data.customer?.email)}<br />
                Address: {val(data.customer?.address)}
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


          {/* ESTIMATE */}

          <div className="section">

            <div className="section-title">Estimate Amount</div>

            <div className="estimate-box">

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Service Charge</span>
                <span>₹ {data.service?.serviceCharge || 0}</span>
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


      {/* <div className="no-print">

<button onClick={handlePrint} style={btn}>
🖨 Print / Download
</button>

<button
onClick={handleEmail}
style={{...btn,marginLeft:10}}
disabled={sending}
>
{sending ? "Sending..." : "📧 Send Email"}
</button>

</div> */}

    </>
  );
};

export default EstimateBill;