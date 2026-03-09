import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import html2pdf from "html2pdf.js";
import Logo from "../assets/logo.png"
const InvoiceBill = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    axios
      .get(`${API}/api/jobsheets/${id}`)
      .then(res => setJob(res.data))
      .catch(err => console.error(err));
  }, [id]);

  if (!job) return <p>Loading...</p>;

  /* ================= ITEMS ================= */
  const items =
    job.items?.length > 0
      ? job.items
      : [
        {
          make: job.device?.make,
          model: job.device?.model,
          imei: job.device?.imei,
          fault: job.visualIssues?.join(", "),
          service: job.service?.serviceCharge,
          spare: job.service?.spareCharge,
        },
      ];

  /* ================= TOTAL ================= */
  const subTotal = items.reduce(
    (sum, i) => sum + Number(i.service || 0) + Number(i.spare || 0),
    0
  );

  const grandTotal = subTotal

  /* ================= PAYMENT LABEL ================= */
  const paymentLabel =
    job.service?.paymentMode === "Cash"
      ? "CASH MEMO"
      : job.service?.paymentMode === "UPI"
        ? "UPI BILL"
        : job.service?.paymentMode === "Card"
          ? "CARD BILL"
          : "BILL";

  /* ================= PDF ================= */
  const downloadPDF = () => {
    const element = document.getElementById("invoice");
    html2pdf().from(element).save(`Invoice-${job.jobSheetNo}.pdf`);
  };

  return (
    <>
      <style>
        {`
        @media print {
          body { margin: 0; }
        }
@media print {
  body { margin: 0; }

  .no-print {
    display: none;
  }
}

      `}
      </style>

      <div
        id="invoice"
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "auto",
          border: "2px solid black",
          padding: "15px",
          fontFamily: "Arial",
        }}
      >
        {/* ================= HEADER ================= */}
        <div style={{ borderBottom: "1px solid black", paddingBottom: "10px" }}>

          {/* TOP ROW */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            {/* LEFT */}
            <div style={{ width: "30%" }}>
              <b>{paymentLabel} / BILL</b>
            </div>

            {/* CENTER (EMPTY SPACE FOR PERFECT ALIGN) */}
            <div style={{ width: "40%" }}></div>

            {/* RIGHT */}
            <div
              style={{
                width: "30%",
                textAlign: "right",
                fontSize: "12px",
                lineHeight: "1.6",
              }}
            >
              <div>PHONE NO : 81222 73355</div>
              <div>EMAIL : radnus@gmail.com</div>
              <div>TIMINGS : 10AM to 7PM</div>
            </div>
          </div>

          {/* 🔥 PERFECT CENTER LOGO */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "10px",
              textAlign: "center",
            }}
          >
            <img
              src={Logo}
              alt="logo"
              style={{
                height: "65px",
                objectFit: "contain",
              }}
            />

            <h2
              style={{
                margin: "5px 0 0 0",
                letterSpacing: "2px",
              }}
            >
              RADNUS COMMUNICATION
            </h2>

            <p style={{ fontSize: "13px", margin: 0 }}>
              1st floor Anna Salai opp to Hot and cold restaurant pondicherry
            </p>
          </div>
        </div>


        {/* ================= CUSTOMER ================= */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
          <div>
            <p>Customer : {job.customer?.name}</p>
            <p>Contact No : {job.customer?.contact}</p>
            <p>Address : {job.customer?.address}</p>
          </div>

          <div>
            <p>Bill No : {job.jobSheetNo}</p>
            <p>Bill Date : {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* ================= TABLE ================= */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "15px" }}>
          <thead>
            <tr>
              {["Make", "Model", "IMEI", "Fault", "Service", "Spare"].map((h, i) => (
                <th key={i} style={th}>{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td style={td}>{item.make || "-"}</td>
                <td style={td}>{item.model || "-"}</td>
                <td style={td}>{item.imei || "-"}</td>
                <td style={td}>{item.fault || "-"}</td>
                <td style={td}>{item.service || "0"}</td>
                <td style={{ ...td, borderRight: "1px solid black" }}>
                  {item.spare || "0"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ================= TOTAL ================= */}
        <div style={{ textAlign: "right", marginTop: "10px", fontSize: "15px" }}>
          <div>Sub Total : ₹{subTotal}</div>
          <b>Grand Total : ₹{grandTotal.toFixed(2)}</b>
        </div>

        <div style={{ marginTop: "25px", fontSize: "15px" }}>
          <b>Terms and Conditions</b>
          <ol style={{ lineHeight: "1.8" }}>
            <li>Replaced parts will not be returned.</li>
            <li>Data may be lost during repair/software upgradation.</li>
            <li>Company bears no responsibility, whatsoever if equipment is not collected within 45 days from the date of receipt.</li>
            <li>Please make sure that you have removed your sim card and/or memory card from your phone. Gadget hub does not accept responsibility for loss of these items.</li>
            <li>No delivery will be made without the customer's copy of the job order.</li>
            <li>Company bears no responsibility, if any fault occurs on additional fault findings while servicing on booked complaints.</li>
            <li>Only checking warranty for all services and spares used.</li>
          </ol>

          <b>விதிமுறைகள்</b>
          <ol style={{ lineHeight: "1.8" }}>
            <li>மாற்றப்பட்ட உதிரிப்பாகங்கள் திருப்பி வழங்கப்படமாட்டாது.</li>
            <li>பழுது பார்க்கும்போது / சாப்ட்வேர் அப்டேட் செய்யும் போது தகவல்கள் இழக்க நேரிடலாம்.</li>
            <li>பெறப்பட்ட நாளிலிருந்து 45 நாட்களுக்குள் பொருள் பெறப்படாவிட்டால் நிறுவனம் பொறுப்பல்ல.</li>
            <li>தயவுசெய்து உங்கள் சிம் கார்டு மற்றும் மெமரி கார்டை அகற்றி வழங்கவும்.</li>
            <li>வேலை ஒப்பந்த நகல் இல்லாமல் பொருள் வழங்கப்படமாட்டாது.</li>
            <li>சரிசெய்யும் போது புதிய குறைகள் ஏற்பட்டால் நிறுவனம் பொறுப்பல்ல.</li>
            <li>சேவை மற்றும் உதிரிப்பாகங்களுக்கு மட்டுமே உத்தரவாதம் வழங்கப்படும்.</li>
          </ol>
        </div>


        {/* SIGN */}
        <div style={{ textAlign: "right", marginTop: "40px" }}>
          Authorized Signature
        </div>
      </div>

      {/* ================= BUTTONS ================= */}
      <div className="no-print" style={{ textAlign: "center", marginTop: "15px" }}>
        <button onClick={() => window.print()}>🖨 Print</button>
        <button onClick={downloadPDF} style={{ marginLeft: "10px" }}>
          📥 Download PDF
        </button>
        <button
          style={{ marginLeft: "10px" }}
          className="btn btn-dark btn-sm"
          onClick={async () => {
            try {
              await axios.post(
                `${API}/api/jobsheets/send-invoice/${job._id}`
               );

              alert("Invoice Sent Successfully ✅");
            } catch (err) {
              alert("Email Failed ❌");
            }
          }}
        >
          📧 Send Email
        </button>
      </div>
    </>
  );
};

/* ================= STYLES ================= */
const th = {
  border: "2px solid black",
  borderRight: "1px dotted black",
  padding: "6px",
  fontSize: "13px",
};

const td = {
  borderBottom: "1px solid black",
  borderRight: "1px dotted black",
  padding: "6px",
  height: "30px",
};

export default InvoiceBill;