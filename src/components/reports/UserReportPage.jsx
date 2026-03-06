import React, { useState, useEffect } from "react";
import axios from "axios";

const UserReportPage = () => {

  const [jobSheetNo,setJobSheetNo] = useState("");
  const [data,setData] = useState({});
  const API = import.meta.env.VITE_API_URL;

  // ✅ PAGE LOAD → ALL DATA
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (search="") => {

    const res = await axios.get(
      `${API}/api/jobsheets/user-report`,
      {
        params:{ jobSheetNo: search }
      }
    );

    setData(res.data);
  };

  // 🔎 SEARCH
  const handleSearch = () => {
    fetchData(jobSheetNo);
  };

  return (

    <div className="container mt-4">

      <h3>User JobSheet Report</h3>

      {/* SEARCH BAR */}

      <div className="d-flex gap-2 mb-4">

        <input
          className="form-control"
          placeholder="Enter JobSheet No"
          value={jobSheetNo}
          onChange={(e)=>setJobSheetNo(e.target.value)}
        />

        <button
          className="btn btn-primary"
          onClick={handleSearch}
        >
          Search
        </button>

      </div>

      {/* USER SECTIONS */}

      {Object.keys(data).map((user)=>{

        const jobs = data[user];

        return(

          <div key={user} className="mb-4 border rounded">

            <div className="p-2 bg-light fw-bold">
              👤 {user} ({jobs.length} jobs)
            </div>

            <table className="table table-bordered mb-0">

              <thead>
                <tr>
                  <th>SL No</th>
                  <th>JobSheet</th>
                  <th>Customer</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>

              {jobs.map((job,i)=>(

                <tr key={job._id}>
                  <td>{i+1}</td>
                  <td>{job.jobSheetNo}</td>
                  <td>{job.customer?.name}</td>
                  <td>
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                </tr>

              ))}

              </tbody>

            </table>

          </div>

        )

      })}

    </div>

  );

};

export default UserReportPage;