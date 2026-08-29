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

  // ── ONLY Income field is used for invoice totals (spare charge excluded) ──
  const items =
    job.items?.length > 0
      ? job.items
      : [
          {
            make: job.device?.make,
            model: job.device?.model,
            imei: job.device?.imei,
            fault: job.visualIssues?.join(", "),
            service: job.service?.income,
          },
        ];

  const subTotal = items.reduce(
    (sum, i) => sum + Number(i.service || 0),
    0
  );

  const grandTotal = subTotal;

  const paymentLabel =
    job.service?.paymentMode === "Cash"
      ? "INVOICE BILL / CASH"
      : job.service?.paymentMode === "UPI"
      ? "INVOICE BILL / UPI"
      : job.service?.paymentMode === "Card"
      ? "INVOICE BILL / CARD"
      : "INVOICE BILL";

  // ── Address: taluk/district merged into single line (same concept as Estimate) ──
  const fullAddress =
    [job.customer?.address, job.customer?.taluk, job.customer?.district]
      .filter(Boolean)
      .join(", ") || "-";

  // ── Inspection field values (joined text, same concept as Estimate) ──
  const physicalConditionText =
    (job.physicalCondition || []).filter(Boolean).join(", ") || "NIL";
  const accessoriesText =
    (job.accessories || []).filter(Boolean).join(", ") || "NIL";

  // ── Received Date & Delivery Date, formatted as DD/MM/YYYY ──
  const formatDate = (d) => {
    if (!d) return "-";
    const dateObj = new Date(d);
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // ================= FIX =================
  // 🔴 BUG FIX: "Received Date" was showing job.service?.repairDate, which is a
  // manually-editable field on the Job Sheet (engineers can change it any time).
  // That made Invoice's "Received Date" drift from reality. It should instead show
  // the actual date the job sheet was first saved/created in the system — the same
  // concept EstimateBill already uses via data.createdAt. Now both documents agree.
  const receivedDateText = formatDate(job.createdAt);
  const deliveryDateText = formatDate(job.service?.deliveryDate);

  // ── FIX: previously called html2pdf().from(element).save() with ZERO
  // options. That uses html2pdf's default "legacy" pagebreak mode, which
  // screenshots the whole element and slices the image into fixed 297mm
  // chunks with no awareness of the DOM — any box/table row/section that
  // straddles a slice boundary gets cut mid-element and shows up as
  // overlapping/duplicated content across the page break. Also the
  // container previously had height:"297mm" + overflow:"hidden", which
  // silently clipped anything that didn't fit instead of flowing to a
  // second page.
  // Now: container grows naturally (minHeight instead of fixed height,
  // overflow visible), and html2pdf is given explicit "css" pagebreak
  // mode with .avoid-break sections so a box/row is pushed whole onto the
  // next page instead of being sliced through the middle.
  const downloadPDF = () => {
    const element = document.getElementById("invoice");
    const opt = {
      margin: 0,
      filename: `Invoice-${job.jobSheetNo}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        windowWidth: element.scrollWidth,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".avoid-break"] },
    };
    html2pdf().from(element).set(opt).save();
  };

  return (
    <>
      <style>
        {`
        @media print {
          body { margin:0 }
          .no-print{ display:none }
        }
        /* Keep these blocks intact across a page slice instead of being
           cut through the middle (this is what was showing as "overlap"). */
        .avoid-break {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        `}
      </style>

      <div
        id="invoice"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "18px",
          margin: "auto",
          border: "2px solid #000",
          fontSize: "12px",
          lineHeight: "1.4",
          overflow: "visible",
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

        <div
          className="avoid-break"
          style={{ borderBottom: "2px solid #000", paddingBottom: "10px" }}
        >

          {/* COMPANY NAME + ADDRESS — TOP CENTER */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h2 style={{ margin: "4px 0", letterSpacing: "1px", fontSize: "16px" }}>
              RADNUS COMMUNICATION
            </h2>

            <p style={{ fontSize: "14px", margin: 0 }}>
              242, Sinnaya Plaza, MG Road, Puducherry - 605001
            </p>
          </div>

          {/* LOGO + INVOICE BILL (left) + CONTACT INFO (right) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              fontSize: "11px",
              marginTop: "10px",
            }}
          >
            <div>
              <b>{paymentLabel}</b>
            </div>
            <div style={{ textAlign: "center", marginLeft: "80px" }}>
              <img src={Logo} style={{ height: "60px", display: "block", margin: "0 auto", marginTop: "20px" }} />
            </div>
            <table
              style={{
                fontSize: "13px",
                marginRight: "20px",
                borderSpacing: "0 6px",
                borderCollapse: "separate",
              }}
            >
              <tbody>
                <tr>
                  <td style={{ fontWeight: "bold", paddingRight: "6px", verticalAlign: "top" }}>
                    PHONE NO
                  </td>
                  <td style={{ verticalAlign: "top" }}>:</td>
                  <td style={{ paddingLeft: "6px", lineHeight: "1.6" }}>
                    81222 73355 &nbsp;&nbsp; 99409 73030 <br />
                    98944 36987
                  </td>
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
        </div>

        {/* CUSTOMER + BILL (left)  ──  INSPECTION DETAILS (right) */}

        <div
          className="avoid-break"
          style={{
            marginTop: "12px",
            fontSize: "12px",
            lineHeight: "1.3",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          {/* LEFT SIDE — CUSTOMER + BILL */}
          <div>
            {/* CUSTOMER */}

            <table style={{ fontSize: "14px", lineHeight: "1.8" }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: "bold", width: "110px", whiteSpace: "nowrap" }}>Customer</td>
                  <td style={{ paddingLeft: "4px" }}>:</td>
                  <td style={{ paddingLeft: "8px" }}>{job.customer?.name}</td>
                </tr>

                <tr>
                  <td style={{ fontWeight: "bold", width: "110px", whiteSpace: "nowrap" }}>Contact</td>
                  <td style={{ paddingLeft: "4px" }}>:</td>
                  <td style={{ paddingLeft: "8px" }}>{job.customer?.contact}</td>
                </tr>

                <tr>
                  <td style={{ fontWeight: "bold", width: "110px", whiteSpace: "nowrap" }}>Address</td>
                  <td style={{ paddingLeft: "4px" }}>:</td>
                  <td style={{ paddingLeft: "8px" }}>{fullAddress}</td>
                </tr>
              </tbody>
            </table>

            {/* BILL */}

            <table style={{ fontSize: "14px", lineHeight: "1.8", marginTop: "8px" }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: "bold", width: "110px", whiteSpace: "nowrap" }}>Bill No</td>
                  <td style={{ paddingLeft: "4px" }}>:</td>
                  <td style={{ paddingLeft: "8px" }}>{job.jobSheetNo}</td>
                </tr>

                <tr>
                  <td style={{ fontWeight: "bold", width: "110px", whiteSpace: "nowrap" }}>Received Date</td>
                  <td style={{ paddingLeft: "4px" }}>:</td>
                  <td style={{ paddingLeft: "8px" }}>{receivedDateText}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RIGHT SIDE — INSPECTION DETAILS */}
          <table
            style={{
              fontSize: "14px",
              lineHeight: "1.8",
              borderSpacing: "0 10px",
              borderCollapse: "separate",
              marginRight: "160px",
            }}
          >
            <tbody>
              <tr>
                <td style={{ fontWeight: "bold", width: "160px", whiteSpace: "nowrap" }}>Physical Condition</td>
                <td style={{ paddingLeft: "4px" }}>:</td>
                <td style={{ paddingLeft: "8px" }}>{physicalConditionText}</td>
              </tr>

              <tr>
                <td style={{ fontWeight: "bold", width: "160px", whiteSpace: "nowrap" }}>Accessories Received</td>
                <td style={{ paddingLeft: "4px" }}>:</td>
                <td style={{ paddingLeft: "8px" }}>{accessoriesText}</td>
              </tr>

              <tr>
                <td style={{ fontWeight: "bold", width: "160px", whiteSpace: "nowrap" }}>Delivery Date</td>
                <td style={{ paddingLeft: "4px" }}>:</td>
                <td style={{ paddingLeft: "8px" }}>{deliveryDateText}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TABLE */}

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "16px",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr style={{ background: "#f3f3f3" }}>
              {["Make", "Model", "IMEI", "Fault", "Total"].map(
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
              <tr key={i} className="avoid-break">
                <td style={td}>{item.make || "-"}</td>
                <td style={td}>{item.model || "-"}</td>
                <td style={td}>{item.imei || "-"}</td>
                <td style={td}>{item.fault || "-"}</td>
                <td style={td}>
                  ₹ {Number(item.service || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTAL */}

        <div className="avoid-break" style={{ textAlign: "right", marginTop: "6px", fontSize: "12px" }}>
          <div style={{ marginBottom: "6px" }}>Sub Total : ₹{subTotal}</div>
          <b>Grand Total : ₹{grandTotal.toFixed(2)}</b>
        </div>

        {/* REMARKS */}
        {job.service?.remarks && (
          <div className="avoid-break" style={{ marginTop: "20px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px"
            }}>
              <div style={{
                width: "4px",
                height: "18px",
                background: "#2c2c2c",
                borderRadius: "2px"
              }} />
              <span style={{ fontWeight: "700", fontSize: "13px", letterSpacing: "1px" }}>
                REMARKS
              </span>
            </div>

            <div style={{
              border: "1px solid #d0d0d0",
              borderLeft: "4px solid #2c2c2c",
              borderRadius: "4px",
              background: "#f9f9f9",
              whiteSpace: "pre-wrap",
              color: "#222",
              marginTop: "10px",
              fontSize: "11px",
              padding: "8px 10px",
              lineHeight: "1.5",
            }}>
              {job.service.remarks}
            </div>
          </div>
        )}

        {/* TERMS */}

        <div style={{ marginTop: "25px" }}>
          <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "6px" }}>
            TERMS & CONDITIONS
          </div>

          <div
            className="avoid-break"
            style={{
              border: "1px solid #ccc",
              borderRadius: "4px",
              background: "#fafafa",
              marginTop: "12px",
              fontSize: "11px",
              padding: "8px",
              lineHeight: "1.4",
            }}
          >
            <ol style={{ margin: 0, paddingLeft: "16px" }}>
              <li style={{  marginBottom: "6px" }}>Replaced parts will not be returned.</li>
              <li style={{  marginBottom: "6px" }}>Data may be lost during repair/software upgradation.</li>
              <li style={{ marginBottom: "6px" }}>
                Company bears no responsibility, whatsoever if equipment is not
                collected within 45 days from the date of receipt.
              </li>
              <li style={{  marginBottom: "6px" }}>
                Please make sure that you have removed your sim card and/or memory
                card from your phone. Gadget hub does not accept responsibility
                for loss of these items.
              </li>
              <li style={{  marginBottom: "6px" }}>
                No delivery will be made without the customer's copy of the job order.
              </li>
              <li style={{  marginBottom: "6px" }}>
                Company bears no responsibility, if any fault occurs on additional
                fault findings while servicing on booked complaints.
              </li>
              <li style={{ lineHeight: "1.9" }}>Only checking warranty for all services and spares used.</li>
            </ol>
          </div>

          {/* TAMIL */}

          <div style={{ fontWeight: "bold", marginTop: "15px", fontSize: "13px" }}>
            விதிமுறைகள்
          </div>

          <div
            className="avoid-break"
            style={{
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "10px",
              background: "#fafafa",
              fontSize: "11px",
              lineHeight: "1.5",
            }}
          >
            <ol style={{ margin: 0, paddingLeft: "16px" }}>
              <li style={{ lineHeight: "1.9", marginBottom: "6px" }}>மாற்றப்பட்ட உதிரிப்பாகங்கள் திருப்பி வழங்கப்படமாட்டாது.</li>
              <li style={{ lineHeight: "1.9", marginBottom: "6px" }}>
                பழுது பார்க்கும்போது / சாப்ட்வேர் அப்டேட் செய்யும் போது தகவல்கள்
                இழக்க நேரிடலாம்.
              </li>
              <li style={{ lineHeight: "1.9", marginBottom: "6px" }}>
                பெறப்பட்ட நாளிலிருந்து 45 நாட்களுக்குள் பொருள் பெறப்படாவிட்டால்
                நிறுவனம் பொறுப்பல்ல.
              </li>
              <li style={{ lineHeight: "1.9", marginBottom: "6px" }}>
                தயவுசெய்து உங்கள் சிம் கார்டு மற்றும் மெமரி கார்டை அகற்றி வழங்கவும்.
              </li>
              <li style={{ lineHeight: "1.9", marginBottom: "6px" }}>வேலை ஒப்பந்த நகல் இல்லாமல் பொருள் வழங்கப்படமாட்டாது.</li>
              <li style={{ lineHeight: "1.9", marginBottom: "6px" }}>
                சரிசெய்யும் போது புதிய குறைகள் ஏற்பட்டால் நிறுவனம் பொறுப்பல்ல.
              </li>
              <li style={{ lineHeight: "1.9" }}>
                சேவை மற்றும் உதிரிப்பாகங்களுக்கு மட்டுமே உத்தரவாதம் வழங்கப்படும்.
              </li>
            </ol>
          </div>
        </div>

        {/* SIGN */}

        <div className="avoid-break" style={{ textAlign: "right", marginTop: "20px" }}>
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