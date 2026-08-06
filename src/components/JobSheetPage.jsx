import React, { useState, useEffect } from "react";
import AdvancePopup from "./AdvancePopup";
import axios from "axios";
import makeModelData from "../data/makeModelData";
import JobSheetSearchModal from "./JobSheetSearchModal";
import SparePopup from "./SparePopup";
import OthersPopup from "./OthersPopup";
import Select from "react-select";
import RepairStepsTimeline from "./RepairStepsTimeline";
import CustomerAutocomplete from "./CustomerAutocomplete";
import { useNavigate } from "react-router-dom";
import {
  FileText, Save, RefreshCw, Calculator, Receipt, Home, Plus, Ban,
  Menu, Bell, Bandage, Gift, User, Smartphone, Wrench, Eye,
  Instagram, Star, Package, Wallet, ThumbsUp, X
} from "lucide-react";

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidPhone = (phone) => /^\d{10}$/.test(phone);
const isValidIMEI = (imei) => /^\d{15}$/.test(imei);
const isRequired = (value) => value && value.toString().trim().length > 0;
const MAX_JOBS = 5;
const onlyNumbers = (value) => value.replace(/\D/g, "");

/* ================= RADNUS THEME (SOFTENED) ================= */
const RED = "#DC2626";
const RED_SOFT_BG = "#FEF2F2";
const RED_TEXT = "#B91C1C";
const RED_BORDER = "#FBD5D5";

const AMBER = "#F59E0B";
const AMBER_SOFT_BG = "#FFFBEB";
const AMBER_TEXT = "#92400E";
const AMBER_BORDER = "#FDE9C0";

const GRAY_TEXT = "#374151";
const GRAY_BORDER = "#E5E7EB";

// sideBtnBase — padding & margin kammi
const sideBtnBase = {
  width: "100%", textAlign: "left", padding: "7px 14px",
  borderRadius: 7, fontWeight: 600, fontSize: 12.5,
  marginBottom: 4, cursor: "pointer", border: "none",
  display: "flex", alignItems: "center", gap: 8, transition: "all .15s",
  color: "#fff",
};

/* ================= BOTTOM ACTION BAR — SOLID COLORFUL BUTTONS (NEW) ================= */
const sideBtnSave = { ...sideBtnBase, background: "#DC2626" };       // Save / Update — red
const sideBtnRefresh = { ...sideBtnBase, background: "#475569" };    // Refresh — slate
const sideBtnEstimate = { ...sideBtnBase, background: "#2563EB" };   // Estimate — blue
const sideBtnInvoice = { ...sideBtnBase, background: "#7C3AED" };    // Invoice — purple
const sideBtnHome = { ...sideBtnBase, background: "#0D9488" };       // Home — teal
const sideBtnNew = { ...sideBtnBase, background: "#16A34A" };        // New — green
const sideBtnCancel = { ...sideBtnBase, background: "#991B1B" };     // Cancel — dark red
const sideBtnRebill = { ...sideBtnBase, background: "#D97706" };     // Rebill — amber

const redHeader = {
  background: RED_SOFT_BG, color: RED_TEXT, fontWeight: 700,
  borderBottom: `1px solid ${RED_BORDER}`, letterSpacing: 0.2,
  padding: "6px 12px", fontSize: 13
};

/* ================= YELLOW HEADER — DARKENED (UPDATED) ================= */
const yellowHeader = {
  background: "#FDE68A", color: "#7C2D12", fontWeight: 700,
  borderBottom: "1px solid #F59E0B", letterSpacing: 0.2,
  padding: "6px 12px", fontSize: 13
};

/* ================= REACT-SELECT DARK TEXT STYLES (NEW) ================= */
const selectDarkText = {
  control: (base) => ({ ...base, minHeight: 31, borderColor: "#CBD5E1" }),
  placeholder: (base) => ({ ...base, color: "#6B7280", fontWeight: 500 }),
  singleValue: (base) => ({ ...base, color: "#111827", fontWeight: 500 }),
  input: (base) => ({ ...base, color: "#111827" }),
  option: (base, state) => ({
    ...base,
    color: "#111827",
    fontWeight: 500,
    background: state.isFocused ? "#FEF2F2" : "#fff",
  }),
  multiValueLabel: (base) => ({ ...base, color: "#111827", fontWeight: 500 }),
};

