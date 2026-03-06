import React, { useState, useEffect } from "react";
import {
  BarChart2,
  Clock,
  CheckCircle,
  ChevronDown,
  Activity,
  ShieldCheck,
  TrendingUp,
  Zap,
  Menu
  // LayoutGrid
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminMakeModal from "./popups/AdminMakeModal";
import AdminModelModal from "./popups/AdminModelModal";
import FaultPopup from "./popups/FaultPopup";
import DrawerPopup from "./popups/DrawerPopup";
import EngineerPopup from "./popups/EngineerPopup";
import UserAddition from "./popups/UserAddition";
import UserListPopup from "./popups/UserListPopup";

/* =========================
   Counter Animation
========================= */
const Counter = ({ target }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const increment = target / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <span className="text-4xl font-extrabold tracking-tight">
      {count.toLocaleString()}
    </span>
  );
};

/* =========================
   Typewriter Effect
========================= */
const Typewriter = ({ text }) => {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    let index = 0;

    const interval = setInterval(() => {
      setDisplayText(text.slice(0, index));
      index++;
      if (index > text.length) clearInterval(interval);
    }, 15);

    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayText}</span>;
};

/* =========================
   Navbar Dropdown
========================= */
const NavItem = ({ title, items, onItemClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  


  const handleClick = (item) => {
    if (item === "Job Sheet") {
      navigate("/jobsheet");
    }

    if (onItemClick) {
      onItemClick(item);
    }
  };


  return (
    <div
      className="relative px-4 py-2 cursor-pointer"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="flex items-center gap-1.5 text-slate-300 hover:text-indigo-400 transition-colors font-medium text-sm">
        {title}
        <ChevronDown
          size={14}
          className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50">
          {items.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleClick(item)}
              className="px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* =========================
   Main App
========================= */
const Home = () => {
  const navigate = useNavigate();

  const API = import.meta.env.VITE_API_URL;

   const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  const [stats, setStats] = useState({
  totalJobs: 0,
  pendingJobs: 0,
  completedJobs: 0
});
  
  const [aiInsight, setAiInsight] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(true);
  const [showMakeModal, setShowMakeModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showFaultModal, setShowFaultModal] = useState(false);
  const [showDrawerModal, setShowDrawerModal] = useState(false);
  const [showEngineerModal, setShowEngineerModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const handleLogout = () => {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/");
  };

  // useEffect(() => {

  //   const fakeAIResponse =
  //     "Operational efficiency remains high with an 87% resolution rate. All billing channels are stable and performing within optimal thresholds.";

  //   setTimeout(() => {
  //     setAiInsight(fakeAIResponse);
  //     setIsAiLoading(false);
  //   }, 1200);
  // }, []);

  useEffect(() => {

  fetch(`${API}/api/dashboard/stats`)
    .then(res => res.json())
    .then(data => {
      setStats(data);
    })
    .catch(err => console.log(err));

}, []);
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">

      {/* ================= NAVBAR ================= */}
       <nav className="sticky top-0 z-50 h-16 flex items-center justify-between px-4 backdrop-blur-xl bg-slate-900/70 border-b border-white/5">

  {/* Left Logo / User */}
  <div className="flex items-center gap-3">
    <span className="text-slate-300">👤 {user?.username}</span>
  </div>

  {/* Desktop Menu */}
  <div className="hidden md:flex items-center">

    <div
      onClick={() => navigate("/jobsheet")}
      className="px-4 py-2 cursor-pointer text-slate-300 hover:text-indigo-400 text-sm"
    >
      Job Sheet
    </div>

    {role === "admin" && (
      <NavItem
        title="Admin Operation"
        items={["Engineer Addition", "User List", "User Addition", "User Report"]}
        onItemClick={(item) => {
          if (item === "Engineer Addition") setShowEngineerModal(true);
          if (item === "User List") setShowUserList(true);
          if (item === "User Addition") setShowUserModal(true);
          if (item === "User Report") navigate("/user-report");
        }}
      />
    )}

    <NavItem
      title="Data Operation"
      items={["Fault", "Make", "Model", "Drawer"]}
      onItemClick={(item) => {
        if (item === "Fault") setShowFaultModal(true);
        if (item === "Make") setShowMakeModal(true);
        if (item === "Model") setShowModelModal(true);
        if (item === "Drawer") setShowDrawerModal(true);
      }}
    />

    <div
      onClick={() => navigate("/report")}
      className="px-4 py-2 cursor-pointer text-slate-300 hover:text-indigo-400 text-sm"
    >
      Report
    </div>

    <div
      onClick={handleLogout}
      className="px-4 py-2 cursor-pointer text-red-400 hover:text-red-500 text-sm"
    >
      Logout
    </div>

  </div>

  {/* Mobile Hamburger */}
  <div
    className="md:hidden cursor-pointer"
    onClick={() => setMobileMenu(!mobileMenu)}
  >
    <Menu size={24} />
  </div>

</nav>


{mobileMenu && (
  <div className="md:hidden bg-slate-900 border-b border-white/10 flex flex-col">

    {/* Job Sheet */}
    <div
      onClick={() => {
        navigate("/jobsheet");
        setMobileMenu(false);
      }}
      className="px-4 py-3 text-slate-300 border-b border-white/5"
    >
      Job Sheet
    </div>

    {/* Data Operation */}
    <div className="px-4 py-3 text-slate-300 border-b border-white/5 font-semibold">
      Data Operation
    </div>

    <div
      onClick={() => {
        setShowFaultModal(true);
        setMobileMenu(false);
      }}
      className="px-6 py-2 text-slate-400"
    >
      Fault
    </div>

    <div
      onClick={() => {
        setShowMakeModal(true);
        setMobileMenu(false);
      }}
      className="px-6 py-2 text-slate-400"
    >
      Make
    </div>

    <div
      onClick={() => {
        setShowModelModal(true);
        setMobileMenu(false);
      }}
      className="px-6 py-2 text-slate-400"
    >
      Model
    </div>

    <div
      onClick={() => {
        setShowDrawerModal(true);
        setMobileMenu(false);
      }}
      className="px-6 py-2 text-slate-400 border-b border-white/5"
    >
      Drawer
    </div>

    {/* Report */}
    <div
      onClick={() => {
        navigate("/report");
        setMobileMenu(false);
      }}
      className="px-4 py-3 text-slate-300 border-b border-white/5"
    >
      Report
    </div>

    {/* Logout */}
    <div
      onClick={() => {
        handleLogout();
        setMobileMenu(false);
      }}
      className="px-4 py-3 text-red-400"
    >
      Logout
    </div>

  </div>
)}
    
      {/* ================= MAIN ================= */}
<main className="flex-1 container mx-auto px-6 py-8 flex flex-col items-center">

  {/* Hero Section */}
  <div className="text-center max-w-4xl mb-8">
    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
      <Zap size={14} />
      Enterprise Performance Monitor
    </span>

    <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight leading-tight">
      Radnus <span className="text-indigo-500">24/7</span><br />
      <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
        Service Billing Software
      </span>
    </h1>

    <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
      Manage service jobs, engineer assignments, billing records,
      and service performance analytics in real-time.
    </p>
  </div>

  {/* ================= METRICS ================= */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mb-10">

    {[
      {
        icon: <BarChart2 size={28} />,
        label: "Total Service Jobs",
        value: stats.totalJobs
      },
      {
        icon: <Clock size={28} />,
        label: "Pending Service",
        value: stats.pendingJobs
      },
      {
        icon: <CheckCircle size={28} />,
        label: "Completed Service",
        value: stats.completedJobs
      }
    ].map((metric, idx) => (
      <div
        key={idx}
        className="p-8 rounded-3xl bg-slate-900/60 border border-white/5 backdrop-blur-xl shadow-xl"
      >
        <div className="mb-6 text-indigo-400">{metric.icon}</div>

        <p className="text-slate-400 text-sm uppercase tracking-wider mb-2">
          {metric.label}
        </p>

        <Counter target={metric.value} />
      </div>
    ))}

  </div>

</main>

      {showMakeModal && (
        <AdminMakeModal onClose={() => setShowMakeModal(false)} />
      )}

      {showModelModal && (
        <AdminModelModal onClose={() => setShowModelModal(false)} />
      )}


      {showFaultModal && (
        <FaultPopup onClose={() => setShowFaultModal(false)} />
      )}

      {showDrawerModal && (
        <DrawerPopup onClose={() => setShowDrawerModal(false)} />
      )}

      {showEngineerModal && (
        <EngineerPopup onClose={() => setShowEngineerModal(false)} />
      )}

      {showUserModal && (
        <UserAddition onClose={() => setShowUserModal(false)} />
      )}

      {showUserList && (
        <UserListPopup
          onClose={() => setShowUserList(false)}
        />
      )}
      {/* ================= FOOTER ================= */}
      <footer className="py-8 border-t border-white/5 text-center text-xs text-slate-500 uppercase tracking-widest">
        © 2026 Radnus Communication • Service Billing Platform
      </footer>
    </div>

  );
};

export default Home;