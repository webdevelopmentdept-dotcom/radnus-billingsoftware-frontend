import React, { useState, useEffect } from "react";
import AdvancePopup from "./AdvancePopup";
import axios from "axios";
import makeModelData from "../data/makeModelData";
import JobSheetSearchModal from "./JobSheetSearchModal";
import SparePopup from "./SparePopup";
import Select from "react-select";
import RepairStepsTimeline from "./RepairStepsTimeline";
import CustomerAutocomplete from "./CustomerAutocomplete";
import { useNavigate } from "react-router-dom";
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidPhone = (phone) => /^\d{10}$/.test(phone);
const isValidIMEI = (imei) => /^\d{15}$/.test(imei);
const isRequired = (value) => value && value.toString().trim().length > 0;
const MAX_JOBS = 5;
const onlyNumbers = (value) => value.replace(/\D/g, "");
const JobSheetPage = ({ editData = null, isEdit = false }) => {
  const [makeList, setMakeList] = useState([]);
  const [modelList, setModelList] = useState([]);
  const navigate = useNavigate();
  const [jobSheetNo, setJobSheetNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [rebilling, setRebilling] = useState(false);
  const pendingNextNo = React.useRef(null);
  const API = import.meta.env.VITE_API_URL;
const [customFaults, setCustomFaults] = useState([]);
const [showCancelModal, setShowCancelModal] = useState(false);
const [cancelRemarksInput, setCancelRemarksInput] = useState("");
const [cancelling, setCancelling] = useState(false);
  /* ================= VALIDATION (NEW) ================= */
  const [touched, setTouched] = useState({});
  const [formErrors, setFormErrors] = useState({});
 


const validateField = (name, value) => {
  switch (name) {
    case "customerName":
      return !value || !value?.toString().trim() ? "Customer Name is required" : "";
    
    case "contact":
      // Strict empty check + 10 digit check
      const contactVal = value?.toString().trim();
      if (!contactVal || contactVal === "") return "Contact No is required";
      if (!/^\d{10}$/.test(contactVal)) return "Must be exactly 10 digits";
      return "";
    
    case "email":
      if (!value || value.toString().trim() === "") return "";
      return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Invalid email format" : "";
    
    default:
      return "";
  }
};

  const handleBlur = (name, value) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setFormErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const validateAll = () => {
    const errors = {
      customerName: validateField("customerName", customerName),
      contact: validateField("contact", contact),
      email: validateField("email", email),
    };
    setFormErrors(errors);
    setTouched({ customerName: true, contact: true, email: true });
   return !Object.values(errors).some(Boolean);
  };

  /* ================= TIME ================= */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [])


  useEffect(() => {
    axios.get(`${API}/api/makes`)
      .then((res) => setMakeList(res.data))
      .catch((err) => console.error("Make fetch error:", err));
  }, []);

  useEffect(() => {
    if (isEdit && editData) {
      setJobSheetNo(editData.jobSheetNo);
    } else if (pendingNextNo.current) {
      setJobSheetNo(pendingNextNo.current);
      pendingNextNo.current = null;
    } else if (!jobSheetNo) {
      axios.get(`${API}/api/jobsheets/next-number`)
        .then(res => setJobSheetNo(res.data.next))
        .catch(err => console.error(err));
    }
 }, [isEdit, editData]);


  /* ================= SEARCH STATES ================= */

  const [searchText, setSearchText] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [results, setResults] = useState([]);
  const [showSearchModal, setShowSearchModal] = useState(false);


  /* ================= CUSTOMER ================= */
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [altContact, setAltContact] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");


  /* ================= DEVICE ================= */
  const [make, setMake] = useState("");
  const [customMake, setCustomMake] = useState("");
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");

 useEffect(() => {
  const selectedMake = make === "__custom" ? customMake : make;

  if (!selectedMake) {
    setModelList([]);
    return;
  }

  axios.get(`${API}/api/models/${selectedMake}`)
    .then(res => setModelList(res.data))
    .catch(err => {
      console.error("Model fetch error:", err);
      setModelList([]);
    });
}, [make, customMake]);

  const [imei, setImei] = useState("");
  const [warranty, setWarranty] = useState("No Warranty");
  const [pattern, setPattern] = useState("");
  const [mobileStatus, setMobileStatus] = useState("");
  const [idProofType, setIdProofType] = useState("");
  const [idProofImage, setIdProofImage] = useState(null);
  const [idProofPreview, setIdProofPreview] = useState(null);
const [serviceRep, setServiceRep] = useState("");
const [advanceDate, setAdvanceDate] = useState("");
const [salesRepList, setSalesRepList] = useState([]);


const [instaFollowers, setInstaFollowers] = useState("");
const [googleReview, setGoogleReview]     = useState("");
  /* ================= CHECKBOX ARRAYS ================= */
  const [physicalCondition, setPhysicalCondition] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [visualIssues, setVisualIssues] = useState([""]);
  const [faultList, setFaultList] = useState([]);

  useEffect(() => {
    axios.get(`${API}/api/faults`)
      .then(res => setFaultList(res.data))
      .catch(err => console.error(err));
  }, []);
useEffect(() => {
  axios.get(`${API}/api/salesreps`)
    .then(res => setSalesRepList(res.data))
    .catch(err => console.error(err));
}, []);
  const toggleCheckbox = (value, state, setState) => {
    setState(
      state.includes(value)
        ? state.filter(v => v !== value)
        : [...state, value]
    );
  };


/* ── WORKLOAD MAP: { "Barani": 4, "Ajith": 5 } ── */
  const [workloadMap, setWorkloadMap] = useState({});
 
  useEffect(() => {
    axios.get(`${API}/api/engineers`)
      .then(res => setEngineerList(res.data));
  }, []);
 
  // Fetch workload whenever page loads
  useEffect(() => {
    axios.get(`${API}/api/jobsheets/workload`)
      .then(res => {
        const map = {};
        res.data.forEach(e => { map[e.name] = e.activeJobs; });
        setWorkloadMap(map);
      })
      .catch(err => console.error("Workload fetch error:", err));
  }, []); 
  /* ================= SERVICE ================= */
  const today = new Date().toISOString().split("T")[0];
  const [engineer, setEngineer] = useState("");

  const [engineerList, setEngineerList] = useState([]);

  useEffect(() => {
    axios.get(`${API}/api/engineers`)
      .then(res => setEngineerList(res.data));
  }, []);

  const [dealer, setDealer] = useState("");
  const [drawer, setDrawer] = useState("");

  const [drawerList, setDrawerList] = useState([]);
  useEffect(() => {
    axios.get(`${API}/api/drawers`)
      .then(res => setDrawerList(res.data));
  }, []);

  const [serviceCharge, setServiceCharge] = useState("");
  const [spareCharge, setSpareCharge] = useState("");
  const [spareItems, setSpareItems] = useState([]);

  const [sparePopup, setSparePopup] = useState(false);

  const [paymentMode, setPaymentMode] = useState("");
  const [estimate, setEstimate] = useState("");
  const [repairDate, setRepairDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remarks, setRemarks] = useState("");
const [advanceAmount, setAdvanceAmount] = useState("");
const [advanceItems, setAdvanceItems] = useState([]);
const [showAdvancePopup, setShowAdvancePopup] = useState(false);
const [margin, setMargin] = useState("");



useEffect(() => {
  const service = Number(serviceCharge || 0);
  const spare = Number(spareCharge || 0);
  const est = service + spare;

  setEstimate(est > 0 ? String(est) : "");
  setMargin(est > 0 ? String(est - spare) : "");
}, [serviceCharge, spareCharge]);



  /* ================= VISUAL ISSUES ================= */
  const addIssue = () => setVisualIssues([...visualIssues, ""]);
  const updateIssue = (i, val) => {
    const copy = [...visualIssues];
    copy[i] = val;
    setVisualIssues(copy);
  };
  const removeIssue = (i) =>
    setVisualIssues(visualIssues.filter((_, idx) => idx !== i));


const validateForm = () => {
  const errors = [];

  if (!isRequired(customerName)) errors.push("Customer Name is required");
  if (!isValidPhone(contact)) errors.push("Contact No must be exactly 10 digits");


  // Date validation
  if (repairDate && deliveryDate && new Date(deliveryDate) < new Date(repairDate)) {
    errors.push("Delivery Date cannot be before Repair Date");
  }

  return errors;
};

/* ================= CANCEL ================= */
const handleCancel = async () => {
  if (!cancelRemarksInput.trim()) {
    alert("Please enter cancel reason");
    return;
  }
  setCancelling(true);
  try {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    
    const res = await axios.put(
      `${API}/api/jobsheets/${localEditData._id}/cancel`,
      {
        cancelRemarks: cancelRemarksInput.trim(),
        cancelledBy:   user?.username || "admin",
      }
    );
    setLocalEditData(res.data);
    setShowCancelModal(false);
    setCancelRemarksInput("");
    alert("Job Sheet Cancelled ✅");
  } catch (err) {
    console.error(err);
    alert(err.response?.data?.message || "Cancel failed ❌");
  } finally {
    setCancelling(false);
  }
};
  /* ================= UPDATE ================= */
const handleUpdate = async () => {
  console.log("=== DEBUG ===");
  console.log("advanceDate:", advanceDate);
  console.log("advanceAmount:", advanceAmount);

  if (!validateAll()) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  if (repairDate && deliveryDate && new Date(deliveryDate) < new Date(repairDate)) {
    alert("⚠️ Delivery Date cannot be before Repair Date"); return;
  }

  try {
    const formData = new FormData();
    formData.append("jobSheetNo", jobSheetNo);
    formData.append("customer", JSON.stringify({ name: customerName, contact, altContact, address, email }));
    formData.append("device", JSON.stringify({ make: make === "__custom" ? customMake : make, model: model === "__custom" ? customModel : model, imei, warranty, pattern, mobileStatus }));
    formData.append("physicalCondition", JSON.stringify(physicalCondition));
    formData.append("accessories", JSON.stringify(accessories));
    formData.append("advanceItems", JSON.stringify(advanceItems));
    formData.append("visualIssues", JSON.stringify(visualIssues.filter(Boolean)));
    formData.append("service", JSON.stringify({
      engineer,
      dealer, drawer, serviceRep,
      serviceCharge: Number(serviceCharge || 0),
      spareCharge:   Number(spareCharge   || 0),
      estimate, paymentMode, repairDate, deliveryDate,
      instaFollowers, googleReview,
      advanceAmount: Number(advanceAmount || 0),
      advanceDate,   // ✅ இது already இருக்கு
      margin:        Number(margin || 0),
      remarks,
    }));
    formData.append("spareItems", JSON.stringify(spareItems));
    formData.append("idProofType", idProofType);
    if (idProofImage && typeof idProofImage !== "string") {
      formData.append("idProofImage", idProofImage);
    }

    const res = await axios.put(
      `${API}/api/jobsheets/${editData._id}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    const updatedJob = res.data?.job || res.data;
    setLocalEditData(updatedJob);

    if (updatedJob?.service?.advanceDate) {
      setAdvanceDate(updatedJob.service.advanceDate.slice(0, 10));
    }

    alert("Job Sheet Updated ✅");

  } catch (err) {
    console.error(err);
    alert("Update failed ❌");
  }
};

  /* ================= SAVE ================= */

const handleSave = async () => {

    // 🛑 DOUBLE CLICK STOP
    if (saving) return;

    // ✅ NEW: inline validation replaces alert-based
    if (!validateAll()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // ✅ ORIGINAL: date validation still runs
    if (repairDate && deliveryDate && new Date(deliveryDate) < new Date(repairDate)) {
      alert("⚠️ Delivery Date cannot be before Repair Date");
      return;
    }

   setSaving(true);

    const user = JSON.parse(sessionStorage.getItem("user"));

    try {
      const formData = new FormData();
      formData.append("jobSheetNo", jobSheetNo);
      formData.append("customer", JSON.stringify({ name: customerName, contact, altContact, address, email }));
      formData.append("device", JSON.stringify({ make: make === "__custom" ? customMake : make, model: model === "__custom" ? customModel : model, imei, warranty, pattern, mobileStatus }));
      formData.append("physicalCondition", JSON.stringify(physicalCondition));
      formData.append("accessories", JSON.stringify(accessories));
      formData.append("advanceItems", JSON.stringify(advanceItems));
      formData.append("visualIssues", JSON.stringify(visualIssues.filter(Boolean)));
      formData.append("service", JSON.stringify({ 
        engineer,
       
        
        dealer, drawer, serviceRep,
        instaFollowers,
        googleReview,advanceDate,
        serviceCharge: Number(serviceCharge || 0), 
        spareCharge: Number(spareCharge || 0), 
        estimate, paymentMode, repairDate, deliveryDate, remarks, 
        advanceAmount: Number(advanceAmount || 0), 
        margin: Number(margin || 0) 
      }));
      formData.append("spareItems", JSON.stringify(spareItems));
      formData.append("idProofType", idProofType);
      if (idProofImage) formData.append("idProofImage", idProofImage);
      if (user) formData.append("createdBy", JSON.stringify({ username: user.username, role: user.role }));

      const res = await axios.post(`${API}/api/jobsheets`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      alert("Job Sheet Saved ✅");

      const next = await axios.get(`${API}/api/jobsheets/next-number`);
      handleNew(next.data.next);

    } catch (err) {
      console.error(err);
      alert("Save failed ❌");
    } finally {
      setSaving(false);
    }
  }; 
// handleUpdate-ல் top-ல்:
console.log("advanceItems being saved:", advanceItems);
console.log("advanceAmount:", advanceAmount);
  const handleNew = (nextNo = null) => {
    // ✅ clear all fields
    setCustomerName("");
    
    setContact("");
    setAltContact("");
    setAddress("");
    setEmail("");
setServiceRep("");
    setMake("");
    setCustomMake("");
    setModel("");
    setCustomModel("");
    setImei("");
    setWarranty("");
    setPattern("");
    setIdProofType("");
    setIdProofImage(null);
    setIdProofPreview(null);
    setMobileStatus("");
setInstaFollowers("");
setGoogleReview("");
    setPhysicalCondition([]);
    setAccessories([]);
    setVisualIssues([""]);
    setCustomFaults({}); 
setAdvanceDate("");
setAdvanceItems([]); 
    setEngineer("");
   
    setDealer("");
    setDrawer("");
    setServiceCharge("");
    setSpareCharge("");
      setSpareItems([]); 
    setEstimate("");
    setPaymentMode("");
    setRemarks("");
setAdvanceAmount("");
setMargin("");
    // ✅ NEW: reset validation state too
    setTouched({});
    setFormErrors({});
   

    const today = new Date().toISOString().split("T")[0];
    setRepairDate(today);
    setDeliveryDate("");

 if (nextNo) {
  setJobSheetNo(nextNo); // 🔥 DIRECT SET
} else {
  axios.get(`${API}/api/jobsheets/next-number`)
    .then(res => setJobSheetNo(res.data.next));
}
 };

  /* ================= EDIT DATA ================= */
useEffect(() => {
  if (!isEdit || !editData) return;
if (!engineerList.length) return;  // ← ADD THIS

  setCustomerName(editData.customer?.name || "");
  setContact(editData.customer?.contact || "");
  setAltContact(editData.customer?.altContact || "");
  setAddress(editData.customer?.address || "");
  setEmail(editData.customer?.email || "");
  setServiceRep(editData.service?.serviceRep || "");
  setInstaFollowers(editData.service?.instaFollowers || "");
  setGoogleReview(editData.service?.googleReview || "");
  setMake(editData.device?.make || "");
  setModel(editData.device?.model || "");
  setImei(editData.device?.imei || "");
  setWarranty(editData.device?.warranty || "");
  setPattern(editData.device?.pattern || "");
  setIdProofType(editData.device?.idProofType || "");
  setIdProofPreview(editData.idProofImage || "");
  setMobileStatus(editData.device?.mobileStatus || "");

  
  const rawAdvDate = editData.service?.advanceDate;
  if (rawAdvDate) {
    const formatted = new Date(rawAdvDate).toISOString().split("T")[0];
    setAdvanceDate(formatted);
  } else {
    setAdvanceDate("");
  }

  setPhysicalCondition(editData.physicalCondition || []);
  setAccessories(editData.accessories || []);
 setEngineer(editData.service?.engineer || "");

  setDealer(editData.service?.dealer || "");
  setDrawer(editData.service?.drawer || "");
  setServiceCharge(editData.service?.serviceCharge || "");
  setSpareCharge(editData.service?.spareCharge || "");
  setSpareItems(editData.spareItems || []);
  setEstimate(editData.service?.estimate || "");
  setPaymentMode(editData.service?.paymentMode || "");
  setRepairDate(editData.service?.repairDate?.slice(0, 10) || today);
  setDeliveryDate(editData.service?.deliveryDate?.slice(0, 10) || "");
  setRemarks(editData.service?.remarks || "");
  setAdvanceAmount(editData.service?.advanceAmount || "");
  setAdvanceItems(editData.service?.advanceItems || []);  
  setMargin(editData.service?.margin || "");

}, [isEdit, editData, engineerList]);







useEffect(() => {
  if (!isEdit || !editData || !faultList.length) return;

  const savedIssues = editData.visualIssues?.length ? editData.visualIssues : [""];
  setVisualIssues(savedIssues);

  const rebuilt = {};
  savedIssues.forEach((issue, i) => {
    if (issue && !faultList.some(f => f.name.toLowerCase() === issue.toLowerCase())) {
      rebuilt[i] = issue;
    }
  });
  setCustomFaults(rebuilt);

}, [isEdit, editData, faultList]); // ← இங்க மட்டும் faultList

const [searching, setSearching] = useState(false);

const handleSearch = async () => {
  setSearching(true);
  try {
    const trimmed = searchText.trim();

    // Is it a pure job sheet number like "10" or "JS-010"?
    const isJobSheetNo =
      /^JS-\d+$/i.test(trimmed) ||
      (/^\d{1,4}$/.test(trimmed) && trimmed.length <= 4);

    const res = await axios.get(`${API}/api/jobsheets/filter`, {
      params: {
        q: trimmed || undefined,
        status: searchStatus || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      },
    });

    let filtered = res.data;

    // Only do the exact JS-xxx match when it looks like a job number
    if (trimmed && isJobSheetNo && /^\d+$/.test(trimmed)) {
      const padded = trimmed.padStart(3, "0");
      const exact = `JS-${padded}`;
      filtered = res.data.filter((js) => js.jobSheetNo === exact);
    }

    setResults(filtered);
    setShowSearchModal(true);
  } catch (err) {
    console.error(err);
    alert("Search failed");
  } finally {
    setSearching(false);
  }
};
  const [localEditData, setLocalEditData] = useState(editData);
  useEffect(() => {
    setLocalEditData(editData);
  }, [editData]);


  // ✅ ADD THIS HERE (BEFORE return)

const makeNames = makeList.map(mk => typeof mk === "string" ? mk : mk.name);

const extraMake =
  make &&
  make !== "__custom" &&
  !makeNames.includes(make)
    ? [{ label: make, value: make }]
    : [];

const makeOptions = [
  ...makeNames.map(name => ({ label: name, value: name })),
  ...extraMake,
  { label: "Other (Add New)", value: "__custom" }
];
const modelNames = modelList.map(m => typeof m === "string" ? m : m.name);

// If current model value isn't in the list (e.g. custom model loaded in edit mode),
// add it so the Select shows it correctly
const extraModel =
  model &&
  model !== "__custom" &&
  !modelNames.includes(model)
    ? [{ label: model, value: model }]
    : [];

const modelOptions = [
  ...modelNames.map(name => ({ label: name, value: name })),
  ...extraModel,
  { label: "Other (Add New)", value: "__custom" }
];
/* ── WORKLOAD BADGE HELPER ── */
const getWorkloadBadge = (engName) => {
  const count = workloadMap[engName] || 0;
  const free  = MAX_JOBS - count;

  if (count >= MAX_JOBS)
    return {
      label: `${engName} (FULL 🔴)`,
      disabled: true
    };

  if (count >= 4)
    return {
      label: `${engName} (${free} slot ⚠️)`,
      disabled: false
    };

  return {
    label: `${engName} (${free} free ✅)`,
    disabled: false
  };
};
  return (
<div className="container-fluid bg-light" style={{ paddingTop: "2px" }}>

<div className="card" style={{ marginBottom: "10px", border: "1px solid #dee2e6", padding: "6px 16px" }}>
  <div 
    className="d-flex flex-wrap align-items-center" 
    style={{ gap: "210px", lineHeight: "1" }}
  >
    <b className="fs-5" style={{ margin: 0 }}>Job Sheet</b>
    <div style={{ margin: 0 }}><b>Job Sheet No:</b> <span className="text-primary">{jobSheetNo}</span></div>
    <div style={{ margin: 0 }}><b>Date:</b> {now.toLocaleDateString()}</div>
    <div style={{ margin: 0 }}><b>Time:</b> {now.toLocaleTimeString()}</div>
  </div>
</div>

{/* SEARCH */}
<div className="card shadow-sm" style={{ marginBottom: "9px 9px ", padding: "4px 16px" }}>
  <div className="d-flex align-items-center flex-nowrap" style={{ fontSize: "13px", lineHeight: "1", gap: "48px" }}>

    {/* Search Group */}
    <div className="d-flex align-items-center" style={{ gap: "8px" }}>
      <span className="fw-bold" style={{ whiteSpace: "nowrap", fontSize: "17px" }}>Search:</span>
      <div style={{ width: "230px" }}>
        <input
          className="form-control form-control-sm"
          placeholder="Job Sheet / IMEI / Contact / Name"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ padding: "2px 8px", height: "28px" }}
        />
      </div>
    </div>

    {/* Divider */}
    <div style={{ width: "1px", height: "26px", }} />

    {/* Status Group */}
    <div className="d-flex align-items-center" style={{ gap: "4px" }}>
      <span className="fw-bold text-secondary" style={{ whiteSpace: "nowrap", fontSize: "14px" }}>Status:</span>
      <div style={{ width: "100px" }}>
        <select
          className="form-select form-select-sm"
          value={searchStatus}
          onChange={(e) => setSearchStatus(e.target.value)}
          style={{ padding: "2px 8px", height: "28px" }}
        >
          <option value="">All</option>
          <option value="Received">Received</option>
          <option value="Pending">Pending</option>
          <option value="Repaired">Repaired</option>
          <option value="Delivered">Delivered</option>
          <option value="Delivered NR/NA">Delivered NR/NA</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>
    </div>

    {/* Divider */}
    <div style={{ width: "1px", height: "26px",  }} />

    {/* From Date Group */}
    <div className="d-flex align-items-center" style={{ gap: "4px" }}>
      <span className="fw-bold text-secondary" style={{ whiteSpace: "nowrap", fontSize: "14px" }}>From:</span>
      <div style={{ width: "130px" }}>
        <input
          type="date"
          className="form-control form-control-sm"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          style={{ padding: "2px 8px", height: "28px" }}
        />
      </div>
    </div>

    {/* Divider */}
    <div style={{ width: "1px", height: "26px", }} />

    {/* To Date Group */}
    <div className="d-flex align-items-center" style={{ gap: "4px" }}>
      <span className="fw-bold text-secondary" style={{ whiteSpace: "nowrap", fontSize: "14px" }}>To:</span>
      <div style={{ width: "130px" }}>
        <input
          type="date"
          className="form-control form-control-sm"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          style={{ padding: "2px 8px", height: "28px" }}
        />
      </div>
    </div>

    {/* Search Button */}
    <button
      className="btn btn-primary btn-sm"
      onClick={handleSearch}
      disabled={searching}
      style={{ height: "28px", padding: "2px 16px", fontSize: "14px", lineHeight: "1" }}
    >
      {searching ? (
        <>
          <span
            className="spinner-border spinner-border-sm me-1"
            style={{ width: "10px", height: "10px" }}
            role="status"
            aria-hidden="true"
          />
          ...
        </>
      ) : (
        "Search"
      )}
    </button>

  </div>
</div>

      {/* MAIN GRID */}
      <div className="row g-3">

        {/* LEFT COLUMN */}
        <div className="col-md-3">
          <div className="card shadow-sm mb-3">
            <div className="card-header fw-bold">Physical Condition</div>
            <div className="card-body small">
              {[
                "Colour Faded", "Antenna Broken", "Deformed", "Battery Damaged",
                "LCD Broken / Bleeding", "Tampered Set", "Front Cover Scratches",
                "Scratches On Body", "Water Logged"
              ].map((x, i) => (
                <div className="form-check mb-1" key={i}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={physicalCondition.includes(x)}
                    onChange={() =>
                      toggleCheckbox(x, physicalCondition, setPhysicalCondition)
                    }
                  />

                  <label className="form-check-label">{x}</label>
                </div>
              ))}
              <input className="form-control form-control-sm mt-2" placeholder="Other Details" />
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header fw-bold">Accessories Received</div>
            <div className="card-body small">
              {["Battery", "Charger", "Back Cover", "Memory Card", "SIM"].map((x, i) => (
                <div className="form-check mb-1" key={i}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={accessories.includes(x)}
                    onChange={() =>
                      toggleCheckbox(x, accessories, setAccessories)
                    }
                  />

                  <label className="form-check-label">{x}</label>
                </div>
              ))}
              <input className="form-control form-control-sm mt-2" placeholder="Battery Number" />
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN */}
        <div className="col-md-6">
          <div className="card shadow-sm mb-3">
            <div className="card-header fw-bold">Customer Details</div>
            <div className="card-body row g-2">

              {/* ── Customer Name (VALIDATION ADDED) ── */}
              {/* <div className="col-md-4">
                <input
                  className={`form-control form-control-sm ${
                    touched.customerName && formErrors.customerName ? "is-invalid" :
                    touched.customerName && !formErrors.customerName ? "is-valid" : ""
                  }`}
                  placeholder="Customer Name *"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (touched.customerName)
                      setFormErrors(prev => ({ ...prev, customerName: validateField("customerName", e.target.value) }));
                  }}
                  onBlur={(e) => handleBlur("customerName", e.target.value)}
                />
                {touched.customerName && formErrors.customerName && (
                  <div className="invalid-feedback d-block" style={{ fontSize: 11 }}>⚠️ {formErrors.customerName}</div>
                )}
                {touched.customerName && !formErrors.customerName && customerName && (
                  <div style={{ fontSize: 11, color: "#198754" }}>✅ Looks good!</div>
                )}
              </div> */}

              {/* ── Customer Name (WITH AUTOCOMPLETE) ── */}
<div className="col-md-4">
 <CustomerAutocomplete
  type="name"
  value={customerName}
  onChange={setCustomerName}
onSelect={(customer) => {
  setCustomerName(customer.name || "");
  setContact(customer.contact || "");
  setAltContact(customer.altContact || "");
  setAddress(customer.address || "");
  setEmail(customer.email || "");
  setInstaFollowers(customer.instaFollowers === "Already Done" ? "Already Done" : "");
  setGoogleReview(customer.googleReview === "Already Done" ? "Already Done" : "");
}}
  placeholder="Customer Name *"
  className={`form-control form-control-sm ${
    touched.customerName && formErrors.customerName ? "is-invalid" :
    touched.customerName && !formErrors.customerName ? "is-valid" : ""
  }`}
 inputProps={{
  onBlur: () => handleBlur("customerName", customerName)
}}
  />
  {touched.customerName && formErrors.customerName && (
    <div className="invalid-feedback d-block" style={{ fontSize: 11 }}>⚠️ {formErrors.customerName}</div>
  )}
  {touched.customerName && !formErrors.customerName && customerName && (
    <div style={{ fontSize: 11, color: "#198754" }}>✅ Looks good!</div>
  )}
</div>

              {/* ── Contact No (VALIDATION ADDED) ── */}
              {/* <div className="col-md-4">
                <input
                  className={`form-control form-control-sm ${
                    touched.contact && formErrors.contact ? "is-invalid" :
                    touched.contact && !formErrors.contact && contact ? "is-valid" : ""
                  }`}
                  placeholder="Contact No *"
                  value={contact}
                  maxLength={10}
                  onChange={(e) => {
                    const val = onlyNumbers(e.target.value);
                    setContact(val);
                    if (touched.contact)
                      setFormErrors(prev => ({ ...prev, contact: validateField("contact", val) }));
                  }}
                  onBlur={(e) => handleBlur("contact", e.target.value)}
                />
                {touched.contact && formErrors.contact && (
                  <div className="invalid-feedback d-block" style={{ fontSize: 11 }}>⚠️ {formErrors.contact}</div>
                )}
                {touched.contact && !formErrors.contact && contact && (
                  <div style={{ fontSize: 11, color: "#198754" }}>✅ Valid number</div>
                )}
              </div> */}

              {/* ── Contact No (WITH AUTOCOMPLETE) ── */}
<div className="col-md-4">
  <CustomerAutocomplete
    type="contact"
    value={contact}
    onChange={setContact}
    filterNumbers={true}
onSelect={(customer) => {
  setCustomerName(customer.name || "");
  setContact(customer.contact || "");
  setAltContact(customer.altContact || "");
  setAddress(customer.address || "");
  setEmail(customer.email || "");
  setInstaFollowers(customer.instaFollowers === "Already Done" ? "Already Done" : "");
  setGoogleReview(customer.googleReview === "Already Done" ? "Already Done" : "");
}}
    placeholder="Contact No *"
    maxLength={10}
    className={`form-control form-control-sm ${
      touched.contact && formErrors.contact ? "is-invalid" :
      touched.contact && !formErrors.contact && contact ? "is-valid" : ""
    }`}
    // ✅ KEY FIX: onBlur-ல current state value (contact) pass பண்ணு, not e.target.value
    inputProps={{
  onBlur: () => handleBlur("contact", contact)
}}
  />
  {touched.contact && formErrors.contact && (
    <div className="invalid-feedback d-block" style={{ fontSize: 11 }}>⚠️ {formErrors.contact}</div>
  )}
  {touched.contact && !formErrors.contact && contact && (
    <div style={{ fontSize: 11, color: "#198754" }}>✅ Valid number</div>
  )}
</div>

              <div className="col-md-4">
                <input
                  className="form-control form-control-sm"
                  placeholder="Alt Contact"
                  value={altContact}
                  maxLength={10}
                  onChange={(e) => setAltContact(onlyNumbers(e.target.value))}
                />

              </div>
              <div className="col-8">
                <textarea
                  rows="2"
                  className="form-control form-control-sm"
                  placeholder="Customer Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              {/* ── Email (VALIDATION ADDED) ── */}
              <div className="col-md-4">
                <input
                  type="email"
                  className={`form-control form-control-sm ${
                    touched.email && formErrors.email ? "is-invalid" :
                    touched.email && !formErrors.email && email ? "is-valid" : ""
                  }`}
                  placeholder="Email ID"
                  value={email}
                  onChange={(e) => {
                    const val = e.target.value.trim().toLowerCase();
                    setEmail(val);
                    if (touched.email)
                      setFormErrors(prev => ({ ...prev, email: validateField("email", val) }));
                  }}
                  onBlur={(e) => handleBlur("email", e.target.value.trim())}
                />
                {touched.email && formErrors.email && (
                  <div className="invalid-feedback d-block" style={{ fontSize: 11 }}>⚠️ {formErrors.email}</div>
                )}
                {touched.email && !formErrors.email && email && (
                  <div style={{ fontSize: 11, color: "#198754" }}>✅ Valid email</div>
                )}
              </div>

               {/* ID PROOF TYPE */}
              <div className="col-md-4">
                <select
                  className="form-select form-select-sm"
                  value={idProofType}
                  onChange={(e) => setIdProofType(e.target.value)}
                >
                  <option value="">Select ID Proof</option>
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Election ID">Election ID</option>
                  <option value="ID Not Required">ID Not Required</option>
                  <option value="Dealer Collected">Dealer Collected</option>
                </select>
              </div>

              {/* IMAGE UPLOAD */}
              <div className="col-md-4">
                <input
                  type="file"
                  accept="image/*"
                  className="form-control form-control-sm"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setIdProofImage(file);

                    if (file) {
                      setIdProofPreview(URL.createObjectURL(file));
                    }
                  }}
                  disabled={
                    idProofType === "ID Not Required" ||
                    idProofType === "Dealer Collected"
                  }
                />


              </div>

            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-header fw-bold">Device Details</div>
            <div className="card-body row g-2">

              {/* Row 1 */}
              {/* MAKE */}
             {/* MAKE */}
<div className="col-md-4">
  <Select
    options={makeOptions}
    value={makeOptions.find(opt => opt.value === make) || null}
    onChange={(selected) => {
      setMake(selected?.value || "");
      setCustomMake("");
      setModel("");
      setCustomModel("");
    }}
    placeholder="Search Make..."
    isClearable
  />

  {make === "__custom" && (
    <input
      className="form-control form-control-sm mt-2"
      placeholder="Enter Make"
      value={customMake}
      onChange={(e) => setCustomMake(e.target.value)}
    />
  )}
</div>

{/* MODEL */}
<div className="col-md-4">
  <Select
    options={modelOptions}
    value={modelOptions.find(opt => opt.value === model) || null}
    onChange={(selected) => {
      setModel(selected?.value || "");
      setCustomModel("");
    }}
    placeholder="Search Model..."
    isClearable
  />

  {model === "__custom" && (
    <input
      className="form-control form-control-sm mt-2"
      placeholder="Enter Model"
      value={customModel}
      onChange={(e) => setCustomModel(e.target.value)}
    />
  )}
</div>


              <div className="col-md-4">
                <input
                  className="form-control form-control-sm"
                  placeholder="IMEI *"
                  value={imei}
                  maxLength={15}
                  onChange={(e) => setImei(onlyNumbers(e.target.value))}
                />

              </div>

              {/* Row 2 */}
              <div className="col-md-4">
                <select
                  className="form-select form-select-sm"
                  value={mobileStatus}
                  onChange={(e) => setMobileStatus(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="Received">Received</option>
                  <option value="Pending">Pending</option>
                  <option value="Repaired">Repaired</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Delivered NR/NA">Delivered NR/NA</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="col-md-4">
                <select
                  className="form-select form-select-sm"
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                >
                  <option value="">Warranty</option>
                  <option value="No Warranty">No Warranty</option>
                  <option value="3 months">3 Months</option>
                  <option value="6 months">6 Months</option>
                  <option value="1 year">1 Year</option>
                </select>

              </div>
              <div className="col-md-4">
                <input
                  className="form-control form-control-sm"
                  placeholder="Pattern / PIN"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                />

              </div>

              {/* Row 3 – ID Type & ID Number */}
             
              {/* {idProofPreview && (
  <img
    src={idProofPreview}
    alt="ID Preview"
    style={{ width: "120px", marginTop: "5px" }}
  />
)} */}


            </div>
          </div>


          <div className="card shadow-sm">
            <div className="card-header fw-bold">Service / Repair Details</div>

            <div className="card-body">

              {/* ROW 1 – Engineer / Dealer / Drawer */}
              <div className="row g-2">
                <div className="row g-2">

<div className="col-md-4">

  <select
    className="form-select form-select-sm"
    value={engineer}
    onChange={e => setEngineer(e.target.value)}
    style={{ borderColor: engineer && (workloadMap[engineer] || 0) >= MAX_JOBS ? "#ef4444" : "" }}
  >
    <option value="">Select Engineer</option>
    {engineerList.map((eng, i) => {
      const name  = eng.name || eng;
      const badge = getWorkloadBadge(name);
      return (
        <option key={i} value={name} disabled={badge.disabled}>
          🔧 {badge.label}
        </option>
      );
    })}
  </select>
  {engineer && (() => {
    const count = workloadMap[engineer] || 0;
    const free  = MAX_JOBS - count;
    if (count >= MAX_JOBS) return (
      <div style={{ marginTop: 5, fontSize: 11, fontWeight: 600, color: "#991b1b", background: "#fee2e2", borderRadius: 6, padding: "3px 8px" }}>
        🔴 Full capacity — choose another engineer
      </div>
    );
    if (count >= 4) return (
      <div style={{ marginTop: 5, fontSize: 11, fontWeight: 600, color: "#92400e", background: "#fef3c7", borderRadius: 6, padding: "3px 8px" }}>
        ⚠️ {count}/{MAX_JOBS} jobs — {free} slot left
      </div>
    );
    return (
      <div style={{ marginTop: 5, fontSize: 11, fontWeight: 500, color: "#166534", background: "#dcfce7", borderRadius: 6, padding: "3px 8px" }}>
        ✅ {count}/{MAX_JOBS} jobs — {free} slots free
      </div>
    );
  })()}
</div>

 

                  {/* Dealer – TEXTBOX */}
                {/* Dealer – TEXTBOX */}
<div className="col-md-4">
  <input
    placeholder="Dealer Name"
    className="form-control form-control-sm"
    value={dealer}
    onChange={(e) => {
      const val = e.target.value.replace(/[^a-zA-Z\u0B80-\u0BFF\s.]/g, "");
      setDealer(val);
    }}
  />
</div>

                  {/* Drawer – DROPDOWN */}
                  <div className="col-md-4">
                    <select
                      className="form-select form-select-sm"
                      value={drawer}
                      onChange={(e) => setDrawer(e.target.value)}
                    >
                      <option value="">Select Drawer</option>

                      {drawerList.map((d, i) => (
                        <option key={i} value={d.name || d}>
                          {d.name || d}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

              {/* ROW 2 – Charges & Payment */}
              <div className="row g-2 mt-1">
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Service Charges"
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(onlyNumbers(e.target.value))}
                    min="0"
                  />

                </div>


                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Spare Charges"
                    value={spareCharge}
                    readOnly
                    onClick={() => setSparePopup(true)}
                    style={{ cursor: "pointer", background: "#f8f9fa" }}
                  />
                </div>

<div className="col-md-3">
  <input
    className="form-control form-control-sm"
    placeholder="Estimate Amount / Time"
    value={estimate}
    readOnly
    style={{ background: "#f8f9fa", cursor: "not-allowed" }}
    onChange={(e) => setEstimate(onlyNumbers(e.target.value))}
  />
</div>
                <div className="col-md-3">
                  <select
                    className="form-select form-select-sm"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option>Payment Mode</option>
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Card</option>
                  </select>
                </div>
              </div>
{/* ROW 3 – Adv.Amount (popup) | Margin | S.Rep */}
<div className="row g-2 mt-2 align-items-start">

  {/* Adv Amount — click → popup */}
  <div className="col-md-4">
    <input
      type="text"
      className="form-control form-control-sm"
      placeholder="Adv. Amount ₹"
      value={advanceAmount}
      readOnly
      onClick={() => setShowAdvancePopup(true)}
      style={{ cursor: "pointer", background: "#f8f9fa" }}
    />
    {advanceItems.length > 0 && (
      <div style={{ fontSize: 10, color: "#0d6efd", marginTop: 2, fontWeight: 500 }}>
        💰 {advanceItems.length} payment{advanceItems.length > 1 ? "s" : ""}
      </div>
    )}
  </div>

  {/* Margin */}
  <div className="col-md-4">
    <input
      type="text"
      className="form-control form-control-sm"
      placeholder="Margin ₹"
      value={margin}
      readOnly
      style={{ background: "#f8f9fa", cursor: "not-allowed" }}
    />
  </div>

  {/* Service Rep */}
  <div className="col-md-4">
    <select
      className="form-select form-select-sm"
      value={serviceRep}
      onChange={e => setServiceRep(e.target.value)}
    >
      <option value="">Service Rep</option>
      {salesRepList.map((rep, i) => (
        <option key={i} value={rep.name || rep}>
          {rep.name || rep}
        </option>
      ))}
    </select>
  </div>

</div>
{/* ROW 4 – Repair Date, Delivery Date, Insta, Google */}
<div className="row g-2 mt-2">
  <div className="col-md-3">
    <label className="form-label small fw-semibold mb-1">Repair Date</label>
    <input
      type="date"
      className="form-control form-control-sm"
      value={repairDate}
      onChange={(e) => setRepairDate(e.target.value)}
    />
  </div>
  <div className="col-md-3">
    <label className="form-label small fw-semibold mb-1">Delivery Date</label>
    <input
      type="date"
      className="form-control form-control-sm"
      value={deliveryDate}
      onChange={(e) => setDeliveryDate(e.target.value)}
    />
  </div>
  <div className="col-md-3">
    <label className="form-label small fw-semibold mb-1">📸Insta Follow</label>
    <select
      className="form-select form-select-sm"
      value={instaFollowers}
      onChange={(e) => setInstaFollowers(e.target.value)}
    >
      <option value="">Select</option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
      <option value="Already Done">Already Done</option>
    </select>
  </div>
  <div className="col-md-3">
    <label className="form-label small fw-semibold mb-1">⭐ Google Review</label>
    <select
      className="form-select form-select-sm"
      value={googleReview}
      onChange={(e) => setGoogleReview(e.target.value)}
    >
      <option value="">Select</option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
      <option value="Already Done">Already Done</option>
    </select>
  </div>
</div>






 






















              {/* ROW 4 – Remarks */}
              <div className="row g-2 mt-2">
                <div className="col-12">
                  <textarea
                    className="form-control form-control-sm"
                    rows="2"
                    placeholder="Remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />

                </div>
              </div>

            </div>
          </div>
        </div>
<div className="col-md-3">
  <div className="card shadow-sm h-100">
    <div className="card-header fw-bold">Visual Inspection</div>
    <div className="card-body">

      {visualIssues.map((issue, i) => (
        <div className="mb-2" key={i}>
          <Select
            options={[
              ...faultList.map(f => ({ label: f.name, value: f.name })),
              { label: "Other (Add New)", value: "__custom" }
            ]}
            value={
              customFaults[i] !== undefined
                ? { label: "Other (Add New)", value: "__custom" }
                : issue
                ? { label: issue, value: issue }
                : null
            }
            onChange={(selected) => {
              if (!selected || selected.value === "__custom") {
                setCustomFaults(prev => ({ ...prev, [i]: "" }));
                updateIssue(i, "");
              } else {
                setCustomFaults(prev => {
                  const copy = { ...prev };
                  delete copy[i];
                  return copy;
                });
                updateIssue(i, selected.value);
              }
            }}
            placeholder="Search Issue..."
            isClearable
          />
          {customFaults[i] !== undefined && (
            <input
              className="form-control form-control-sm mt-2"
              placeholder="Enter Fault"
              value={customFaults[i]}
              onChange={(e) => {
                const val = e.target.value;
                setCustomFaults(prev => ({ ...prev, [i]: val }));
                updateIssue(i, val);
              }}
            />
          )}
          {visualIssues.length > 1 && (
            <button
              className="btn btn-outline-danger btn-sm mt-1 w-100"
              onClick={() => {
                removeIssue(i);
                setCustomFaults(prev => {
                  const copy = { ...prev };
                  delete copy[i];
                  return copy;
                });
              }}
            >
              ✕ Remove
            </button>
          )}
        </div>
      ))}

      <button
        className="btn btn-outline-primary btn-sm w-100"
        onClick={addIssue}
      >
        + Add Issue
      </button>

    </div>
  </div>
</div>

      </div>

      {/* ACTION BAR */}
      <div className="position-fixed bottom-0 start-0 w-100 bg-white border-top p-2 shadow">
        <div className="d-flex justify-content-center gap-2 flex-wrap">

          {/* SAVE */}
          {!isEdit && (
            <button
              className="btn btn-success btn-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
{isEdit && localEditData && !localEditData?.isCancelled && (
  <button
    className="btn btn-outline-danger btn-sm"
    onClick={() => setShowCancelModal(true)}
  >
    🚫 Cancel
  </button>
)}

{/* CANCELLED LOCK MESSAGE */}
{localEditData?.isCancelled && (
  <div className="alert alert-danger text-center mb-0 p-1" style={{ fontSize: 12 }}>
    🚫 Job Cancelled — {localEditData.cancelRemarks}
  </div>
)}





{/* {isEdit && 
 !localEditData?.isCancelled &&   // ← இதை add pannu
 (!localEditData?.isInvoiced || localEditData?.rebillPending) && (
  <button className="btn btn-warning btn-sm" onClick={handleUpdate}>
    {localEditData?.rebillPending ? "💾 Save Rebill" : "Update"}
  </button>
)} */}

{isEdit && !localEditData?.isCancelled && (
  <button className="btn btn-warning btn-sm" onClick={handleUpdate}>
    {localEditData?.rebillPending ? "💾 Save Rebill" : "Update"}
  </button>
)}



         {/* LOCK MESSAGE + REBILL BUTTON */}
{isEdit && localEditData?.isInvoiced && (
  <div className="d-flex align-items-center gap-2">
  
    <button
      onClick={async () => {
        const rebillCount = (localEditData.rebillHistory?.length || 0) + 1;
        const confirmed = window.confirm(
          `⚠️ Rebill Confirmation\n\nThis will:\n• Unlock the job sheet for editing\n• Clear current charges (Rebill #${rebillCount})\n• Set status back to "Received"\n• Save old invoice to rebill history\n\nProceed?`
        );
        if (!confirmed) return;
        setRebilling(true);
        try {
          const user = JSON.parse(sessionStorage.getItem("user") || "{}");
          const res = await axios.put(`${API}/api/jobsheets/${localEditData._id}/rebill`, {
            rebilledBy: user?.username || "admin",
          });
          setLocalEditData(res.data);
          setMobileStatus("Received");
          setServiceCharge("");
          setSpareCharge("");
          setSpareItems([]);
          setRemarks("");
          alert(`✅ Rebill #${rebillCount} opened! Add new charges and generate invoice.`);
        } catch (err) {
          console.error(err);
          alert("Rebill failed ❌");
        } finally {
          setRebilling(false);
        }
      }}
      disabled={rebilling}
      style={{
        background: "#f59e0b", color: "#fff", border: "none",
        fontWeight: 700, fontSize: 12, padding: "5px 12px",
        borderRadius: 8, whiteSpace: "nowrap", cursor: "pointer",
      }}
    >
      {rebilling ? "⏳..." : `🔄 Rebill${(localEditData.rebillHistory?.length || 0) > 0 ? ` #${(localEditData.rebillHistory.length || 0) + 1}` : ""}`}
    </button>
  </div>
)}

          {/* REFRESH */}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>

          {/* ESTIMATE */}
          <button
            className="btn btn-info btn-sm"
            onClick={() => {
              if (!editData?._id) {
                alert("Please save Job Sheet first");
                return;
              }
            
             window.open(`${window.location.origin}/estimate-bill/${editData._id}`, "_blank");
            }}
          >
            Estimate
          </button>

        <button
  className="btn btn-danger btn-sm"
  onClick={async () => {
    if (!localEditData?._id) {
      alert("Please save Job Sheet first");
      return;
    }

    try {
      // Open Invoice Page
      window.open(
        `${window.location.origin}/invoice/${localEditData._id}`,
        "_blank"
      );

      // Mark as Invoiced only
      await axios.put(
        `${API}/api/jobsheets/${localEditData._id}/invoice`
      );

      // Lock Edit
      setLocalEditData(prev => ({
        ...prev,
        isInvoiced: true
      }));

      alert("Invoice Generated Successfully 🔒");

      // Refresh
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err) {
      console.error(err);
      alert("Invoice failed ❌");
    }
  }}
>
  Invoice
</button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate("/home")}
          >
            Home
          </button>