/* ================= SELECT OPTIONS (NEW — for Physical Condition & Accessories) ================= */
const physicalConditionOptions = [
  "Colour Faded", "Antenna Broken", "Deformed", "Battery Damaged",
  "LCD Broken / Bleeding", "Tampered Set", "Front Cover Scratches",
  "Scratches On Body", "Water Logged", "Others"
].map(x => ({ label: x, value: x }));

const accessoriesOptions = ["Battery", "Charger", "Back Cover", "Memory Card", "SIM", "Others"]
  .map(x => ({ label: x, value: x }));

const JobSheetPage = ({ editData = null, isEdit = false }) => {
  const [makeList, setMakeList] = useState([]);
  const [modelList, setModelList] = useState([]);
  const navigate = useNavigate();
  const [jobSheetNo, setJobSheetNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [rebilling, setRebilling] = useState(false);
  const pendingNextNo = React.useRef(null);
  const API = import.meta.env.VITE_API_URL;
  const loggedInUser = JSON.parse(sessionStorage.getItem("user") || "{}");
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

    const errorMessages = Object.values(errors).filter(Boolean);
    if (errorMessages.length > 0) {
      alert("⚠️ Please fix before Update/Save:\n\n" + errorMessages.join("\n"));
      return false;
    }
    return true;
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
  const [othersAmount, setOthersAmount] = useState("");
  const [othersItems, setOthersItems] = useState([]);
  const [showOthersPopup, setShowOthersPopup] = useState(false);

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
  const [googleReview, setGoogleReview] = useState("");
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
  const [income, setIncome] = useState("");
  const [repairDate, setRepairDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceItems, setAdvanceItems] = useState([]);
  const [showAdvancePopup, setShowAdvancePopup] = useState(false);
  const [margin, setMargin] = useState("");




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
          cancelledBy: user?.username || "admin",
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
        spareCharge: Number(spareCharge || 0),
        income: Number(income || 0),

        othersAmount: Number(othersAmount || 0),
        othersItems,
        paymentMode, repairDate, deliveryDate,
        instaFollowers, googleReview,
        advanceAmount: Number(advanceAmount || 0),
        advanceDate,
        margin: Number(margin || 0),
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

    if (saving) return;

    if (!validateAll()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (repairDate && deliveryDate && new Date(deliveryDate) < new Date(repairDate)) {
      alert("⚠️ Delivery Date cannot be before Repair Date");
      return;
    }

    setSaving(true);

   const user = JSON.parse(sessionStorage.getItem("user") || "null");

if (!user || !user.username) {
  alert("⚠️ Session expired! Please logout and login again, then try saving.");
  setSaving(false);
  return;
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
        instaFollowers,
        googleReview, advanceDate,
        serviceCharge: Number(serviceCharge || 0),
        spareCharge: Number(spareCharge || 0),
        income: Number(income || 0),

        othersAmount: Number(othersAmount || 0),
        othersItems,
        paymentMode, repairDate, deliveryDate, remarks,
        advanceAmount: Number(advanceAmount || 0),
        margin: Number(margin || 0)
      }));
      formData.append("spareItems", JSON.stringify(spareItems));
      formData.append("idProofType", idProofType);
      if (idProofImage) formData.append("idProofImage", idProofImage);
     formData.append("createdBy", JSON.stringify({ username: user.username, role: user.role }));

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
  console.log("advanceItems being saved:", advanceItems);
  console.log("advanceAmount:", advanceAmount);
  const handleNew = (nextNo = null) => {
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
    setOthersAmount("");
    setOthersItems([]);
    setSpareItems([]);
    setIncome("");
    setPaymentMode("");
    setRemarks("");
    setAdvanceAmount("");
    setMargin("");
    setTouched({});
    setFormErrors({});


    const today = new Date().toISOString().split("T")[0];
    setRepairDate(today);
    setDeliveryDate("");

    if (nextNo) {
      setJobSheetNo(nextNo);
    } else {
      axios.get(`${API}/api/jobsheets/next-number`)
        .then(res => setJobSheetNo(res.data.next));
    }
  };

  /* ================= EDIT DATA ================= */
  useEffect(() => {
    if (!isEdit || !editData) return;
    if (!engineerList.length) return;

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
    setOthersAmount(editData.service?.othersAmount || "");
    setOthersItems(editData.service?.othersItems || []);
    setIncome(editData.service?.income || "");
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

  }, [isEdit, editData, faultList]);

  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const trimmed = searchText.trim();

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
    const free = MAX_JOBS - count;

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
    <div
      style={{ minHeight: "100vh", background: "#f6f7f9" }}
      onFocus={(e) => {
        if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) {
          setTimeout(() => {
            e.target.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 50);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target.tagName === "BUTTON") {
          e.preventDefault();
          e.target.click();
        }
      }}
    >

      {/* ============ GLOBAL DARK TEXT / PLACEHOLDER STYLES ============ */}
      <style>{`
        .form-control, .form-select {
          color: #111827 !important;
        }
        .form-control::placeholder {
          color: #6B7280 !important;
          opacity: 1 !important;
          font-weight: 500;
        }
        .form-select {
          font-weight: 500;
        }
        .form-control:disabled, .form-select:disabled {
          color: #6B7280 !important;
        }
      `}</style>

      {/* ============ TOP BAR ============ */}
      <div style={{
        background: RED,
        color: "#fff", padding: "7px 18px", display: "flex",
        justifyContent: "space-between", alignItems: "center"
      }}>

        
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
       
          <span style={{ fontWeight: 800, fontSize: 18 }}>RADNUS</span>
          <span style={{
            background: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 700,
            padding: "2px 8px", borderRadius: 4
          }}>SERVICE PRO</span>
        <span style={{ opacity: 0.5 }}>|</span>


          <span style={{ fontWeight: 700, fontSize: 16 }}>Job Sheet</span>
        </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ position: "relative", display: "inline-flex" }}>
              <Bell size={18} style={{ opacity: 0.95 }} />
              <span style={{
                position: "absolute", top: -6, right: -8, background: "#fff", color: RED_TEXT,
                borderRadius: "50%", fontSize: 9, fontWeight: 800, padding: "1px 5px"
              }}>3</span>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: "#fff", color: RED_TEXT,
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13
              }}>W</div>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Welcome, {loggedInUser?.name || loggedInUser?.username || "Admin"}</span>
            </div>
          </div>
        </div>

        <div className="container-fluid" style={{ padding: "14px 18px" }}>

          {/* Job Sheet Info Bar */}
