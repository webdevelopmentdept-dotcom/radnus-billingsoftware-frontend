import { useNavigate } from "react-router-dom";

const JobSheetSearchModal = ({ data, onClose }) => {
  const navigate = useNavigate();

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
        <div className="d-flex justify-content-between align-items-center p-2 border-bottom">
          <h5 className="m-0">Job Sheets</h5>
          <button className="btn btn-sm btn-outline-danger" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-3">
          <table className="table table-sm table-hover">
            <thead>
              <tr>
                <th>Job No</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map(js => (
                <tr key={js._id}>
                  <td>{js.jobSheetNo}</td>
                  <td>{js.customer?.name}</td>
                  <td>{js.device?.mobileStatus}</td>
                  <td>{new Date(js.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/jobsheet/${js._id}`)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default JobSheetSearchModal;