<button
  className="btn btn-outline-dark btn-sm"
  onClick={() => navigate("/jobsheet/new")}
>
  New
</button>


        </div>
      </div>
      {showSearchModal && (
        <JobSheetSearchModal
          data={results}
          onClose={() => setShowSearchModal(false)}
        />
      )}
{/* CANCEL MODAL */}
{showCancelModal && (
  <div
    className="modal d-block"
    style={{ background: "rgba(0,0,0,0.5)", zIndex: 9999 }}
    onClick={(e) => { if (e.target === e.currentTarget) setShowCancelModal(false); }}
  >
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header bg-danger text-white">
          <h5 className="modal-title">🚫 Cancel Job Sheet — {jobSheetNo}</h5>
          <button
            className="btn-close btn-close-white"
            onClick={() => setShowCancelModal(false)}
          />
        </div>
        <div className="modal-body">
          <p className="text-muted small mb-2">
            ⚠️ Once cancelled, this job sheet cannot be edited or invoiced.
          </p>
          <label className="form-label fw-semibold">Cancel Reason <span className="text-danger">*</span></label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Enter reason for cancellation..."
            value={cancelRemarksInput}
            onChange={(e) => setCancelRemarksInput(e.target.value)}
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => { setShowCancelModal(false); setCancelRemarksInput(""); }}
          >
            Close
          </button>
          <button
            className="btn btn-danger"
            onClick={handleCancel}
            disabled={cancelling || !cancelRemarksInput.trim()}
          >
            {cancelling ? "Cancelling..." : "Confirm Cancel"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
   {sparePopup && (
        <SparePopup
          onClose={() => setSparePopup(false)}
          setSpareCharge={setSpareCharge}
          setSpareItems={setSpareItems}
             existingItems={spareItems} 
        />
      )}
{/* ✅ இதை add பண்ணு */}
{showAdvancePopup && (
  <AdvancePopup
    onClose={() => setShowAdvancePopup(false)}
    setAdvanceAmount={setAdvanceAmount}
    setAdvanceItems={setAdvanceItems}
    existingItems={advanceItems}
  />
)}




      {/* ✅ REPAIR STEPS TIMELINE */}
      {isEdit && editData?._id && (
        <RepairStepsTimeline jobId={editData._id} />
      )}

   

      <div style={{ height: "80px" }} />
    </div>

  );
};

export default JobSheetPage;