<div className="card" style={{ marginBottom: "6px", border: "1px solid #eee", padding: "5px 16px", borderRadius: 10, boxShadow: "none" }}>
            <div className="d-flex flex-wrap align-items-center justify-content-between" style={{ lineHeight: "1" }}>
              <b className="fs-5" style={{ margin: 0, color: "#111827" }}>Job Sheet</b>
              <div style={{ margin: 0 }}><b>Job Sheet No:</b> <span style={{ color: RED_TEXT, fontWeight: 600 }}>{jobSheetNo}</span></div>
              <div style={{ margin: 0 }}><b>Date:</b> <span style={{ color: "#374151", fontWeight: 600 }}>{now.toLocaleDateString()}</span></div>
              <div style={{ margin: 0 }}><b>Time:</b> <span style={{ color: "#374151", fontWeight: 600 }}>{now.toLocaleTimeString()}</span></div>
            </div>
          </div>

          {/* SEARCH */}
         <div className="card shadow-sm" style={{ marginBottom: "16px", padding: "5px 16px", borderRadius: 10 }}>
            <div className="d-flex align-items-center flex-wrap justify-content-between" style={{ fontSize: "13px", lineHeight: "1" }}>

              <div className="d-flex align-items-center" style={{ gap: "8px" }}>
                <span className="fw-bold" style={{ whiteSpace: "nowrap", fontSize: "14px" }}>Search:</span>
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

              <div className="d-flex align-items-center" style={{ gap: "4px" }}>
                <span className="fw-bold text-secondary" style={{ whiteSpace: "nowrap", fontSize: "13px" }}>Status:</span>
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

              <div className="d-flex align-items-center" style={{ gap: "4px" }}>
                <span className="fw-bold text-secondary" style={{ whiteSpace: "nowrap", fontSize: "13px" }}>From:</span>
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

              <div className="d-flex align-items-center" style={{ gap: "4px" }}>
                <span className="fw-bold text-secondary" style={{ whiteSpace: "nowrap", fontSize: "13px" }}>To:</span>
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

              <button
                className="btn btn-sm"
                onClick={handleSearch}
                disabled={searching}
                style={{ height: "28px", width: "110px", padding: "2px 16px", fontSize: "13px", lineHeight: "1", background: RED, color: "#fff", border: "none", fontWeight: 600 }}
              >
                {searching ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" style={{ width: "10px", height: "10px" }} role="status" aria-hidden="true" />
                    ...
                  </>
                ) : "Search"}
              </button>

            </div>
          </div>

      {/* ============ MAIN GRID (REORDERED — NEW) ============ */}
          <div className="row g-2">

            {/* MAIN COLUMN — Customer / Device / Service */}
            <div className="col-md-9">

            {/* ===== NEW: Customer Details + Device Details side by side ===== */}
            <div className="row g-2 mb-2">

              <div className="col-md-6">
                <div className="card shadow-sm h-100" style={{ borderRadius: 10, overflow: "hidden" }}>
                  <div className="card-header d-flex align-items-center gap-2" style={yellowHeader}>
                    <User size={16} /> Customer Details
                  </div>
                  <div className="card-body row g-2" style={{ padding: "8px 12px" }}>

                    <div className="col-md-6">
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
                          setFormErrors(prev => ({ ...prev, customerName: "", contact: "" }));
                        }}
                        placeholder="Customer Name *"
                        className={`form-control form-control-sm ${touched.customerName && formErrors.customerName ? "is-invalid" :
                            touched.customerName && !formErrors.customerName ? "is-valid" : ""
                          }`}
                        inputProps={{
                          onBlur: () => handleBlur("customerName", customerName)
                        }}
                      />
                      {touched.customerName && formErrors.customerName && (
                        <div className="invalid-feedback d-block" style={{ fontSize: 11 }}>⚠️ {formErrors.customerName}</div>
                      )}
                    </div>

                    <div className="col-md-6">
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
                          setFormErrors(prev => ({ ...prev, customerName: "", contact: "" }));
                        }}
                        placeholder="Contact No *"
                        maxLength={10}
                        className={`form-control form-control-sm ${touched.contact && formErrors.contact ? "is-invalid" :
                            touched.contact && !formErrors.contact && contact ? "is-valid" : ""
                          }`}
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

                    <div className="col-md-6">
                      <input
                        className="form-control form-control-sm"
                        placeholder="Alt Contact"
                        value={altContact}
                        maxLength={10}
                        onChange={(e) => setAltContact(onlyNumbers(e.target.value))}
                      />
                    </div>
                    <div className="col-md-6">
                      <textarea
                        rows="2"
                        className="form-control form-control-sm"
                        placeholder="Customer Address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <input
                        type="email"
                        className={`form-control form-control-sm ${touched.email && formErrors.email ? "is-invalid" :
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

                    <div className="col-md-6">
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

                    <div className="col-md-6">
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
                        disabled={idProofType === "ID Not Required" || idProofType === "Dealer Collected"}
                      />
                    </div>

                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card shadow-sm h-100" style={{ borderRadius: 10, overflow: "hidden" }}>
                  <div className="card-header d-flex align-items-center gap-2" style={yellowHeader}>
                    <Smartphone size={16} /> Device Details
                  </div>
                  <div className="card-body row g-2" style={{ padding: "8px 12px" }}>

                    <div className="col-md-6">
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
                        styles={{
                          ...selectDarkText,
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
                        menuPortalTarget={document.body}
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

                    <div className="col-md-6">
                      <Select
                        options={modelOptions}
                        value={modelOptions.find(opt => opt.value === model) || null}
                        onChange={(selected) => {
                          setModel(selected?.value || "");
                          setCustomModel("");
                        }}
                        placeholder="Search Model..."
                        isClearable
                        styles={{
                          ...selectDarkText,
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
                        menuPortalTarget={document.body}
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

                    <div className="col-md-6">
                      <input
                        className="form-control form-control-sm"
                        placeholder="IMEI *"
                        value={imei}
                        maxLength={15}
                        onChange={(e) => setImei(onlyNumbers(e.target.value))}
                      />
                    </div>

                    <div className="col-md-6">
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
                    <div className="col-md-6">
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
                    <div className="col-md-6">
                      <input
                        className="form-control form-control-sm"
                        placeholder="Pattern / PIN"
                        value={pattern}
                        onChange={(e) => setPattern(e.target.value)}
                      />
                    </div>

                  </div>
                </div>
              </div>

            </div>
            {/* ===== END: Customer Details + Device Details side by side ===== */}

              <div className="card shadow-sm" style={{ borderRadius: 10, overflow: "hidden" }}>
           <div className="card-header d-flex align-items-center gap-2" style={yellowHeader}>
                  <Wrench size={16} /> Service / Repair Details
                </div>

                <div className="card-body" style={{ padding: "8px 12px" }}>

                  <div className="row g-2">

                      <div className="col-md-3">
                        <select
                          className="form-select form-select-sm"
                          value={engineer}
                          onChange={e => setEngineer(e.target.value)}
                          style={{ borderColor: engineer && (workloadMap[engineer] || 0) >= MAX_JOBS ? "#ef4444" : "" }}
                        >
                          <option value="">Select Engineer</option>
                          {engineerList.map((eng, i) => {
                            const name = eng.name || eng;
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
                          const free = MAX_JOBS - count;
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

                      <div className="col-md-3">
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

                      <div className="col-md-3">
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

                      <div className="col-md-3">
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

                  <div className="row g-2 mt-1">
                    <div className="col-md-3">
                      <input
                        className="form-control form-control-sm"
                        placeholder="Income ₹"
                        value={income}
                        onChange={(e) => setIncome(onlyNumbers(e.target.value))}
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
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Others ₹"
                        value={othersAmount}
                        readOnly
                        onClick={() => setShowOthersPopup(true)}
                        style={{ cursor: "pointer", background: "#f8f9fa" }}
                      />
                      {othersItems.length > 0 && (
                        <div style={{ fontSize: 10, color: "#6c757d", marginTop: 2, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                          <Package size={11} /> {othersItems.length} expense{othersItems.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
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

                  </div>

           <div className="row g-2 mt-1 align-items-start">

                    <div className="col-md-3">
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
                        <div style={{ fontSize: 10, color: "#0d6efd", marginTop: 2, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                          <Wallet size={11} /> {advanceItems.length} payment{advanceItems.length > 1 ? "s" : ""}
                        </div>
                      )}
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

                    <div className="col-md-3">
                      {/* <label className="form-label small fw-semibold mb-1 d-flex align-items-center gap-1">
                        <Instagram size={13} /> Insta Follow
                      </label> */}
                      <select
                        className="form-select form-select-sm"
                        value={instaFollowers}
                        onChange={(e) => setInstaFollowers(e.target.value)}
                      >
                        <option value="">Insta Follow</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Already Done">Already Done</option>
                      </select>
                    </div>

                    <div className="col-md-3">
                      {/* <label className="form-label small fw-semibold mb-1 d-flex align-items-center gap-1">
                        <Star size={13} /> Google Review
                      </label> */}
                      <select
                        className="form-select form-select-sm"
                        value={googleReview}
                        onChange={(e) => setGoogleReview(e.target.value)}
                      >
                        <option value="">Google Review</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Already Done">Already Done</option>
                      </select>
                    </div>

                  </div>

                 <div className="row g-2 mt-1">
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
<div className="col-md-6">
  <label className="form-label small fw-semibold mb-1">Remarks</label>
  <textarea
    className="form-control form-control-sm"
    placeholder="Remarks"
    value={remarks}
    onChange={(e) => setRemarks(e.target.value)}
    style={{ height: "31px", resize: "none" }}
  />
</div>
                  </div>


                </div>
              </div>
            </div>

            {/* SIDE COLUMN — Visual Inspection → Physical Condition → Accessories (NEW ORDER, SELECT STYLE) */}
            <div className="col-md-3">

            <div className="card shadow-sm mb-2" style={{ borderRadius: 10, overflow: "hidden" }}>
                <div className="card-header d-flex align-items-center gap-2" style={redHeader}>
                  <Eye size={16} /> Visual Inspection
                </div>
                <div className="card-body" style={{ padding: "8px 12px" }}>

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
                        menuPortalTarget={document.body}
                        styles={{
                          ...selectDarkText,
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
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
                          <X size={14} /> Remove
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    className="btn btn-sm w-100"
                    style={{ background: RED_SOFT_BG, color: RED_TEXT, border: `1px solid ${RED_BORDER}`, fontWeight: 600 }}
                    onClick={addIssue}
                  >
                    <Plus size={14} /> Add Issue
                  </button>

                </div>
              </div>

              {/* PHYSICAL CONDITION — now a multi-select (NEW) */}
             <div className="card shadow-sm mb-2" style={{ borderRadius: 10, overflow: "hidden" }}>
                <div className="card-header d-flex align-items-center gap-2" style={redHeader}>
                  <Bandage size={16} /> Physical Condition
                </div>
                <div className="card-body small" style={{ padding: "8px 12px" }}>
                  <Select
                    isMulti
                    options={physicalConditionOptions}
                    value={physicalConditionOptions.filter(o => physicalCondition.includes(o.value))}
                    onChange={(selected) => setPhysicalCondition(selected ? selected.map(s => s.value) : [])}
                    placeholder="Select Physical Condition..."
                    isClearable
                    menuPortalTarget={document.body}
                    styles={{
                      ...selectDarkText,
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                  />
                  {physicalCondition.includes("Others") && (
                    <input className="form-control form-control-sm mt-2" placeholder="Other Details" />
                  )}
                </div>
              </div>

              {/* ACCESSORIES — now a multi-select (NEW) */}
              <div className="card shadow-sm" style={{ borderRadius: 10, overflow: "hidden" }}>
                <div className="card-header d-flex align-items-center gap-2" style={redHeader}>
                  <Gift size={16} /> Accessories Received
                </div>
                <div className="card-body small" style={{ padding: "8px 12px" }}>
                  <Select
                    isMulti
                    options={accessoriesOptions}
                    value={accessoriesOptions.filter(o => accessories.includes(o.value))}
                    onChange={(selected) => setAccessories(selected ? selected.map(s => s.value) : [])}
                    placeholder="Select Accessories..."
                    isClearable
                    menuPortalTarget={document.body}
                    styles={{
                      ...selectDarkText,
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                  />
                  {accessories.includes("Others") && (
                    <input className="form-control form-control-sm mt-2" placeholder="Battery Number" />
                  )}
                </div>
              </div>

            </div>

          </div>

          {showSearchModal && (
            <JobSheetSearchModal
              data={results}
              onClose={() => setShowSearchModal(false)}
            />
          )}

          {showCancelModal && (
            <div
              className="modal d-block"
              style={{ background: "rgba(0,0,0,0.5)", zIndex: 9999 }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowCancelModal(false); }}
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header" style={{ background: RED, color: "#fff" }}>
                    <h5 className="modal-title d-flex align-items-center gap-2">
                      <Ban size={18} /> Cancel Job Sheet — {jobSheetNo}
                    </h5>
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
              referenceData={{ income, service: serviceCharge, others: othersAmount, advance: advanceAmount }}
            />
          )}

          {showOthersPopup && (
            <OthersPopup
              onClose={() => setShowOthersPopup(false)}
              setOthersAmount={setOthersAmount}
              setOthersItems={setOthersItems}
              existingItems={othersItems}
              referenceData={{ income, service: serviceCharge, spare: spareCharge, advance: advanceAmount }}
            />
          )}

          {showAdvancePopup && (
            <AdvancePopup
              onClose={() => setShowAdvancePopup(false)}
              setAdvanceAmount={setAdvanceAmount}
              setAdvanceItems={setAdvanceItems}
              existingItems={advanceItems}
              referenceData={{ income, service: serviceCharge, spare: spareCharge, others: othersAmount }}
            />
          )}

     {isEdit && editData?._id && (
            <RepairStepsTimeline jobId={editData._id} />
          )}
        </div>

        {/* ============ BOTTOM ACTION BAR ============ */}
        <div style={{
          position: "sticky", bottom: 0, background: "#fff",
          borderTop: "1px solid #eee", padding: "8px 18px",
          display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
          boxShadow: "0 -2px 8px rgba(0,0,0,0.05)", zIndex: 10
        }}>
          {!isEdit && (
            <button style={{ ...sideBtnSave, width: "auto" }} onClick={handleSave} disabled={saving}>
              <Save size={16} /> {saving ? "Saving..." : "Save"}
            </button>
          )}

          {isEdit && !localEditData?.isCancelled && (
            <button style={{ ...sideBtnSave, width: "auto" }} onClick={handleUpdate}>
              <Save size={16} /> {localEditData?.rebillPending ? "Save Rebill" : "Update"}
            </button>
          )}

          <button style={{ ...sideBtnRefresh, width: "auto" }} onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Refresh
          </button>

          <button
            style={{ ...sideBtnEstimate, width: "auto" }}
            onClick={() => {
              if (!editData?._id) { alert("Please save Job Sheet first"); return; }
              window.open(`${window.location.origin}/estimate-bill/${editData._id}`, "_blank");
            }}
          >
            <Calculator size={16} /> Estimate
          </button>

          <button
            style={{ ...sideBtnInvoice, width: "auto" }}
            onClick={async () => {
              if (!localEditData?._id) { alert("Please save Job Sheet first"); return; }
              try {
                window.open(`${window.location.origin}/invoice/${localEditData._id}`, "_blank");
                await axios.put(`${API}/api/jobsheets/${localEditData._id}/invoice`);
                setLocalEditData(prev => ({ ...prev, isInvoiced: true }));
                alert("Invoice Generated Successfully 🔒");
                setTimeout(() => { window.location.reload(); }, 1000);
              } catch (err) {
                console.error(err);
                alert("Invoice failed ❌");
              }
            }}
          >
            <Receipt size={16} /> Invoice
          </button>

          <button style={{ ...sideBtnHome, width: "auto" }} onClick={() => navigate("/home")}>
            <Home size={16} /> Home
          </button>

          <button style={{ ...sideBtnNew, width: "auto" }} onClick={() => navigate("/jobsheet/new")}>
            <Plus size={16} /> New
          </button>

          {isEdit && localEditData && !localEditData?.isCancelled && (
            <button style={{ ...sideBtnCancel, width: "auto" }} onClick={() => setShowCancelModal(true)}>
              <Ban size={16} /> Cancel
            </button>
          )}

          {isEdit && localEditData?.isInvoiced && (
            <button
              style={{ ...sideBtnRebill, width: "auto" }}
              disabled={rebilling}
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
            >
              {rebilling ? "⏳..." : (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <RefreshCw size={14} />
                  {`Rebill${(localEditData.rebillHistory?.length || 0) > 0 ? ` #${(localEditData.rebillHistory.length || 0) + 1}` : ""}`}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    
  );
};

export default JobSheetPage;