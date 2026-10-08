import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/* ================= POPUP DATE =================
   Delivered / Delivered NR/NA na -> Delivery Date.
   Rebill pannina job sheet-layum service.deliveryDate irundha adhaiye kaattum.
   Delivery date illaina -> Repair Date, adhuvum illaina Created Date. */
const getPopupDate = (js) => {
  const status = js.device?.mobileStatus;
  const isDelivered = status === "Delivered" || status === "Delivered NR/NA";
  const deliveryDate = js.service?.deliveryDate;

  if ((isDelivered || js.rebillHistory?.length > 0) && deliveryDate) {
    return new Date(deliveryDate).toLocaleDateString();
  }

  const fallback = js.service?.repairDate || js.createdAt;
  return fallback ? new Date(fallback).toLocaleDateString() : "-";
};

const JobSheetSearchModal = ({ data = [], onClose }) => {
  const navigate = useNavigate();

  const openJob = (js) => {
    onClose();
    navigate(`/jobsheet/${js._id}`);
  };

  /* ENTER = first result open, ESC = close */
  useEffect(() => {
    const handleKey = (e) => {
      if (e.repeat) return; // Enter pidichuttu irundha repeat aagaama
      if (e.key === "Enter" && data.length > 0) {
        e.preventDefault();
        openJob(data[0]);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [data]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        zIndex: 1050,
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <div
        className="bg-white rounded shadow"
        style={{
          width: "80%",
          maxHeight: "80vh",
          overflowY: "auto"
        }}
      >
        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
          <h5 className="m-0">Job Sheets</h5>
          <button className="btn btn-sm btn-outline-danger" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-3">
          <table className="table table-sm table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Job No</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {data.length > 0 ? (
                data.map((js, idx) => (
                  <tr key={js._id} className={idx === 0 ? "table-active" : ""}>
                    <td>{js.jobSheetNo}</td>
                    <td>{js.customer?.name || "-"}</td>
                    <td>{js.device?.mobileStatus || "-"}</td>
                    <td>{getPopupDate(js)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => openJob(js)}
                      >
                        Open {idx === 0 && "(Enter)"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No Job Sheets Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default JobSheetSearchModal;