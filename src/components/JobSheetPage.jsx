import React, { useState, useEffect } from "react";
import AdvancePopup from "./AdvancePopup";
import axios from "axios";
import JobSheetSearchModal from "./JobSheetSearchModal";
import SparePopup from "./SparePopup";
import OthersPopup from "./OthersPopup";
import Select from "react-select";
import RepairStepsTimeline from "./RepairStepsTimeline";
import CustomerAutocomplete from "./CustomerAutocomplete";
import JobSheetSidebar from "./JobSheetSidebar";
import { useNavigate } from "react-router-dom";
import {
  FileText, Save, RefreshCw, Calculator, Receipt, Home, Plus, Ban,
  Menu, Bell, Bandage, Gift, User, Smartphone, Wrench, Eye,
  Instagram, Star, Package, Wallet, ThumbsUp, X, Calendar, MessageCircle,
  Clock, Cog, CheckCircle2, IndianRupee, AlertCircle, AlertTriangle, Info
} from "lucide-react";

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidPhone = (phone) => /^\d{10}$/.test(phone);
const isValidIMEI = (imei) => /^\d{15}$/.test(imei);
const isRequired = (value) => value && value.toString().trim().length > 0;

const onlyNumbers = (value) => value.replace(/\D/g, "");

/* ================= FREE TYPO-TOLERANT FUZZY SEARCH =================
   No API/cost — plain Levenshtein edit-distance. Used as a custom filterOption for the
   Make / Model / Fault / Physical Condition / Accessories react-select dropdowns so a typo
   like "Semsung" still finds "Samsung" in the master list. Since the user still has to PICK
   an option from the list, the saved value is always the correctly-spelled master entry. */
const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

const fuzzyFilterOption = (option, inputValue) => {
  if (!inputValue) return true;
  const label = (option.label || "").toLowerCase();
  const input = inputValue.toLowerCase();
  if (label.includes(input)) return true; // normal substring match still works first
  const maxDist = Math.max(1, Math.ceil(input.length * 0.3)); // ~30% typo tolerance
  return label.split(/\s+/).some(word => levenshtein(word, input) <= maxDist);
};

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

/* ================= FIELD LABEL — persistent label above every input =================
   Fixes: once a value is typed, the placeholder disappears and the user can no longer tell
   which field they're looking at (e.g. Income vs Service Charges). A small permanent label
   above the field solves this for new/first-time users at a new store. */
const FieldLabel = ({ children, required }) => (
  <label
    className="d-block"
    style={{
      fontSize: 14,
      fontWeight: 500,
      color: "#000000",
      marginBottom: 3,
      letterSpacing: 0.2,
    }}
  >
    {children}
    {required && <span style={{ color: RED_TEXT }}> *</span>}
  </label>
);

const Field = ({ label, required, children }) => (
  <div>
    <FieldLabel required={required}>{label}</FieldLabel>
    {children}
  </div>
);

/* ================= MODERN FIELD VALIDATION MESSAGES =================
   Replaces the old plain "⚠️ Customer Name is required" text with a small pill-style
   message that has an icon, a soft background, and a gentle slide/fade-in animation so
   it doesn't just "pop" into existence. Used everywhere formErrors used to be rendered
   directly. FieldSuccess is the green equivalent for "✅ looks good" states. */
const FieldError = ({ children }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 6,
      marginTop: 5,
      padding: "4px 8px",
      borderRadius: 6,
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      animation: "fieldMsgIn 0.18s ease",
    }}
  >
    <AlertCircle size={13} color={RED_TEXT} style={{ flexShrink: 0, marginTop: 1 }} />
    <span style={{ fontSize: 11.5, color: RED_TEXT, fontWeight: 600, lineHeight: 1.3 }}>
      {children}
    </span>
  </div>
);

const FieldSuccess = ({ children }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginTop: 5,
      animation: "fieldMsgIn 0.18s ease",
    }}
  >
    <CheckCircle2 size={13} color="#16A34A" style={{ flexShrink: 0 }} />
    <span style={{ fontSize: 11.5, color: "#16A34A", fontWeight: 600 }}>{children}</span>
  </div>
);

/* ================= MODERN TOAST NOTIFICATIONS =================
   Drop-in replacement for every window.alert(...) call in this page. Toasts stack in the
   top-right corner, auto-dismiss after ~4s, can be clicked away early, and are styled per
   type (success / error / warning / info) instead of the browser's plain alert box.
   Usage: showToast("Job Sheet Saved", "success") */
const TOAST_STYLES = {
  success: { accent: "#16A34A", bg: "#F0FDF4", icon: CheckCircle2 },
  error: { accent: "#DC2626", bg: "#FEF2F2", icon: AlertCircle },
  warning: { accent: "#D97706", bg: "#FFFBEB", icon: AlertTriangle },
  info: { accent: "#2563EB", bg: "#EFF6FF", icon: Info },
};

