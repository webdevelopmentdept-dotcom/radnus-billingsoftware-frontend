import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

// ✅ ADD THIS
import JobSheetPage from "./JobSheetPage";

const JobSheetEdit = () => {
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

  return (
    <JobSheetPage
      editData={job}
      isEdit={true}
    />
  );
};

export default JobSheetEdit;
