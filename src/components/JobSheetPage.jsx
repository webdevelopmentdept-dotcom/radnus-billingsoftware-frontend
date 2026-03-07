import React, { useState, useEffect } from "react";
import axios from "axios";
import makeModelData from "../data/makeModelData";
import JobSheetSearchModal from "./JobSheetSearchModal";
import SparePopup from "./SparePopup";

import { useNavigate } from "react-router-dom";
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const onlyNumbers = (value) => value.replace(/\D/g, "");
const JobSheetPage = ({ editData = null, isEdit = false }) => {
  const [makeList, setMakeList] = useState([]);
  const [modelList, setModelList] = useState([]);
  const navigate = useNavigate();
  const [jobSheetNo, setJobSheetNo] = useState("");
  const [saving, setSaving] = useState(false); 
  const API = import.meta.env.VITE_API_URL;

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
  /* ================= JOB SHEET NO ================= */

  useEffect(() => {
    if (isEdit && editData) {
      // 🔒 EDIT MODE → DB value ONLY
      setJobSheetNo(editData.jobSheetNo);
    } else {
      // 🆕 NEW MODE → localStorage
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
    if (!make || make === "__custom") {
      setModelList([]);
      return;
    }

    axios.get(`${API}/api/models/${make}`)
      .then(res => setModelList(res.data))
      .catch(err => {
        console.error("Model fetch error:", err);
        setModelList([]);
      });
  }, [make]);

  const [imei, setImei] = useState("");
  const [warranty, setWarranty] = useState("");
  const [pattern, setPattern] = useState("");
  const [mobileStatus, setMobileStatus] = useState("");
  const [idProofType, setIdProofType] = useState("");
  const [idProofImage, setIdProofImage] = useState(null);

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

  const toggleCheckbox = (value, state, setState) => {
    setState(
      state.includes(value)
        ? state.filter(v => v !== value)
        : [...state, value]
    );
  };

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
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [remarks, setRemarks] = useState("");

  /* ================= VISUAL ISSUES ================= */
  const addIssue = () => setVisualIssues([...visualIssues, ""]);
  const updateIssue = (i, val) => {
    const copy = [...visualIssues];
    copy[i] = val;
    setVisualIssues(copy);
  };
  const removeIssue = (i) =>
    setVisualIssues(visualIssues.filter((_, idx) => idx !== i));

  /* ================= UPDATE ================= */
  const handleUpdate = async () => {
    if (email && !isValidEmail(email)) {
      alert("Please enter valid Email ID ❌");
      return;
    }

    try {
      const payload = {
        jobSheetNo,
        customer: { name: customerName, contact, altContact, address, email },
        device: {
          make,
          model,
          imei,
          warranty,
          pattern,
          idProofType,
          idProofImage,
          mobileStatus
        },
        physicalCondition,
        accessories,
        visualIssues: visualIssues.filter(Boolean),
        service: {
          engineer,
          dealer,
          drawer,
          serviceCharge: Number(serviceCharge),
          spareCharge: Number(spareCharge),
          estimate,
          paymentMode,
          repairDate,
          deliveryDate,
          remarks
        }
      };

      await axios.put(
        `${API}/api/jobsheets/${editData._id}`,
        payload
      );

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

    setSaving(true);

    const user = JSON.parse(localStorage.getItem("user"));

    // ✅ EMAIL VALIDATION
    if (email && !isValidEmail(email)) {
      alert("Please enter valid Email ID ❌");
      setSaving(false);
      return;
    }
    try {
      
      const currentJobSheetNo = jobSheetNo;

      const formData = new FormData();

      /* ================= BASIC ================= */
      formData.append("jobSheetNo", currentJobSheetNo);

      /* ================= CUSTOMER ================= */
      formData.append(
        "customer",
        JSON.stringify({
          name: customerName,
          contact,
          altContact,
          address,
          email, // ✅ merged
        })
      );

      formData.append(
  "createdBy",
  JSON.stringify({
    username: user?.username || "unknown",
    role: user?.role || "user"
  })
);

      /* ================= DEVICE ================= */
      formData.append(
        "device",
        JSON.stringify({
          make: make === "__custom" ? customMake : make,
          model: model === "__custom" ? customModel : model,
          imei,
          warranty,
          pattern,
          mobileStatus,
        })
      );

      /* ================= ARRAYS ================= */
      formData.append(
        "physicalCondition",
        JSON.stringify(physicalCondition)
      );

      formData.append(
        "accessories",
        JSON.stringify(accessories)
      );

      formData.append(
        "visualIssues",
        JSON.stringify(visualIssues.filter(Boolean))
      );

      /* ================= SERVICE ================= */
      formData.append(
        "service",
        JSON.stringify({
          engineer,
          dealer,
          drawer,
          serviceCharge: Number(serviceCharge || 0), // ✅ safe
          spareCharge: Number(spareCharge || 0),     // ✅ safe
          estimate,
          paymentMode,
          repairDate,
          deliveryDate,
          remarks,
        })
      );

      formData.append(
  "spareItems",
  JSON.stringify(spareItems)
);

      /* ================= ID PROOF ================= */
      formData.append("idProofType", idProofType);

      if (idProofImage) {
        formData.append("idProofImage", idProofImage);
      }

      /* ================= API CALL ================= */
      await axios.post(
        `${API}/api/jobsheets`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      /* ================= JOB NUMBER INCREMENT ================= */
      // get next job number from DB
axios.get(`${API}/api/jobsheets/next-number`)
  .then(res => setJobSheetNo(res.data.next))
  .catch(err => console.error(err));

      alert("Job Sheet Saved Successfully ✅");

      handleNew();

    } catch (err) {
      console.error(err);

      // 🔥 DUPLICATE ERROR HANDLE (MERGED)
      if (err.response?.data?.code === 11000) {
        alert("JobSheet No already exists ❌");
      } else {
        alert("Save failed ❌");
      }

    } finally {
      setSaving(false); // 🔥 RESET ALWAYS
    }
  };


  /* ================= NEW ================= */

  const handleNew = () => {
    // ✅ clear all fields
    setCustomerName("");
    setContact("");
    setAltContact("");
    setAddress("");
    setEmail("");

    setMake("");
    setCustomMake("");
    setModel("");
    setCustomModel("");
    setImei("");
    setWarranty("");
    setPattern("");
    setIdProofType("");
    setIdProofImage(null);
    setMobileStatus("");

    setPhysicalCondition([]);
    setAccessories([]);
    setVisualIssues([""]);

    setEngineer("");
    setDealer("");
    setDrawer("");
    setServiceCharge("");
    setSpareCharge("");
    setEstimate("");
    setPaymentMode("");
    setRemarks("");

    const today = new Date().toISOString().split("T")[0];
    setRepairDate(today);
    setDeliveryDate(today);

    // ✅ IMPORTANT: exit edit mode
    navigate("/jobsheet"); // go to fresh route

    // ✅ NEW JOB NUMBER
    
  axios.get(`${API}/api/jobsheets/next-number`)
    .then(res => setJobSheetNo(res.data.next))
    .catch(err => console.error(err));
};

  /* ================= EDIT DATA ================= */

  useEffect(() => {
    if (!isEdit || !editData) return;

    // CUSTOMER
    setCustomerName(editData.customer?.name || "");
    setContact(editData.customer?.contact || "");
    setAltContact(editData.customer?.altContact || "");
    setAddress(editData.customer?.address || "");
    setEmail(editData.customer?.email || "");


    // DEVICE
    setMake(editData.device?.make || "");
    setModel(editData.device?.model || "");
    setImei(editData.device?.imei || "");
    setWarranty(editData.device?.warranty || "");
    setPattern(editData.device?.pattern || "");
    setIdProofType(editData.device?.idProofType || "");
   setIdProofPreview(editData.idProofImage || "");
    setMobileStatus(editData.device?.mobileStatus || "");

    // CHECKBOX ARRAYS
    setPhysicalCondition(editData.physicalCondition || []);
    setAccessories(editData.accessories || []);
    setVisualIssues(editData.visualIssues?.length ? editData.visualIssues : [""]);

    // SERVICE
    setEngineer(editData.service?.engineer || "");
    setDealer(editData.service?.dealer || "");
    setDrawer(editData.service?.drawer || "");
    setServiceCharge(editData.service?.serviceCharge || "");
    setSpareCharge(editData.service?.spareCharge || "");
    setSpareItems(editData.spareItems || []);
    setEstimate(editData.service?.estimate || "");
    setPaymentMode(editData.service?.paymentMode || "");
    setRepairDate(editData.service?.repairDate?.slice(0, 10) || today);
    setDeliveryDate(editData.service?.deliveryDate?.slice(0, 10) || today);
    setRemarks(editData.service?.remarks || "");

  }, [isEdit, editData]);


  const handleSearch = async () => {
    try {
      const res = await axios.get(
        `${API}/api/jobsheets/filter`,
        {
          params: {
            q: searchText || undefined,
            status: searchStatus || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
          },
        }
      );

      setResults(res.data);
      setShowSearchModal(true);

    } catch (err) {
      console.error(err);
      alert("Search failed");
    }
  };
  const [localEditData, setLocalEditData] = useState(editData);
  useEffect(() => {
    setLocalEditData(editData);
  }, [editData]);

  return (
    <div className="container-fluid bg-light min-vh-100 p-3">

      {/* HEADER */}
      <div className="card shadow-sm mb-3">
        <div className="card-body d-flex justify-content-between flex-wrap gap-3">
          <b className="fs-5">Job Sheet</b>
          <div><b>Job Sheet No:</b> <span className="text-primary">{jobSheetNo}</span></div>
          <div><b>Date:</b> {now.toLocaleDateString()}</div>
          <div><b>Time:</b> {now.toLocaleTimeString()}</div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="card shadow-sm mb-3">
        <div className="card-header fw-bold">Search Job Sheet</div>

        <div className="card-body row g-2 align-items-end">

          {/* SMART SEARCH */}
          <div className="col-md-3">
            <input
              className="form-control form-control-sm"
              placeholder="Job Sheet / IMEI / Contact / Name"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* STATUS */}
          <div className="col-md-2">
            <select
  className="form-select form-select-sm"
  value={searchStatus}
  onChange={(e) => setSearchStatus(e.target.value)}
>
  <option value="">All Status</option>
  <option value="Received">Received</option>
  <option value="Pending">Pending</option>
  <option value="Delivered">Delivered</option>
  <option value="Delivered NR/NA">Delivered NR/NA</option>
</select>
          </div>

          {/* FROM DATE */}
          <div className="col-md-2">
            <input
              type="date"
              className="form-control form-control-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          {/* TO DATE */}
          <div className="col-md-2">
            <input
              type="date"
              className="form-control form-control-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          {/* ACTION */}
          <div className="col-md-3 d-flex gap-2">
            <button
              className="btn btn-primary btn-sm w-100"
              onClick={handleSearch}
            >
              Search
            </button>
            <button className="btn btn-outline-success btn-sm w-100">
              Download
            </button>
          </div>

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
              <div className="col-md-4">
                <input
                  className="form-control form-control-sm"
                  placeholder="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <input
                  className="form-control form-control-sm"
                  placeholder="Contact No *"
                  value={contact}
                  maxLength={10}
                  onChange={(e) => setContact(onlyNumbers(e.target.value))}
                />

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

              <div className="col-md-4">
                <input
                  type="email"
                  className={`form-control form-control-sm ${email && !isValidEmail(email) ? "is-invalid" : ""
                    }`}
                  placeholder="Email ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}

                />

                {email && !isValidEmail(email) && (
                  <div className="text-danger small">Invalid email format</div>
                )}

              </div>

            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-header fw-bold">Device Details</div>
            <div className="card-body row g-2">

              {/* Row 1 */}
              {/* MAKE */}
              <div className="col-md-4">
                <select
                  className="form-select form-select-sm"
                  value={make}
                  onChange={(e) => {
                    setMake(e.target.value);
                    setCustomMake("");
                    setModel("");
                    setCustomModel("");
                  }}
                >
                  <option value="">Select Make</option>

                  {makeList.map((mk, i) => (
  <option key={i} value={mk.name || mk}>
    {mk.name || mk}
  </option>
))}

                  <option value="__custom">Other (Add New)</option>
                </select>


                {make === "__custom" && (
                  <input
                    className="form-control form-control-sm mt-1"
                    placeholder="Enter Make"
                    value={customMake}
                    onChange={(e) => setCustomMake(e.target.value)}
                  />
                )}
              </div>

              {/* MODEL */}
              <div className="col-md-4">
                <select
                  className="form-select form-select-sm"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="">Select Model</option>

                  {modelList.map((m, i) => (
                    <option key={i} value={m.name || m}>
                      {m.name || m}
                    </option>
                  ))}

                  <option value="__custom">Other (Add New)</option>
                </select>


                {model === "__custom" && (
                  <input
                    className="form-control form-control-sm mt-1"
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
                  <option value="Delivered">Delivered</option>
                  <option value="Delivered NR/NA">Delivered NR/NA</option>
                </select>
              </div>
              <div className="col-md-4">
                <select
                  className="form-select form-select-sm"
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                >
                  <option value="">Warranty</option>
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
                  onChange={(e) => setIdProofImage(e.target.files[0])}
                  disabled={
                    idProofType === "ID Not Required" ||
                    idProofType === "Dealer Collected"
                  }
                />
              </div>


            </div>
          </div>


          <div className="card shadow-sm">
            <div className="card-header fw-bold">Service / Repair Details</div>

            <div className="card-body">

              {/* ROW 1 – Engineer / Dealer / Drawer */}
              <div className="row g-2">
                <div className="row g-2">

                  {/* Engineer – DROPDOWN */}
                  <div className="col-md-4">
                    <select
                      className="form-select form-select-sm"
                      value={engineer}
                      onChange={(e) => setEngineer(e.target.value)}
                    >
                      <option value="">Select Engineer</option>

                      {engineerList.map((e, i) => (
  <option key={i} value={e.name || e}>
    {e.name || e}
  </option>
))}
                    </select>
                  </div>

                  {/* Dealer – TEXTBOX */}
                  <div className="col-md-4">
                    <input
                      placeholder="Dealer Name"
                      className="form-control form-control-sm"
                      value={dealer}
                      onChange={(e) => setDealer(e.target.value)}
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

              {/* ROW 3 – Repair & Delivery Date */}
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

        {/* RIGHT COLUMN */}
        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-header fw-bold">Visual Inspection</div>
            <div className="card-body">
              {visualIssues.map((issue, i) => (
                <div className="d-flex gap-2 mb-2" key={i}>
                  <select
                    className="form-select form-select-sm"
                    value={issue}
                    onChange={(e) => updateIssue(i, e.target.value)}
                  >
                    <option value="">Select Issue</option>

                    {faultList.map(f => (
                      <option key={f._id} value={f.name}>
                        {f.name} {f.price ? `- ₹${f.price}` : ""}
                      </option>
                    ))}
                  </select>

                  {visualIssues.length > 1 && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeIssue(i)}
                    >
                      ✕
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

          {/* UPDATE (LOCK CONDITION) */}
          {isEdit && !localEditData?.isInvoiced && (
            <button className="btn btn-warning btn-sm" onClick={handleUpdate}>
              Update
            </button>
          )}

          {/* LOCK MESSAGE */}
          {isEdit && localEditData?.isInvoiced && (
            <div className="alert alert-danger text-center mb-0 p-1">
              🔒 Invoice Generated — Edit Disabled
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
              window.open(`/estimate-bill/${editData._id}`, "_blank");
            }}
          >
            Estimate
          </button>

          {/* INVOICE + LOCK */}
          <button
            className="btn btn-danger btn-sm"
            onClick={async () => {
              if (!localEditData?._id) {
                alert("Please save Job Sheet first");
                return;
              }

              try {
                await axios.put(
                  `${API}/api/jobsheets/${localEditData._id}/invoice`
                );

                // ✅ UPDATE UI IMMEDIATELY
                setLocalEditData(prev => ({
                  ...prev,
                  isInvoiced: true
                }));

                alert("Invoice Generated & Locked 🔒");

                window.open(`/invoice/${localEditData._id}`, "_blank");
              } catch (err) {
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

          {/* NEW */}
          <button
            className="btn btn-outline-dark btn-sm"
            onClick={handleNew}
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

          {sparePopup && (
  <SparePopup
    onClose={() => setSparePopup(false)}
    setSpareCharge={setSpareCharge}
    setSpareItems={setSpareItems}
  />
)}

      <div style={{ height: "80px" }} />
    </div>

  );
};

export default JobSheetPage;