const Toast = ({ toast, onDismiss }) => {
  const cfg = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const Icon = cfg.icon;
  return (
    <div
      onClick={() => onDismiss(toast.id)}
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        minWidth: 280,
        maxWidth: 380,
        background: "#fff",
        borderLeft: `4px solid ${cfg.accent}`,
        borderRadius: 10,
        padding: "12px 14px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)",
        cursor: "pointer",
        animation: "toastIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div
        style={{
          width: 26, height: 26, borderRadius: "50%", background: cfg.bg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <Icon size={15} color={cfg.accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13, fontWeight: 600, color: "#111827",
            lineHeight: 1.45, whiteSpace: "pre-line", wordBreak: "break-word",
          }}
        >
          {toast.message}
        </div>
      </div>
      <X size={14} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
    </div>
  );
};

const ToastContainer = ({ toasts, onDismiss }) => (
  <div
    style={{
      position: "fixed", top: 16, right: 16, zIndex: 999999,
      display: "flex", flexDirection: "column", gap: 10,
      pointerEvents: "none",
    }}
  >
    {toasts.map((t) => (
      <div key={t.id} style={{ pointerEvents: "auto" }}>
        <Toast toast={t} onDismiss={onDismiss} />
      </div>
    ))}
  </div>
);

/* ================= BOTTOM ACTION BAR — SOLID COLORFUL BUTTONS ================= */
const sideBtnSave = { ...sideBtnBase, background: "#DC2626" };       // Save / Update — red
const sideBtnRefresh = { ...sideBtnBase, background: "#475569" };    // Refresh — slate
const sideBtnEstimate = { ...sideBtnBase, background: "#2563EB" };   // Estimate — blue
const sideBtnInvoice = { ...sideBtnBase, background: "#7C3AED" };    // Invoice — purple
const sideBtnHome = { ...sideBtnBase, background: "#0D9488" };       // Home — teal
const sideBtnNew = { ...sideBtnBase, background: "#16A34A" };        // New — green
const sideBtnCancel = { ...sideBtnBase, background: "#991B1B" };     // Cancel — dark red
const sideBtnRebill = { ...sideBtnBase, background: "#D97706" };     // Rebill — amber
const sideBtnWhatsApp = { ...sideBtnBase, background: "#25D366" };   // Send WhatsApp — WhatsApp green (NEW)

const redHeader = {
  background: RED_SOFT_BG, color: RED_TEXT, fontWeight: 700,
  borderBottom: `1px solid ${RED_BORDER}`, letterSpacing: 0.2,
  padding: "6px 12px", fontSize: 13
};

/* ================= YELLOW HEADER — DARKENED ================= */
const yellowHeader = {
  background: "#FDE68A", color: "#7C2D12", fontWeight: 700,
  borderBottom: "1px solid #F59E0B", letterSpacing: 0.2,
  padding: "6px 12px", fontSize: 13
};

/* ================= REACT-SELECT DARK TEXT STYLES ================= */
const selectDarkText = {
  control: (base) => ({ ...base, minHeight: 31, borderColor: "#CBD5E1" }),
  placeholder: (base) => ({ ...base, color: "#6B7280", fontWeight: 400 }),
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

/* ================= COMPACT SELECT — fixed short height, single-line text =================
   Used for single-value dropdowns (Make, Model) where the placeholder/value should stay on
   one line instead of wrapping and stretching the field taller than the inputs beside it. */
const selectCompactText = {
  ...selectDarkText,
  control: (base) => ({ ...base, minHeight: 31, height: 31, borderColor: "#CBD5E1" }),
  valueContainer: (base) => ({ ...base, height: 29, padding: "0 8px", flexWrap: "nowrap" }),
  indicatorsContainer: (base) => ({ ...base, height: 29 }),
  input: (base) => ({ ...base, margin: 0, padding: 0, color: "#111827" }),
  placeholder: (base) => ({
    ...base, color: "#6B7280", fontWeight: 500,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  }),
  singleValue: (base) => ({
    ...base, color: "#111827", fontWeight: 500,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  }),
};

/* ================= TOP STATS CARD — Pending / In Process / Delivered / Revenue =================
   Small dashboard-style cards shown above the Job Sheet Info Bar (same idea as an admin
   summary strip). Counts come from ALL job sheets (via /api/jobsheets/filter), not just the
   one currently open on this page — so opening/editing a single Job Sheet still shows the
   shop-wide totals. Cancelled job sheets are excluded from every count. */
const statCardWrap = {
  borderRadius: 10, padding: "8px 10px", display: "flex",
  flexDirection: "row", alignItems: "center", gap: 8, height: "100%",
};

const StatCard = ({ label, value, icon, bg }) => (
  <div className="col-6 col-md">
    <div className="card shadow-sm" style={statCardWrap}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", background: bg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: "#6B7280", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>{value}</div>
      </div>
    </div>
  </div>
);

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

  /* ================= TOAST NOTIFICATIONS =================
     Replaces every window.alert(...) in this file. Call showToast("message", "success" |
     "error" | "warning" | "info"). Auto-dismisses after 4s; click a toast to dismiss early. */
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  /* ================= TOP STATS (Pending / In Process / Delivered / Revenue) =================
     "In Process" = Device Status "Repaired" (mudinjuchu, innum deliver pannala).
     Total Revenue = sum of service.income across all non-cancelled job sheets.
     Change this mapping below if unga "In Process" vera status-ah irundha (e.g. Received). */
  const [jobStats, setJobStats] = useState({ total: 0, pending: 0, inProcess: 0, delivered: 0, totalRevenue: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchJobStats = () => {
    setStatsLoading(true);
    axios.get(`${API}/api/jobsheets/filter`)
      .then((res) => {
        const all = res.data || [];
        // Total = ella job sheets-um (cancelled-um serthu), AllReportPage-oda "Total Records" madhiri
        const total = all.length;
        let pending = 0, inProcess = 0, delivered = 0, totalRevenue = 0;
        all.forEach((js) => {
          if (js.isCancelled) return; // cancelled jobs status-counts + revenue-la skip
          const status = js.device?.mobileStatus;
          if (status === "Pending") pending++;
          else if (status === "Repaired") inProcess++;
          else if (status === "Delivered" || status === "Delivered NR/NA") delivered++;
          totalRevenue += Number(js.service?.income || 0);
        });
        setJobStats({ total, pending, inProcess, delivered, totalRevenue });
      })
      .catch((err) => console.error("Job stats fetch error:", err))
      .finally(() => setStatsLoading(false));
  };

  useEffect(() => {
    fetchJobStats();
  }, []);

  /* ================= VALIDATION ================= */
  const [touched, setTouched] = useState({});
  const [formErrors, setFormErrors] = useState({});

  /* ================= DEAD PHONE FLAG (NEW) =================
     IMEI is now mandatory — but a dead phone has no readable IMEI. Checking this box
     disables the IMEI input, skips its "required" validation, and saves the device's
     imei value as "DEAD" instead. Loading an existing job sheet re-derives this flag
     from a saved imei of "DEAD". */
  const [isDeadPhone, setIsDeadPhone] = useState(false);

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

      case "district":
        return !value || !value.toString().trim() ? "District is required" : "";

      case "taluk":
        return !value || !value.toString().trim() ? "Taluk is required" : "";

      // ================= IMEI — mandatory unless Dead Phone is checked =================
      case "imei":
        if (isDeadPhone) return "";
        if (!value || !value.toString().trim()) return "IMEI Number is required";
        if (!/^\d{15}$/.test(value)) return "Must be exactly 15 digits";
        return "";

      default:
        return "";
    }
  };

  const handleBlur = (name, value) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setFormErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  /* ================= LIVE CHANGE HANDLER (FIX) =================
     🔴 BUG FIX: Customer Name & Contact No fields were calling handleLiveChange(...) in
     their onChange, but that function was never defined anywhere in the file — so every
     keystroke threw "handleLiveChange is not defined" and React never updated the state,
     which is why typing looked completely dead in those two fields. This defines it:
     it updates the field via the given setter AND — only if the field has already been
     "touched" (blurred once) — re-runs validation live as you type, so an error message
     can clear itself the moment the value becomes valid instead of waiting for blur again. */
  const handleLiveChange = (name, value, setter) => {
    setter(value);
    if (touched[name]) {
      setFormErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const validateAll = () => {
    const errors = {
      customerName: validateField("customerName", customerName),
      contact: validateField("contact", contact),
      email: validateField("email", email),
      district: validateField("district", district),
      taluk: validateField("taluk", taluk),
      imei: validateField("imei", imei),
    };
    setFormErrors(errors);
    setTouched({ customerName: true, contact: true, email: true, district: true, taluk: true, imei: true });

    const errorMessages = Object.values(errors).filter(Boolean);
    if (errorMessages.length > 0) {
      // Modern toast instead of window.alert — shows every field that needs fixing in one card.
      showToast("Please fix before Update/Save:\n" + errorMessages.map(m => `• ${m}`).join("\n"), "error");
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

  /* ================= CUSTOMER =================
     🔴 REMOVED: "address" field (state + UI + payload) removed entirely per request —
     Customer Address is no longer captured anywhere on the Job Sheet. */
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [altContact, setAltContact] = useState("");
  const [email, setEmail] = useState("");
  // District / Taluk — mandatory, MD sir Excel download-la district & taluk wise filter pananum-nu kekkittaru
  const [district, setDistrict] = useState("");
  const [taluk, setTaluk] = useState("");

  /* ================= DISTRICT / TALUK — backend-driven =================
     Master lists live in Mongo (District / Taluk collections), managed from the sidebar's
     "Data Operation" → District/Taluk popup (add/edit/delete) — NOT inline here. Job Sheet
     just fetches and shows whatever's in the DB, exactly like Engineer/Drawer/Sales Rep. */
  const [districtList, setDistrictList] = useState([]);
  const [talukList, setTalukList] = useState([]);

  useEffect(() => {
    axios.get(`${API}/api/districts`)
      .then(res => setDistrictList(res.data))
      .catch(err => console.error("District fetch error:", err));
  }, []);

  useEffect(() => {
    if (!district) { setTalukList([]); return; }
    axios.get(`${API}/api/taluks/${district}`)
      .then(res => setTalukList(res.data))
      .catch(err => { console.error("Taluk fetch error:", err); setTalukList([]); });
  }, [district]);


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

  /* ================= PHYSICAL CONDITION / ACCESSORIES — backend-driven =================
     Master lists live in Mongo (PhysicalCondition / Accessory collections) instead of being
     hardcoded here. Picking "Others (Add New)" and typing a name POSTs it to the backend so
     it appears in the dropdown for every future job sheet, not just this one. */
  const [physicalConditionList, setPhysicalConditionList] = useState([]);
  const [accessoryList, setAccessoryList] = useState([]);
  const [customPhysicalConditionText, setCustomPhysicalConditionText] = useState("");
  const [customAccessoryText, setCustomAccessoryText] = useState("");
  const [addingPhysicalCondition, setAddingPhysicalCondition] = useState(false);
  const [addingAccessory, setAddingAccessory] = useState(false);

  /* ================= MAKE / MODEL / FAULT — Add-New backend-driven too =================
     Same problem as Physical Condition/Accessories used to have: typing a new Make, Model, or
     Visual Issue (Fault) only saved it on THIS job sheet's own fields — nothing was POSTed to
     /api/makes, /api/models, or /api/faults, so the master dropdown list never grew and the
     next job sheet's search couldn't find it. These three "adding" flags + handlers below fix
     that by POSTing exactly like Physical Condition/Accessories already do. */
  const [addingMake, setAddingMake] = useState(false);
  const [addingModel, setAddingModel] = useState(false);
  const [addingFault, setAddingFault] = useState({}); // keyed by visualIssues index

  const fetchPhysicalConditions = () => {
    axios.get(`${API}/api/physical-conditions`)
      .then(res => setPhysicalConditionList(res.data))
      .catch(err => console.error("Physical condition fetch error:", err));
  };
  const fetchAccessories = () => {
    axios.get(`${API}/api/accessories`)
      .then(res => setAccessoryList(res.data))
      .catch(err => console.error("Accessory fetch error:", err));
  };

  useEffect(() => {
    fetchPhysicalConditions();
    fetchAccessories();
  }, []);

  const physicalConditionOptions = [
    ...physicalConditionList.map(x => ({ label: x.name, value: x.name })),
    { label: "Others (Add New)", value: "__custom" },
  ];
  const accessoriesOptions = [
    ...accessoryList.map(x => ({ label: x.name, value: x.name })),
    { label: "Others (Add New)", value: "__custom" },
  ];
const handleAddCustomPhysicalCondition = async () => {
  const val = customPhysicalConditionText.trim();
  if (!val) return;

  // ✅ CASE-INSENSITIVE LOCAL CHECK FIRST — same idea as handleAddCustomMake.
  const existingLocal = physicalConditionList.find(
    (p) => p.name.toString().trim().toLowerCase() === val.toLowerCase()
  );

  if (existingLocal) {
    setPhysicalCondition(prev => {
      const withoutMarker = prev.filter(v => v !== "__custom");
      return withoutMarker.includes(existingLocal.name) ? withoutMarker : [...withoutMarker, existingLocal.name];
    });
    setCustomPhysicalConditionText("");
    showToast(`"${existingLocal.name}" already exists — selected it`, "warning");
    return; // 🔴 stop here — do NOT call the add API
  }

  setAddingPhysicalCondition(true);
  try {
    const res = await axios.post(`${API}/api/physical-conditions`, { name: val });
    setPhysicalConditionList(prev => {
      const exists = prev.some(p => p.name.toLowerCase() === res.data.name.toLowerCase());
      return exists ? prev : [res.data, ...prev];
    });
    setPhysicalCondition(prev => {
      const withoutMarker = prev.filter(v => v !== "__custom");
      return withoutMarker.includes(res.data.name) ? withoutMarker : [...withoutMarker, res.data.name];
    });
    setCustomPhysicalConditionText("");
    if (res.data.alreadyExists) {
      showToast(res.data.message || `"${res.data.name}" already exists — selected it`, "warning");
    } else {
      showToast(`"${res.data.name}" added`, "success");
    }
  } catch (err) {
    console.error(err);
    showToast("Failed to add physical condition", "error");
  } finally {
    setAddingPhysicalCondition(false);
  }
};
 const handleAddCustomAccessory = async () => {
  const val = customAccessoryText.trim();
  if (!val) return;

  // ✅ CASE-INSENSITIVE LOCAL CHECK FIRST — same idea as handleAddCustomMake.
  const existingLocal = accessoryList.find(
    (a) => a.name.toString().trim().toLowerCase() === val.toLowerCase()
  );

  if (existingLocal) {
    setAccessories(prev => {
      const withoutMarker = prev.filter(v => v !== "__custom");
      return withoutMarker.includes(existingLocal.name) ? withoutMarker : [...withoutMarker, existingLocal.name];
    });
    setCustomAccessoryText("");
    showToast(`"${existingLocal.name}" already exists — selected it`, "warning");
    return; // 🔴 stop here — do NOT call the add API
  }

  setAddingAccessory(true);
  try {
    const res = await axios.post(`${API}/api/accessories`, { name: val });
    setAccessoryList(prev => {
      const exists = prev.some(a => a.name.toLowerCase() === res.data.name.toLowerCase());
      return exists ? prev : [res.data, ...prev];
    });
    setAccessories(prev => {
      const withoutMarker = prev.filter(v => v !== "__custom");
      return withoutMarker.includes(res.data.name) ? withoutMarker : [...withoutMarker, res.data.name];
    });
    setCustomAccessoryText("");
    if (res.data.alreadyExists) {
      showToast(res.data.message || `"${res.data.name}" already exists — selected it`, "warning");
    } else {
      showToast(`"${res.data.name}" added`, "success");
    }
  } catch (err) {
    console.error(err);
    showToast("Failed to add accessory", "error");
  } finally {
    setAddingAccessory(false);
  }
};

  /* ================= ADD NEW MAKE =================
     Mirrors handleAddCustomPhysicalCondition — POSTs to /api/makes (makeRoutes.js already
     supports this), pushes the new Make into makeList so the Select dropdown has it right
     away, and switches `make` from "__custom" to the real saved name. */
 const handleAddCustomMake = async () => {
  const val = customMake.trim();
  if (!val) return;

  // ✅ CASE-INSENSITIVE LOCAL CHECK FIRST — no need to hit the API if it's already
  // in the list we already fetched. "GOOGLE" and "google" are treated as the same.
  const existingLocal = makeList.find(
    (m) => (m.name || m).toLowerCase() === val.toLowerCase()
  );

  if (existingLocal) {
    const existingName = existingLocal.name || existingLocal;
    setMake(existingName);
    setCustomMake("");
    showToast(`"${existingName}" already exists — selected it`, "warning");
    return; // 🔴 stop here — do NOT call the add API
  }

  // Not found locally → genuinely new, so add it
  setAddingMake(true);
  try {
    const res = await axios.post(`${API}/api/makes`, { name: val });
    const newMakeObj = res.data.data || res.data;
    setMakeList(prev => {
      const exists = prev.some(m => (m.name || m).toLowerCase() === newMakeObj.name.toLowerCase());
      return exists ? prev : [newMakeObj, ...prev];
    });
    setMake(newMakeObj.name);
    setCustomMake("");

    if (res.data.alreadyExists) {
      showToast(res.data.message || `"${newMakeObj.name}" already exists — selected it`, "warning");
    } else {
      showToast(`"${newMakeObj.name}" added`, "success");
    }
  } catch (err) {
    console.error(err);
    showToast(err.response?.data?.message || "Failed to add make", "error");
  } finally {
    setAddingMake(false);
  }
};

  /* ================= ADD NEW MODEL =================
     Mirrors handleAddCustomMake — POSTs to /api/models with { name, make }, since modelRoutes.js
     requires both fields. Uses whichever Make is currently selected (or the just-typed custom
     Make) so the new Model is correctly linked. */
const handleAddCustomModel = async () => {
  const val = customModel.trim();
  if (!val) return;
  const selectedMake = make === "__custom" ? customMake : make;
  if (!selectedMake) {
    showToast("Select or Add a Make first", "warning");
    return;
  }

  // ✅ CASE-INSENSITIVE LOCAL CHECK FIRST — same idea as handleAddCustomMake.
  // Models are unique per (name + make) pair, so BOTH must match (trimmed, case-insensitive).
  const existingLocal = modelList.find((m) => {
    const mName = (m.name || m).toString().trim().toLowerCase();
    const mMake = (m.make || selectedMake).toString().trim().toLowerCase();
    return mName === val.toLowerCase() && mMake === selectedMake.trim().toLowerCase();
  });

  if (existingLocal) {
    const existingName = existingLocal.name || existingLocal;
    setModel(existingName);
    setCustomModel("");
    showToast(`"${existingName}" already exists under "${selectedMake}" — selected it`, "warning");
    return; // 🔴 stop here — do NOT call the add API
  }

  setAddingModel(true);
  try {
    const res = await axios.post(`${API}/api/models`, { name: val, make: selectedMake });
    const newModelObj = res.data.data || res.data;
    setModelList(prev => {
      const exists = prev.some(m => (m.name || m).toLowerCase() === newModelObj.name.toLowerCase());
      return exists ? prev : [newModelObj, ...prev];
    });
    setModel(newModelObj.name);
    setCustomModel("");
    if (res.data.alreadyExists) {
      showToast(res.data.message || `"${newModelObj.name}" already exists — selected it`, "warning");
    } else {
      showToast(`"${newModelObj.name}" added`, "success");
    }
  } catch (err) {
    console.error(err);
    showToast(err.response?.data?.message || "Failed to add model", "error");
  } finally {
    setAddingModel(false);
  }
};

  /* ================= ADD NEW FAULT / VISUAL ISSUE =================
     Mirrors handleAddCustomAccessory — POSTs to /api/faults so the fault master list
     (faultList) grows, then swaps this row's custom text input back to a normal selected
     value. */
const handleAddCustomFault = async (i) => {
  const val = (customFaults[i] || "").trim();
  if (!val) return;

  // ✅ CASE-INSENSITIVE LOCAL CHECK FIRST — same idea as handleAddCustomMake.
  const existingLocal = faultList.find(
    (f) => f.name.toString().trim().toLowerCase() === val.toLowerCase()
  );

  if (existingLocal) {
    setCustomFaults(prev => {
      const copy = { ...prev };
      delete copy[i];
      return copy;
    });
    updateIssue(i, existingLocal.name);
    showToast(`"${existingLocal.name}" already exists — selected it`, "warning");
    return; // 🔴 stop here — do NOT call the add API
  }

  setAddingFault(prev => ({ ...prev, [i]: true }));
  try {
    const res = await axios.post(`${API}/api/faults`, { name: val });
    // NOTE: faultRoutes.js spreads the fault fields directly (no `.data` wrapper),
    // so the new fault object IS res.data itself.
    const newFault = res.data;
    setFaultList(prev => {
      const exists = prev.some(f => f.name.toLowerCase() === newFault.name.toLowerCase());
      return exists ? prev : [newFault, ...prev];
    });
    setCustomFaults(prev => {
      const copy = { ...prev };
      delete copy[i];
      return copy;
    });
    updateIssue(i, newFault.name);
    if (res.data.alreadyExists) {
      showToast(res.data.message || `"${newFault.name}" already exists — selected it`, "warning");
    } else {
      showToast(`"${newFault.name}" added`, "success");
    }
  } catch (err) {
    console.error(err);
    showToast(err.response?.data?.message || "Failed to add fault", "error");
  } finally {
    setAddingFault(prev => ({ ...prev, [i]: false }));
  }
};
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

  /* ================= SERVICE ================= */
  const today = new Date().toISOString().split("T")[0];
  const [engineer, setEngineer] = useState("");
  const [engineerList, setEngineerList] = useState([]);

  // NOTE: this was previously fetched twice (duplicate useEffect) — merged into one.
  useEffect(() => {
    axios.get(`${API}/api/engineers`)
      .then(res => setEngineerList(res.data))
      .catch(err => console.error("Engineer fetch error:", err));
  }, []);

  const [dealer, setDealer] = useState("");
  const [drawer, setDrawer] = useState("");

  const [drawerList, setDrawerList] = useState([]);
  useEffect(() => {
    axios.get(`${API}/api/drawers`)
      .then(res => setDrawerList(res.data));
  }, []);

  /* ================= LIVE MASTER-LIST REFRESH =================
     Fault/Make/Model/Drawer master lists can also be edited from the sidebar's "Data
     Operation" popups (FaultPopup, AdminMakeModal, AdminModelModal, DrawerPopup). Those popups
     are just an overlay on top of THIS page — no navigation/remount happens — so JobSheetPage's
     own faultList/makeList/modelList/drawerList state never knew to refresh after a popup save.
     Each popup now dispatches a matching custom window event on save/delete; these listeners
     catch that event and refetch, so the Job Sheet dropdowns update live without needing a
     page reload. */
  useEffect(() => {
    const refetchFaults = () => {
      axios.get(`${API}/api/faults`)
        .then(res => setFaultList(res.data))
        .catch(err => console.error("Fault refetch error:", err));
    };
    const refetchMakes = () => {
      axios.get(`${API}/api/makes`)
        .then(res => setMakeList(res.data))
        .catch(err => console.error("Make refetch error:", err));
    };
    const refetchModels = () => {
      const selectedMake = make === "__custom" ? customMake : make;
      if (!selectedMake) return;
      axios.get(`${API}/api/models/${selectedMake}`)
        .then(res => setModelList(res.data))
        .catch(err => console.error("Model refetch error:", err));
    };
    const refetchDrawers = () => {
      axios.get(`${API}/api/drawers`)
        .then(res => setDrawerList(res.data))
        .catch(err => console.error("Drawer refetch error:", err));
    };
    const refetchDistricts = () => {
      axios.get(`${API}/api/districts`)
        .then(res => setDistrictList(res.data))
        .catch(err => console.error("District refetch error:", err));
    };
    const refetchTaluks = () => {
      if (!district) return;
      axios.get(`${API}/api/taluks/${district}`)
        .then(res => setTalukList(res.data))
        .catch(err => console.error("Taluk refetch error:", err));
    };

    window.addEventListener("faultListUpdated", refetchFaults);
    window.addEventListener("makeListUpdated", refetchMakes);
    window.addEventListener("modelListUpdated", refetchModels);
    window.addEventListener("drawerListUpdated", refetchDrawers);
    window.addEventListener("districtListUpdated", refetchDistricts);
    window.addEventListener("talukListUpdated", refetchTaluks);

    return () => {
      window.removeEventListener("faultListUpdated", refetchFaults);
      window.removeEventListener("makeListUpdated", refetchMakes);
      window.removeEventListener("modelListUpdated", refetchModels);
      window.removeEventListener("drawerListUpdated", refetchDrawers);
      window.removeEventListener("districtListUpdated", refetchDistricts);
      window.removeEventListener("talukListUpdated", refetchTaluks);
    };
  }, [make, customMake, district]);

  const [serviceCharge, setServiceCharge] = useState("");
  const [spareCharge, setSpareCharge] = useState("");
  const [spareItems, setSpareItems] = useState([]);

  const [sparePopup, setSparePopup] = useState(false);

  const [paymentMode, setPaymentMode] = useState("");
  const [income, setIncome] = useState("");
  // tracks the date Income was last actually changed & saved.
  // Income Report groups by this date, NOT repairDate, so income shows up
  // in the month it was actually entered (e.g. delivered/collected month).
  const [incomeDate, setIncomeDate] = useState("");

  // true only when the USER manually picked a date in the Income Date field.
  // If false, the date is auto-managed (today's date when Income changes).
  const [incomeDateTouched, setIncomeDateTouched] = useState(false);

  // ================= INCOME + INCOME DATE MERGED FIELD =================
  // Ref to the (visually hidden) native date input that lives inside the Income ₹ box.
  // Clicking the calendar icon opens it via showPicker() so Income amount and Income
  // Date share a single box instead of two separate fields.
  const incomeDateRef = React.useRef(null);

  // Holds the income value as it was when the job sheet was loaded/last saved,
  // used to detect whether the user genuinely changed Income this session.
  const initialIncomeRef = React.useRef(0);
  const [repairDate, setRepairDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceItems, setAdvanceItems] = useState([]);
  const [showAdvancePopup, setShowAdvancePopup] = useState(false);
  const [margin, setMargin] = useState("");

  /* ================= AUTO-CALCULATE SERVICE CHARGE =================
     Service Charge (labour) = Income - Spare Charges - Other Expenses.
     This field is now READ-ONLY and always reflects the remaining amount
     after spare parts & other expenses are deducted from the total income. */
  useEffect(() => {
    const inc = Number(income || 0);
    const sp = Number(spareCharge || 0);
    const oth = Number(othersAmount || 0);
    const remaining = inc - sp - oth;
    setServiceCharge(remaining > 0 ? String(remaining) : "0");
  }, [income, spareCharge, othersAmount]);


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
      showToast("Please enter cancel reason", "warning");
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
      showToast("Job Sheet Cancelled", "success");
      fetchJobStats(); // status maarina odane top stats refresh aagum
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Cancel failed", "error");
    } finally {
      setCancelling(false);
    }
  };

  /* ================= SEND WHATSAPP (NEW) =================
     Manual re-send of the current Device Status message. Hits a dedicated backend
     endpoint (POST /api/jobsheets/:id/send-whatsapp) which looks up the job's current
     customer + status and fires sendJobStatusWhatsApp() itself — so this button always
     sends whatever status is currently SAVED in the DB, not whatever is unsaved in the
     form. If there are unsaved changes, prompt the user to Update first. */
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const handleSendWhatsApp = async () => {
    if (!localEditData?._id) {
      showToast("Please save Job Sheet first", "warning");
      return;
    }
    setSendingWhatsApp(true);
    try {
      const res = await axios.post(`${API}/api/jobsheets/${localEditData._id}/send-whatsapp`);
      showToast(res.data?.message || "WhatsApp message sent", "success");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to send WhatsApp message", "error");
    } finally {
      setSendingWhatsApp(false);
    }
  };

  /* ================= UPDATE ================= */
  const handleUpdate = async () => {
    if (!validateAll()) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (repairDate && deliveryDate && new Date(deliveryDate) < new Date(repairDate)) {
      showToast("Delivery Date cannot be before Repair Date", "warning");
      return;
    }

    // Income date logic (priority order):
    //   1. If user manually picked a date in the Income Date field → use that, always.
    //   2. Else if Income amount actually changed this session → auto-stamp today.
    //   3. Else keep whatever incomeDate already existed (or today if none yet).
    const todayStr = new Date().toISOString().slice(0, 10);
    const incomeNum = Number(income || 0);
    const finalIncomeDate = incomeNum > 0
      ? (incomeDate || todayStr)
      : "";
    try {
      const formData = new FormData();
      formData.append("jobSheetNo", jobSheetNo);
      formData.append("customer", JSON.stringify({ name: customerName, contact, altContact, email, district, taluk }));
      formData.append("device", JSON.stringify({ make: make === "__custom" ? customMake : make, model: model === "__custom" ? customModel : model, imei: isDeadPhone ? "DEAD" : imei, warranty, pattern, mobileStatus }));
      formData.append("physicalCondition", JSON.stringify(physicalCondition.filter(v => v !== "__custom")));
      formData.append("accessories", JSON.stringify(accessories.filter(v => v !== "__custom")));
      formData.append("advanceItems", JSON.stringify(advanceItems));
      formData.append("visualIssues", JSON.stringify(visualIssues.filter(Boolean)));
      formData.append("service", JSON.stringify({
        engineer,
        dealer, drawer, serviceRep,
        serviceCharge: Number(serviceCharge || 0),
        spareCharge: Number(spareCharge || 0),
        income: incomeNum,
        incomeDate: finalIncomeDate,

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

      // sync incomeDate + baseline after a successful update
      setIncomeDate(finalIncomeDate);
      initialIncomeRef.current = incomeNum;

      showToast("Job Sheet Updated", "success");
      fetchJobStats(); // status/income maarina odane top stats refresh aagum

    } catch (err) {
      console.error(err);
      showToast("Update failed", "error");
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
      showToast("Delivery Date cannot be before Repair Date", "warning");
      return;
    }

    setSaving(true);

    const user = JSON.parse(sessionStorage.getItem("user") || "null");

    if (!user || !user.username) {
      showToast("Session expired! Please logout and login again, then try saving.", "error");
      setSaving(false);
      return;
    }

    // New job sheet: if user manually picked a date, use it; otherwise auto = today
    // (only when Income has a value).
    const todayStr = new Date().toISOString().slice(0, 10);
    const incomeNum = Number(income || 0);
    const finalIncomeDate = incomeNum > 0
      ? (incomeDate || todayStr)
      : "";

    try {
      const formData = new FormData();
      formData.append("jobSheetNo", jobSheetNo);
      formData.append("customer", JSON.stringify({ name: customerName, contact, altContact, email, district, taluk }));
      formData.append("device", JSON.stringify({ make: make === "__custom" ? customMake : make, model: model === "__custom" ? customModel : model, imei: isDeadPhone ? "DEAD" : imei, warranty, pattern, mobileStatus }));
      formData.append("physicalCondition", JSON.stringify(physicalCondition.filter(v => v !== "__custom")));
      formData.append("accessories", JSON.stringify(accessories.filter(v => v !== "__custom")));
      formData.append("advanceItems", JSON.stringify(advanceItems));
      formData.append("visualIssues", JSON.stringify(visualIssues.filter(Boolean)));
      formData.append("service", JSON.stringify({
        engineer,
        dealer, drawer, serviceRep,
        instaFollowers,
        googleReview, advanceDate,
        serviceCharge: Number(serviceCharge || 0),
        spareCharge: Number(spareCharge || 0),
        income: incomeNum,
        incomeDate: finalIncomeDate,

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

      showToast("Job Sheet Saved", "success");
      fetchJobStats(); // puthu job sheet — top stats refresh aagum

      const next = await axios.get(`${API}/api/jobsheets/next-number`);
      handleNew(next.data.next);

    } catch (err) {
      console.error(err);
      showToast("Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleNew = (nextNo = null) => {
    setCustomerName("");

    setContact("");
    setAltContact("");
    setEmail("");
    setDistrict("");
    setTaluk("");
    setServiceRep("");
    setMake("");
    setCustomMake("");
    setModel("");
    setCustomModel("");
    setImei("");
    setIsDeadPhone(false);
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
    setCustomPhysicalConditionText("");
    setCustomAccessoryText("");
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
    setIncomeDate("");
    setIncomeDateTouched(false); // reset manual-pick flag on New
    initialIncomeRef.current = 0;
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
    setEmail(editData.customer?.email || "");
    setDistrict(editData.customer?.district || "");
    setTaluk(editData.customer?.taluk || "");
    setServiceRep(editData.service?.serviceRep || "");
    setInstaFollowers(editData.service?.instaFollowers || "");
    setGoogleReview(editData.service?.googleReview || "");
    setMake(editData.device?.make || "");
    setModel(editData.device?.model || "");
    // ================= DEAD PHONE — restore from saved value =================
    // If the stored IMEI is literally "DEAD", the checkbox comes back checked and
    // the visible IMEI input stays blank instead of showing "DEAD" as a value.
    if (editData.device?.imei === "DEAD") {
      setIsDeadPhone(true);
      setImei("");
    } else {
      setIsDeadPhone(false);
      setImei(editData.device?.imei || "");
    }
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
    // load incomeDate + baseline for change-detection
    setIncomeDate(
      editData.service?.incomeDate
        ? new Date(editData.service.incomeDate).toISOString().slice(0, 10)
        : ""
    );
    setIncomeDateTouched(false); // reset — opening an existing sheet is not a "manual pick"
    initialIncomeRef.current = Number(editData.service?.income || 0);
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
      showToast("Search failed", "error");
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

  /* ================= DISTRICT / TALUK OPTIONS =================
     Plain list straight from the DB — same "extra"-entry fallback as Make/Model so a saved
     district/taluk from an older job sheet still shows up selected even if it's since been
     renamed/removed from the master list. No "Other (Add New)" here — District/Taluk are
     only added/edited/deleted from the sidebar's Data Operation popup. */
  const districtNames = districtList.map(d => typeof d === "string" ? d : d.name);
  const extraDistrict =
    district && !districtNames.includes(district)
      ? [{ label: district, value: district }]
      : [];
  const districtOptions = [
    ...districtNames.map(name => ({ label: name, value: name })),
    ...extraDistrict,
  ];

  const talukNames = talukList.map(t => typeof t === "string" ? t : t.name);
  const extraTaluk =
    taluk && !talukNames.includes(taluk)
      ? [{ label: taluk, value: taluk }]
      : [];
  const talukOptions = [
    ...talukNames.map(name => ({ label: name, value: name })),
    ...extraTaluk,
  ];

  return (
    <div
      style={{ minHeight: "100vh", background: "#f6f7f9", display: "flex" }}
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

      {/* ============ GLOBAL DARK TEXT / PLACEHOLDER STYLES + VALIDATION ANIMATIONS ============ */}
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

        /* Modern invalid/valid field styling — soft glow instead of a hard red box,
           plus a tiny shake the moment a field becomes invalid so it draws the eye. */
        .form-control.is-invalid, .form-select.is-invalid {
          border-color: ${RED} !important;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.10) !important;
          animation: fieldShake 0.35s ease;
        }
        .form-control.is-valid, .form-select.is-valid {
          border-color: #16A34A !important;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.10) !important;
        }

        @keyframes fieldShake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-3px); }
          40%, 60% { transform: translateX(3px); }
        }
        @keyframes fieldMsgIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(24px) scale(0.98); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>

      {/* ============ TOAST NOTIFICATIONS (replaces window.alert everywhere) ============ */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ============ LEFT SIDEBAR ============ */}
      <JobSheetSidebar />

      {/* ============ MAIN CONTENT COLUMN ============ */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

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

          {/* ============ TOP STATS BAR — Pending / In Process / Delivered / Total Revenue ============ */}
          <div className="row g-2 mb-2">
            <StatCard
              label="Total"
              value={statsLoading ? "…" : jobStats.total}
              icon={<FileText size={16} color="#fff" />}
              bg="#334155"
            />
            <StatCard
              label="Pending"
              value={statsLoading ? "…" : jobStats.pending}
              icon={<Clock size={16} color="#fff" />}
              bg="#F59E0B"
            />
            <StatCard
              label="In Process"
              value={statsLoading ? "…" : jobStats.inProcess}
              icon={<Cog size={16} color="#fff" />}
              bg="#2563EB"
            />
            <StatCard
              label="Delivered"
              value={statsLoading ? "…" : jobStats.delivered}
              icon={<CheckCircle2 size={16} color="#fff" />}
              bg="#16A34A"
            />
            <StatCard
              label="Total Revenue"
              value={statsLoading ? "…" : `₹${jobStats.totalRevenue.toLocaleString("en-IN")}`}
              icon={<IndianRupee size={16} color="#fff" />}
              bg="#7C3AED"
            />
          </div>

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

      {/* ============ MAIN GRID ============ */}
          <div className="row g-2">

            {/* MAIN COLUMN — Customer / Device / Service */}
            <div className="col-md-9">

            {/* ===== Customer Details + Device Details side by side ===== */}
            <div className="row g-2 mb-2 align-items-start">

              <div className="col-md-6">
                <div className="card shadow-sm" style={{ borderRadius: 10, overflow: "hidden" }}>
                  <div className="card-header d-flex align-items-center gap-2" style={yellowHeader}>
                    <User size={16} /> Customer Details
                  </div>
                  <div className="card-body row g-2" style={{ padding: "8px 12px" }}>

                    <div className="col-md-6">
                      <Field label="Customer Name" required>
                      <CustomerAutocomplete
                        type="name"
                        value={customerName}
                        onChange={(val) => handleLiveChange("customerName", val, setCustomerName)}
                        onSelect={(customer) => {
                          setCustomerName(customer.name || "");
                          setContact(customer.contact || "");
                          setAltContact(customer.altContact || "");
                          setEmail(customer.email || "");
                          setInstaFollowers(customer.instaFollowers === "Already Done" ? "Already Done" : "");
                          setGoogleReview(customer.googleReview === "Already Done" ? "Already Done" : "");
                          setFormErrors(prev => ({ ...prev, customerName: "", contact: "" }));
                        }}
                        placeholder="Name"
                        className={`form-control form-control-sm ${touched.customerName && formErrors.customerName ? "is-invalid" :
                            touched.customerName && !formErrors.customerName ? "is-valid" : ""
                          }`}
                        inputProps={{
                          onBlur: () => handleBlur("customerName", customerName),
                          spellCheck: true
                        }}
                      />
                      </Field>
                      {touched.customerName && formErrors.customerName && (
                        <FieldError>{formErrors.customerName}</FieldError>
                      )}
                    </div>

                    <div className="col-md-6">
                      <Field label="Contact No" required>
                      <CustomerAutocomplete
                        type="contact"
                        value={contact}
                        onChange={(val) => handleLiveChange("contact", val, setContact)}
                        filterNumbers={true}
                        onSelect={(customer) => {
                          setCustomerName(customer.name || "");
                          setContact(customer.contact || "");
                          setAltContact(customer.altContact || "");
                          setEmail(customer.email || "");
                          setInstaFollowers(customer.instaFollowers === "Already Done" ? "Already Done" : "");
                          setGoogleReview(customer.googleReview === "Already Done" ? "Already Done" : "");
                          setFormErrors(prev => ({ ...prev, customerName: "", contact: "" }));
                        }}
                        placeholder="Number"
                        maxLength={10}
                        className={`form-control form-control-sm ${touched.contact && formErrors.contact ? "is-invalid" :
                            touched.contact && !formErrors.contact && contact ? "is-valid" : ""
                          }`}
                        inputProps={{
                          onBlur: () => handleBlur("contact", contact)
                        }}
                      />
                      </Field>
                      {touched.contact && formErrors.contact && (
                        <FieldError>{formErrors.contact}</FieldError>
                      )}
                      {touched.contact && !formErrors.contact && contact && (
                        <FieldSuccess>Valid number</FieldSuccess>
                      )}
                    </div>

                    <div className="col-md-6">
                      <Field label="Alt Contact">
                      <input
                        className="form-control form-control-sm"
                        placeholder="Alternate "
                        value={altContact}
                        maxLength={10}
                        onChange={(e) => setAltContact(onlyNumbers(e.target.value))}
                      />
                      </Field>
                    </div>

                    {/* ================= DISTRICT / TALUK — MANDATORY + SEARCHABLE + BACKEND-DRIVEN =================
                        MD sir kekkittaru: reception-la address vaangumbodhe District &
                        Taluk-um select pannanum, apparam Excel download report-la
                        district/taluk wise filter panna mudiyum. Searchable react-select
                        vechirukken (Make/Model madhiri) — type pannalum list-la jump aagum.
                        Master lists backend-la irukku (District/Taluk collections), aana
                        adding/editing/deleting reception-la illa — sidebar "Data Operation" →
                        District/Taluk popup-la mattum thaan (admin-only). Taluk list District
                        select panna mattum thaan varum. */}
                    <div className="col-md-6">
                      <Field label="District" required>
                        <Select
                          options={districtOptions}
                          value={district ? { label: district, value: district } : null}
                          onChange={(selected) => {
                            const val = selected?.value || "";
                            setDistrict(val);
                            setTaluk(""); // district maarina taluk reset aagum
                            if (touched.district)
                              setFormErrors(prev => ({ ...prev, district: validateField("district", val) }));
                          }}
                          onBlur={() => handleBlur("district", district)}
                          placeholder="Search District..."
                          isClearable
                          filterOption={fuzzyFilterOption}
                          menuPortalTarget={document.body}
                          styles={{
                            ...selectCompactText,
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            control: (base, state) => ({
                              ...selectCompactText.control(base, state),
                              borderColor: touched.district && formErrors.district ? RED : "#CBD5E1",
                              boxShadow: touched.district && formErrors.district ? "0 0 0 3px rgba(220,38,38,0.10)" : base.boxShadow,
                            }),
                          }}
                        />
                      </Field>
                      {touched.district && formErrors.district && (
                        <FieldError>{formErrors.district}</FieldError>
                      )}
                    </div>

                    <div className="col-md-6">
                      <Field label="Taluk" required>
                        <Select
                          options={talukOptions}
                          value={taluk ? { label: taluk, value: taluk } : null}
                          onChange={(selected) => {
                            const val = selected?.value || "";
                            setTaluk(val);
                            if (touched.taluk)
                              setFormErrors(prev => ({ ...prev, taluk: validateField("taluk", val) }));
                          }}
                          onBlur={() => handleBlur("taluk", taluk)}
                          placeholder={district ? "Search Taluk..." : "Select District first"}
                          isClearable
                          isDisabled={!district}
                          filterOption={fuzzyFilterOption}
                          menuPortalTarget={document.body}
                          styles={{
                            ...selectCompactText,
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            control: (base, state) => ({
                              ...selectCompactText.control(base, state),
                              borderColor: touched.taluk && formErrors.taluk ? RED : "#CBD5E1",
                              boxShadow: touched.taluk && formErrors.taluk ? "0 0 0 3px rgba(220,38,38,0.10)" : base.boxShadow,
                            }),
                          }}
                        />
                      </Field>
                      {touched.taluk && formErrors.taluk && (
                        <FieldError>{formErrors.taluk}</FieldError>
                      )}
                    </div>

                    <div className="col-md-6">
                      <Field label="Email ID">
                      <input
                        type="email"
                        className={`form-control form-control-sm ${touched.email && formErrors.email ? "is-invalid" :
                            touched.email && !formErrors.email && email ? "is-valid" : ""
                          }`}
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => {
                          const val = e.target.value.trim().toLowerCase();
                          setEmail(val);
                          if (touched.email)
                            setFormErrors(prev => ({ ...prev, email: validateField("email", val) }));
                        }}
                        onBlur={(e) => handleBlur("email", e.target.value.trim())}
                      />
                      </Field>
                      {touched.email && formErrors.email && (
                        <FieldError>{formErrors.email}</FieldError>
                      )}
                      {touched.email && !formErrors.email && email && (
                        <FieldSuccess>Valid email</FieldSuccess>
                      )}
                    </div>

                    <div className="col-md-6">
                      <Field label="ID Proof Type">
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
                      </Field>
                    </div>

                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card shadow-sm" style={{ borderRadius: 10, overflow: "hidden" }}>
                  <div className="card-header d-flex align-items-center gap-2" style={yellowHeader}>
                    <Smartphone size={16} /> Device Details
                  </div>
                  <div className="card-body row g-2" style={{ padding: "8px 12px" }}>

                    <div className="col-md-6">
                      <Field label="Make">
                      <Select
                        options={makeOptions}
                        value={makeOptions.find(opt => opt.value === make) || null}
                        onChange={(selected) => {
                          setMake(selected?.value || "");
                          setCustomMake("");
                          setModel("");
                          setCustomModel("");
                        }}
                        placeholder="Search "
                        isClearable
                        filterOption={fuzzyFilterOption}
                        styles={{
                          ...selectCompactText,
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
                        menuPortalTarget={document.body}
                      />
                      </Field>
                      {make === "__custom" && (
                        <div className="d-flex gap-1 mt-2">
                          <input
                            className="form-control form-control-sm"
                            placeholder="Enter Make"
                            value={customMake}
                            onChange={(e) => setCustomMake(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomMake(); } }}
                            spellCheck="true"
                          />
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ background: RED, color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}
                            disabled={addingMake || !customMake.trim()}
                            onClick={handleAddCustomMake}
                          >
                            {addingMake ? "..." : "Add"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <Field label="Model">
                      <Select
                        options={modelOptions}
                        value={modelOptions.find(opt => opt.value === model) || null}
                        onChange={(selected) => {
                          setModel(selected?.value || "");
                          setCustomModel("");
                        }}
                        placeholder="Search"
                        isClearable
                        filterOption={fuzzyFilterOption}
                        styles={{
                          ...selectCompactText,
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
                        menuPortalTarget={document.body}
                      />
                      </Field>
                      {model === "__custom" && (
                        <div className="d-flex gap-1 mt-2">
                          <input
                            className="form-control form-control-sm"
                            placeholder="Enter Model"
                            value={customModel}
                            onChange={(e) => setCustomModel(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomModel(); } }}
                            spellCheck="true"
                          />
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ background: RED, color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}
                            disabled={addingModel || !customModel.trim()}
                            onClick={handleAddCustomModel}
                          >
                            {addingModel ? "..." : "Add"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ================= IMEI — NOW MANDATORY + "DEAD PHONE" ESCAPE HATCH (NEW) =================
                        IMEI is required by default. If the phone is completely dead and IMEI
                        can't be read, the "Dead Phone" checkbox below disables the input,
                        clears any typed value, and skips the mandatory check — device.imei is
                        saved as "DEAD" so reports can still tell these apart from a normal entry. */}
                    <div className="col-md-6">
                      <Field label="IMEI Number" required={!isDeadPhone}>
                      <input
                        className={`form-control form-control-sm ${touched.imei && formErrors.imei ? "is-invalid" :
                            touched.imei && !formErrors.imei && imei ? "is-valid" : ""
                          }`}
                        placeholder="15-digit IMEI"
                        value={imei}
                        maxLength={15}
                        disabled={isDeadPhone}
                        onChange={(e) => {
                          const val = onlyNumbers(e.target.value);
                          setImei(val);
                          if (touched.imei)
                            setFormErrors(prev => ({ ...prev, imei: validateField("imei", val) }));
                        }}
                        onBlur={() => handleBlur("imei", imei)}
                      />
                      </Field>
                      {touched.imei && formErrors.imei && (
                        <FieldError>{formErrors.imei}</FieldError>
                      )}
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="checkbox"
                          id="deadPhoneCheck"
                          checked={isDeadPhone}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIsDeadPhone(checked);
                            if (checked) {
                              setImei("");
                              setFormErrors(prev => ({ ...prev, imei: "" }));
                            }
                          }}
                        />
                        <label htmlFor="deadPhoneCheck" style={{ fontSize: 12, color: "#6B7280", cursor: "pointer", margin: 0 }}>
                          Dead Phone (No IMEI available)
                        </label>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <Field label="Device Status">
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
                      </Field>
                    </div>
                    <div className="col-md-6">
                      <Field label="Warranty">
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
                      </Field>
                    </div>
                    <div className="col-md-6">
                      <Field label="Pattern / PIN">
                      <input
                        className="form-control form-control-sm"
                        placeholder="Pattern"
                        value={pattern}
                        onChange={(e) => setPattern(e.target.value)}
                      />
                      </Field>
                    </div>

                    <div className="col-md-6">
                      <Field label="ID Proof Image">
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
                      </Field>
                    </div>

                  </div>
                </div>
              </div>

            </div>
            {/* ===== END: Customer Details + Device Details side by side ===== */}

              <div className="row g-2 align-items-start">

                <div className="col-md-6">
                  <div className="card shadow-sm" style={{ borderRadius: 10, overflow: "hidden" }}>
                    <div className="card-header d-flex align-items-center gap-2" style={yellowHeader}>
                      <Wrench size={16} /> Assignment &amp; Schedule
                    </div>
                    <div className="card-body row g-2" style={{ padding: "8px 12px" }}>

                      <div className="col-md-6">
                        <Field label="Engineer">
                          <select
                            className="form-select form-select-sm"
                            value={engineer}
                            onChange={e => setEngineer(e.target.value)}
                          >
                            <option value="">Select Engineer</option>
                            {engineerList.map((eng, i) => {
                              const name = eng.name || eng;
                              return (
                                <option key={i} value={name}>
                                  🔧 {name}
                                </option>
                              );
                            })}
                          </select>
                        </Field>
                      </div>

                      <div className="col-md-6">
                        <Field label="Dealer Name">
                          <input
                            placeholder="Dealer "
                            className="form-control form-control-sm"
                            value={dealer}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^a-zA-Z\u0B80-\u0BFF\s.]/g, "");
                              setDealer(val);
                            }}
                            spellCheck="true"
                          />
                        </Field>
                      </div>

                      <div className="col-md-6">
                        <Field label="Drawer">
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
                        </Field>
                      </div>

                      <div className="col-md-6">
                        <Field label="Service Rep">
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
                        </Field>
                      </div>

                      <div className="col-md-6">
                        <Field label="Repair Date">
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={repairDate}
                            onChange={(e) => setRepairDate(e.target.value)}
                          />
                        </Field>
                      </div>

                      <div className="col-md-6">
                        <Field label="Delivery Date">
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                          />
                        </Field>
                      </div>

                      <div className="col-md-6">
                        <Field label="Insta Follow">
                          <select
                            className="form-select form-select-sm"
                            value={instaFollowers}
                            onChange={(e) => setInstaFollowers(e.target.value)}
                          >
                            <option value="">Insta </option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                            <option value="Already Done">Already Done</option>
                          </select>
                        </Field>
                      </div>

                      <div className="col-md-6">
                        <Field label="Google Review">
                          <select
                            className="form-select form-select-sm"
                            value={googleReview}
                            onChange={(e) => setGoogleReview(e.target.value)}
                          >
                            <option value="">Google </option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                            <option value="Already Done">Already Done</option>
                          </select>
                        </Field>
                      </div>

                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card shadow-sm" style={{ borderRadius: 10, overflow: "hidden" }}>
                    <div className="card-header d-flex align-items-center gap-2" style={yellowHeader}>
                      <Wallet size={16} /> Billing &amp; Charges
                    </div>
                    <div className="card-body row g-2" style={{ padding: "8px 12px" }}>

                      {/* ================= INCOME ₹ + INCOME DATE — merged into one box =================
                          Was two separate fields (Income ₹ / Income Date). Now a single
                          form-control-styled box: the amount input sits on the left and a
                          calendar icon sits in the right corner. Clicking the icon opens the
                          native date picker (showPicker()) so the date is picked without a
                          second box taking up a whole grid column. */}
                      <div className="col-md-6">
                        <Field label="Income ₹">
                          <div
                            className="form-control form-control-sm d-flex align-items-center"
                            style={{ padding: "0 6px", gap: 6, position: "relative" }}
                          >
                            <input
                              type="text"
                              placeholder="0"
                              value={income}
                              onChange={(e) => setIncome(onlyNumbers(e.target.value))}
                              style={{
                                border: "none", outline: "none", flex: 1, minWidth: 0,
                                background: "transparent", padding: "4px 2px",
                                color: "#111827", fontWeight: 500,
                              }}
                            />
                            <Calendar
                              size={15}
                              style={{ color: incomeDate ? "#0d6efd" : "#6B7280", cursor: "pointer", flexShrink: 0 }}
                              onClick={() => {
                                const el = incomeDateRef.current;
                                if (el?.showPicker) el.showPicker();
                                else el?.focus();
                              }}
                            />
                            <input
                              ref={incomeDateRef}
                              type="date"
                              value={incomeDate}
                              onChange={(e) => {
                                setIncomeDate(e.target.value);
                                setIncomeDateTouched(true); // user manually chose → this wins
                              }}
                              style={{
                                position: "absolute", top: 0, right: 0,
                                width: 1, height: 1, opacity: 0,
                                border: "none", padding: 0, pointerEvents: "none",
                              }}
                            />
                          </div>
                        </Field>
                        {incomeDate && (
                          <div style={{ fontSize: 10, color: "#0d6efd", marginTop: 2, fontWeight: 500 }}>
                            📅 {incomeDateTouched ? "Manually selected" : "Auto-recorded"}: {incomeDate}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <Field label="Service Charges ">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="0"
                            value={serviceCharge}
                            readOnly
                            style={{ background: "#f8f9fa", cursor: "not-allowed" }}
                          />
                        </Field>
                      </div>

                      <div className="col-md-6">
                        <Field label="Spare Charges ">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Tap to add "
                            value={spareCharge}
                            readOnly
                            onClick={() => setSparePopup(true)}
                            style={{ cursor: "pointer", background: "#f8f9fa" }}
                          />
                        </Field>
                      </div>

                      <div className="col-md-6">
                        <Field label="Other Expenses">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Tap to add"
                            value={othersAmount}
                            readOnly
                            onClick={() => setShowOthersPopup(true)}
                            style={{ cursor: "pointer", background: "#f8f9fa" }}
                          />
                        </Field>
                        {othersItems.length > 0 && (
                          <div style={{ fontSize: 10, color: "#6c757d", marginTop: 2, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                            <Package size={11} /> {othersItems.length} expense{othersItems.length > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <Field label="Advance Amount ">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Tap to add"
                            value={advanceAmount}
                            readOnly
                            onClick={() => setShowAdvancePopup(true)}
                            style={{ cursor: "pointer", background: "#f8f9fa" }}
                          />
                        </Field>
                        {advanceItems.length > 0 && (
                          <div style={{ fontSize: 10, color: "#0d6efd", marginTop: 2, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                            <Wallet size={11} /> {advanceItems.length} payment{advanceItems.length > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <Field label="Payment Mode">
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
                        </Field>
                      </div>

                      <div className="col-md-12">
                        <Field label="Remarks">
                          <textarea
                            className="form-control form-control-sm"
                            placeholder="Any additional notes"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            style={{ height: "31px", resize: "none" }}
                            spellCheck="true"
                          />
                        </Field>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* SIDE COLUMN — Visual Inspection → Physical Condition → Accessories */}
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
                        filterOption={fuzzyFilterOption}
                        menuPortalTarget={document.body}
                        styles={{
                          ...selectDarkText,
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
                      />
                     
                      {customFaults[i] !== undefined && (
                        <div className="d-flex gap-1 mt-2">
                          <input
                            className="form-control form-control-sm"
                            placeholder="Enter Fault"
                            value={customFaults[i]}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomFaults(prev => ({ ...prev, [i]: val }));
                              updateIssue(i, val);
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomFault(i); } }}
                            spellCheck="true"
                          />
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ background: RED, color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}
                            disabled={addingFault[i] || !(customFaults[i] || "").trim()}
                            onClick={() => handleAddCustomFault(i)}
                          >
                            {addingFault[i] ? "..." : "Add"}
                          </button>
                        </div>
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

                  {/* ================= ADD MORE ISSUE (FIX) =================
                      🔴 BUG FIX: addIssue() function already existed (pushes a new blank
                      row into visualIssues), aana adha call panna oru button EHDUME
                      UI-la illa — adhunala oru phone-ku multiple faults add panna
                      mudiyaama, one issue mattum thaan select panna mudinjuchu. Idhu andha
                      button. */}
                  <button
                    type="button"
                    className="btn btn-sm w-100 mt-1"
                    style={{ background: RED_SOFT_BG, color: RED_TEXT, fontWeight: 600, border: `1px dashed ${RED_BORDER}` }}
                    onClick={addIssue}
                  >
                    <Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} /> Add More Issue
                  </button>

                </div>
              </div>

              {/* PHYSICAL CONDITION — multi-select, backend-driven */}
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
                    placeholder="Select Physical"
                    isClearable
                    filterOption={fuzzyFilterOption}
                    menuPortalTarget={document.body}
                    styles={{
                      ...selectDarkText,
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                  />
                  
                  {physicalCondition.includes("__custom") && (
                    <div className="d-flex gap-1 mt-2">
                      <input
                        className="form-control form-control-sm"
                        placeholder="Type new condition"
                        value={customPhysicalConditionText}
                        onChange={(e) => setCustomPhysicalConditionText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomPhysicalCondition(); } }}
                        spellCheck="true"
                      />
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ background: RED, color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}
                        disabled={addingPhysicalCondition || !customPhysicalConditionText.trim()}
                        onClick={handleAddCustomPhysicalCondition}
                      >
                        {addingPhysicalCondition ? "..." : "Add"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ACCESSORIES — multi-select, backend-driven */}
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
                    filterOption={fuzzyFilterOption}
                    menuPortalTarget={document.body}
                    styles={{
                      ...selectDarkText,
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                  />
               
                  {accessories.includes("__custom") && (
                    <div className="d-flex gap-1 mt-2">
                      <input
                        className="form-control form-control-sm"
                        placeholder="Type new accessory"
                        value={customAccessoryText}
                        onChange={(e) => setCustomAccessoryText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomAccessory(); } }}
                        spellCheck="true"
                      />
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ background: RED, color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}
                        disabled={addingAccessory || !customAccessoryText.trim()}
                        onClick={handleAddCustomAccessory}
                      >
                        {addingAccessory ? "..." : "Add"}
                      </button>
                    </div>
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
                      spellCheck="true"
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
              if (!editData?._id) { showToast("Please save Job Sheet first", "warning"); return; }
              window.open(`${window.location.origin}/estimate-bill/${editData._id}`, "_blank");
            }}
          >
            <Calculator size={16} /> Estimate
          </button>

          <button
            style={{ ...sideBtnInvoice, width: "auto" }}
            onClick={async () => {
              if (!localEditData?._id) { showToast("Please save Job Sheet first", "warning"); return; }
              try {
                window.open(`${window.location.origin}/invoice/${localEditData._id}`, "_blank");
                await axios.put(`${API}/api/jobsheets/${localEditData._id}/invoice`);
                setLocalEditData(prev => ({ ...prev, isInvoiced: true }));
                showToast("Invoice Generated Successfully", "success");
                setTimeout(() => { window.location.reload(); }, 1000);
              } catch (err) {
                console.error(err);
                showToast("Invoice failed", "error");
              }
            }}
          >
            <Receipt size={16} /> Invoice
          </button>

          {/* ================= SEND WHATSAPP BUTTON (NEW) =================
              Only shown once the job sheet is saved (needs an _id). Sends whatever
              Device Status is currently saved in the DB to the customer's WhatsApp. */}
          {/* {isEdit && localEditData?._id && (
            <button
              style={{ ...sideBtnWhatsApp, width: "auto" }}
              onClick={handleSendWhatsApp}
              disabled={sendingWhatsApp}
            >
              <MessageCircle size={16} /> {sendingWhatsApp ? "Sending..." : "Send WhatsApp"}
            </button>
          )} */}

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
                  showToast(`Rebill #${rebillCount} opened! Add new charges and generate invoice.`, "success");
                  fetchJobStats(); // rebill panna status "Received" aagum — stats refresh
                } catch (err) {
                  console.error(err);
                  showToast("Rebill failed", "error");
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

      </div>
    
  );
};

export default JobSheetPage;