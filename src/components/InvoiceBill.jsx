import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import html2pdf from "html2pdf.js";
import Logo from "../assets/logo.png";

const InvoiceBill = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    axios
      .get(`${API}/api/jobsheets/${id}`)
      .then((res) => setJob(res.data))
      .catch((err) => console.error(err));
  }, [id]);

  if (!job) return <p>Loading...</p>;

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

  const subTotal = items.reduce(
    (sum, i) => sum + Number(i.service || 0) + Number(i.spare || 0),
    0
  );

  const grandTotal = subTotal;

  const paymentLabel =
    job.service?.paymentMode === "Cash"
      ? "CASH MEMO"
      : job.service?.paymentMode === "UPI"
      ? "UPI BILL"
      : job.service?.paymentMode === "Card"
      ? "CARD BILL"
      : "BILL";

  const downloadPDF = () => {
    const element = document.getElementById("invoice");
    html2pdf().from(element).save(`Invoice-${job.jobSheetNo}.pdf`);
  };

  return (
    <>
      <style>
        {`
        @media print {
          body { margin:0 }
          .no-print{ display:none }
        }
        `}
      </style>

      <div
        id="invoice"
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "auto",
          border: "2px solid #000",
          padding: "25px",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
          position: "relative",
          background: "#fff",
        }}
      >
        {/* WATERMARK */}

        <img
          src={Logo}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            opacity: 0.05,
            width: "420px",
            pointerEvents: "none",
          }}
        />

        {/* HEADER */}

        <div style={{ borderBottom: "2px solid #000", paddingBottom: "10px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "13px",
            }}
          >
            <div>
              <b>{paymentLabel} / BILL</b>
            </div>

            {/* CONTACT INFO */}

            <table style={{ fontSize: "13px" }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: "bold", paddingRight: "6px" }}>
                    PHONE NO
                  </td>
                  <td>:</td>
                  <td style={{ paddingLeft: "6px" }}>81222 73355</td>
                </tr>

                <tr>
                  <td style={{ fontWeight: "bold", paddingRight: "6px" }}>
                    EMAIL
                  </td>
                  <td>:</td>
                  <td style={{ paddingLeft: "6px" }}>radnus@gmail.com</td>
                </tr>

                <tr>
                  <td style={{ fontWeight: "bold", paddingRight: "6px" }}>
                    TIMINGS
                  </td>
                  <td>:</td>
                  <td style={{ paddingLeft: "6px" }}>10 AM to 7 PM</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* COMPANY */}

          <div style={{ textAlign: "center", marginTop: "8px" }}>
            <img src={Logo} style={{ height: "60px" }} />

            <h2 style={{ margin: "5px 0", letterSpacing: "2px" }}>
              RADNUS COMMUNICATION
            </h2>

            <p style={{ fontSize: "14px", margin: 0 }}>
              1st floor Anna Salai opp to Hot and cold restaurant pondicherry
            </p>
          </div>
        </div>

        {/* CUSTOMER + BILL */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "18px",
          }}
        >
          {/* CUSTOMER */}

          <table style={{ fontSize: "14px", lineHeight: "1.8" }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: "bold", width: "90px" }}>Customer</td>
                <td>:</td>
                <td>{job.customer?.name}</td>
              </tr>

              <tr>
                <td style={{ fontWeight: "bold" }}>Contact</td>
                <td>:</td>
                <td>{job.customer?.contact}</td>
              </tr>

              <tr>
                <td style={{ fontWeight: "bold" }}>Address</td>
                <td>:</td>
                <td>{job.customer?.address}</td>
              </tr>
            </tbody>
          </table>

          {/* BILL */}

          <table style={{ fontSize: "14px", lineHeight: "1.8" }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: "bold" }}>Bill No</td>
                <td>:</td>
                <td>{job.jobSheetNo}</td>
              </tr>

              <tr>
                <td style={{ fontWeight: "bold" }}>Bill Date</td>
                <td>:</td>
                <td>{new Date().toLocaleDateString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TABLE */}

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr style={{ background: "#f3f3f3" }}>
              {["Make", "Model", "IMEI", "Fault", "Service", "Spare"].map(
                (h, i) => (
                  <th key={i} style={th}>
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td style={td}>{item.make || "-"}</td>
                <td style={td}>{item.model || "-"}</td>
                <td style={td}>{item.imei || "-"}</td>
                <td style={td}>{item.fault || "-"}</td>
                <td style={td}>₹ {item.service || 0}</td>
                <td style={td}>₹ {item.spare || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTAL */}

        <div style={{ textAlign: "right", marginTop: "10px", fontSize: "15px" }}>
          <div>Sub Total : ₹{subTotal}</div>
          <b>Grand Total : ₹{grandTotal.toFixed(2)}</b>
        </div>

        {/* TERMS */}

        <div style={{ marginTop: "25px" }}>
          <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "6px" }}>
            TERMS & CONDITIONS
          </div>

          <div
            style={{
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "10px",
              background: "#fafafa",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
          >
            <ol style={{ margin: 0, paddingLeft: "16px" }}>
              <li>Replaced parts will not be returned.</li>
              <li>Data may be lost during repair/software upgradation.</li>
              <li>
                Company bears no responsibility, whatsoever if equipment is not
                collected within 45 days from the date of receipt.
              </li>
              <li>
                Please make sure that you have removed your sim card and/or memory
                card from your phone. Gadget hub does not accept responsibility
                for loss of these items.
              </li>
              <li>
                No delivery will be made without the customer's copy of the job order.
              </li>
              <li>
                Company bears no responsibility, if any fault occurs on additional
                fault findings while servicing on booked complaints.
              </li>
              <li>Only checking warranty for all services and spares used.</li>
            </ol>
          </div>

          {/* TAMIL */}

          <div style={{ fontWeight: "bold", marginTop: "15px", fontSize: "13px" }}>
            விதிமுறைகள்
          </div>

          <div
            style={{
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "10px",
              background: "#fafafa",
              fontSize: "13px",
              lineHeight: "1.7",
            }}
          >
            <ol style={{ margin: 0, paddingLeft: "16px" }}>
              <li>மாற்றப்பட்ட உதிரிப்பாகங்கள் திருப்பி வழங்கப்படமாட்டாது.</li>
              <li>
                பழுது பார்க்கும்போது / சாப்ட்வேர் அப்டேட் செய்யும் போது தகவல்கள்
                இழக்க நேரிடலாம்.
              </li>
              <li>
                பெறப்பட்ட நாளிலிருந்து 45 நாட்களுக்குள் பொருள் பெறப்படாவிட்டால்
                நிறுவனம் பொறுப்பல்ல.
              </li>
              <li>
                தயவுசெய்து உங்கள் சிம் கார்டு மற்றும் மெமரி கார்டை அகற்றி வழங்கவும்.
              </li>
              <li>வேலை ஒப்பந்த நகல் இல்லாமல் பொருள் வழங்கப்படமாட்டாது.</li>
              <li>
                சரிசெய்யும் போது புதிய குறைகள் ஏற்பட்டால் நிறுவனம் பொறுப்பல்ல.
              </li>
              <li>
                சேவை மற்றும் உதிரிப்பாகங்களுக்கு மட்டுமே உத்தரவாதம் வழங்கப்படும்.
              </li>
            </ol>
          </div>
        </div>

        {/* SIGN */}

        <div style={{ textAlign: "right", marginTop: "40px" }}>
          Authorized Signature
        </div>
      </div>

      {/* BUTTONS */}

      <div className="no-print" style={{ textAlign: "center", marginTop: "15px" }}>
        <button onClick={() => window.print()}>🖨 Print</button>

        <button onClick={downloadPDF} style={{ marginLeft: "10px" }}>
          📥 Download PDF
        </button>

        <button
          style={{ marginLeft: "10px" }}
          onClick={async () => {
            try {
              await axios.post(`${API}/api/jobsheets/send-invoice/${job._id}`);
              alert("Invoice Sent Successfully ✅");
            } catch {
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

const th = {
  border: "1px solid #000",
  padding: "8px",
  fontSize: "13px",
};

const td = {
  border: "1px solid #000",
  padding: "8px",
};

export default InvoiceBill;