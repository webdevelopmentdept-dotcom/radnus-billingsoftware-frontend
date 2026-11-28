import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, LayoutList, Users, Database, FileBarChart, LogOut, Menu, X, Sparkles, PhoneCall, Inbox, BarChart3
} from "lucide-react";
import useCaseBadge from "../hooks/useCaseBadge";
import AdminMakeModal from "./popups/AdminMakeModal";
import AdminModelModal from "./popups/AdminModelModal";
import FaultPopup from "./popups/FaultPopup";
import DrawerPopup from "./popups/DrawerPopup";
import EngineerPopup from "./popups/EngineerPopup";
import UserAddition from "./popups/UserAddition";
import UserListPopup from "./popups/UserListPopup";
import DistrictTalukPopup from "./popups/Districttalukpopup"
import StoreBadge from "./StoreBadge";

const COLLAPSED_W = 64;
const EXPANDED_W = 210;

const navBtn = {
  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
  borderRadius: 8, color: "#cbd5e1", fontSize: 13.5, fontWeight: 600,
  cursor: "pointer", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden",
};

const navBtnHover = {
  background: "rgba(255,255,255,0.06)",
};

const subBtn = {
  padding: "8px 10px", fontSize: 12.5, color: "#94a3b8", cursor: "pointer",
  borderRadius: 6, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden",
};

const JobSheetSidebar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const role = user?.role;
  const canAdminOps = role === "admin" || role === "storeManager";

  const fbAccess = user?.feedbackAccess || "none";
  const feedbackOnly = role === "user" && fbAccess === "only";
  const canFeedback = role === "admin" || (role === "user" && fbAccess !== "none");
  const canCases = role === "admin" || (role === "user" && (!!user?.linkedRep || fbAccess !== "none"));
  const caseCount = useCaseBadge();

  // Sidebar starts CLOSED (icons only). Hovering over it opens it automatically;
  // moving the mouse away closes it again — no click needed (see hover handlers below).
  const [isOpen, setIsOpen] = useState(false);

  // ✅ small close-delay so quick mouse movement (e.g. hovering the sidebar then
  // immediately clicking a nav item that navigates away) doesn't cause a jarring
  // instant-collapse flicker — the sidebar eases shut a beat after the mouse leaves.
  const closeTimer = useRef(null);
  const openSidebar = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setIsOpen(true);
  };
  const closeSidebarDelayed = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setIsOpen(false);
      closeTimer.current = null;
    }, 150);
  };

  const [adminOpen, setAdminOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [showMakeModal, setShowMakeModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showFaultModal, setShowFaultModal] = useState(false);
  const [showDrawerModal, setShowDrawerModal] = useState(false);
  const [showEngineerModal, setShowEngineerModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [showDistrictTalukModal, setShowDistrictTalukModal] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/");
  };

  const [hovered, setHovered] = useState("");

  // Group submenus (Admin Operation / Data Operation) reveal on hover once the
  // sidebar itself is open — clicking still works as a fallback on touch devices.
  const handleGroupClick = (setter, open = isOpen) => {
    if (!open) {
      openSidebar();
      setter(true);
    } else {
      setter(prev => !prev);
    }
  };

  const handleGroupHover = (setter, isEntering, open = isOpen) => {
    if (open) setter(isEntering);
  };

  // mobile=true -> always fully expanded (labels visible), used inside the mobile drawer
  const renderSidebar = (mobile = false) => {
    const open = mobile || isOpen;
    const itemStyle = (key, extra = {}) => ({
      ...navBtn,
      ...(hovered === key ? navBtnHover : {}),
      justifyContent: open ? "flex-start" : "center",
      ...extra,
    });

    // Label span that fades/collapses away when the sidebar is closed
    const Label = ({ children }) => (
      <span
        style={{
          opacity: open ? 1 : 0,
          maxWidth: open ? 160 : 0,
          transition: "opacity 0.3s ease, max-width 0.38s cubic-bezier(0.22, 1, 0.36, 1)",
          overflow: "hidden",
          display: "inline-block",
        }}
      >
        {children}
      </span>
    );

    return (
      <>
        <div
          style={{
            padding: open ? "14px 16px" : "14px 0",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* 3-line icon — hovering this (or anywhere in the sidebar) opens it */}
          {!mobile && <div
            style={{
              display: "flex",
              justifyContent: open ? "flex-end" : "center",
            }}
          >
            <button
              onClick={() => (isOpen ? setIsOpen(false) : openSidebar())}
              aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                color: "#fff",
                width: 34,
                height: 34,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                transition: "transform 0.25s ease, background 0.2s ease",
              }}
            >
              <Menu
                size={18}
                style={{
                  transition: "transform 0.3s ease",
                  transform: open ? "rotate(90deg)" : "rotate(0deg)",
                }}
              />
            </button>
          </div>}

          <div style={{
            display: "flex", alignItems: "center", gap: 8, color: "#fff", fontWeight: 700,
            justifyContent: open ? "flex-start" : "center",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: "#DC2626",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0
            }}>
              {(user?.username || "A")[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
              <Label>{user?.username || "Admin"}</Label>
              <StoreBadge open={open} />
            </div>
          </div>
        </div>

        <div style={{ padding: "10px 8px", flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {role === "admin" && (
            <div
              title="Analytics"
              onClick={() => { navigate("/analytics"); setMobileOpen(false); }}
              onMouseEnter={() => setHovered("analytics")}
              onMouseLeave={() => setHovered("")}
              style={itemStyle("analytics")}
            >
              <BarChart3 size={18} style={{ flexShrink: 0 }} />
              <Label>Analytics</Label>
            </div>
          )}

          {!feedbackOnly && (
            <div
              title="Job Sheet"
              onClick={() => { navigate("/jobsheet"); setMobileOpen(false); }}
              onMouseEnter={() => setHovered("job")}
              onMouseLeave={() => setHovered("")}
              style={itemStyle("job")}
            >
              <LayoutList size={18} style={{ flexShrink: 0 }} />
              <Label>Job Sheet</Label>
            </div>
          )}

          {canFeedback && (
            <div
              title={role === "admin" ? "Feedback Report" : "Feedback"}
              onClick={() => { navigate(role === "admin" ? "/feedback-report" : "/feedback"); setMobileOpen(false); }}
              onMouseEnter={() => setHovered("feedback")}
              onMouseLeave={() => setHovered("")}
              style={itemStyle("feedback")}
            >
              <PhoneCall size={18} style={{ flexShrink: 0 }} />
              <Label>{role === "admin" ? "Feedback Report" : "Feedback"}</Label>
            </div>
          )}

          {canCases && (
            <div
              title="Cases"
              onClick={() => { navigate("/cases"); setMobileOpen(false); }}
              onMouseEnter={() => setHovered("cases")}
              onMouseLeave={() => setHovered("")}
              style={itemStyle("cases")}
            >
              <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
                <Inbox size={18} />
                {caseCount > 0 && (
                  <span style={{
                    position: "absolute", top: -7, right: -9, background: "#EF4444", color: "#fff",
                    borderRadius: 10, fontSize: 9, fontWeight: 800, padding: "1px 5px",
                  }}>{caseCount}</span>
                )}
              </span>
              <Label>Cases</Label>
            </div>
          )}

          {canAdminOps && (
            <div
              onMouseEnter={() => handleGroupHover(setAdminOpen, true, open)}
              onMouseLeave={() => handleGroupHover(setAdminOpen, false, open)}
            >
              <div
                title="Admin Operation"
                onClick={() => handleGroupClick(setAdminOpen, open)}
                onMouseEnter={() => setHovered("admin")}
                onMouseLeave={() => setHovered("")}
                style={itemStyle("admin")}
              >
                <Users size={18} style={{ flexShrink: 0 }} />
                <Label>Admin Operation</Label>
                {open && (
                  <ChevronDown
                    size={14}
                    style={{
                      marginLeft: "auto",
                      transform: adminOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.25s ease",
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: open && adminOpen ? "1fr" : "0fr",
                  opacity: open && adminOpen ? 1 : 0,
                  transition: "grid-template-rows 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.22s ease",
                }}
              >
                <div style={{ overflow: "hidden" }}>
                  <div style={{ paddingLeft: 26, paddingTop: 2 }}>
                    <div style={subBtn} onClick={() => { setShowEngineerModal(true); setMobileOpen(false); }}>Engineer Addition</div>
                    <div style={subBtn} onClick={() => { setShowUserList(true); setMobileOpen(false); }}>User List</div>
                    <div style={subBtn} onClick={() => { setShowUserModal(true); setMobileOpen(false); }}>User Addition</div>
                    {role === "admin" && <div style={subBtn} onClick={() => { navigate("/stores"); setMobileOpen(false); }}>Store Management</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!feedbackOnly && (
            <div
              onMouseEnter={() => handleGroupHover(setDataOpen, true, open)}
              onMouseLeave={() => handleGroupHover(setDataOpen, false, open)}
            >
              <div
                title="Data Operation"
                onClick={() => handleGroupClick(setDataOpen, open)}
                onMouseEnter={() => setHovered("data")}
                onMouseLeave={() => setHovered("")}
                style={itemStyle("data")}
              >
                <Database size={18} style={{ flexShrink: 0 }} />
                <Label>Data Operation</Label>
                {open && (
                  <ChevronDown
                    size={14}
                    style={{
                      marginLeft: "auto",
                      transform: dataOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.25s ease",
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: open && dataOpen ? "1fr" : "0fr",
                  opacity: open && dataOpen ? 1 : 0,
                  transition: "grid-template-rows 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.22s ease",
                }}
              >
                <div style={{ overflow: "hidden" }}>
                  <div style={{ paddingLeft: 26, paddingTop: 2 }}>
                    <div style={subBtn} onClick={() => { setShowFaultModal(true); setMobileOpen(false); }}>Fault</div>
                    <div style={subBtn} onClick={() => { setShowMakeModal(true); setMobileOpen(false); }}>Make</div>
                    <div style={subBtn} onClick={() => { setShowModelModal(true); setMobileOpen(false); }}>Model</div>
                    <div style={subBtn} onClick={() => { setShowDrawerModal(true); setMobileOpen(false); }}>Drawer</div>
                    <div style={subBtn} onClick={() => { setShowDistrictTalukModal(true); setMobileOpen(false); }}>District / Taluk</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!feedbackOnly && (
            <div
              title="Report"
              onClick={() => { navigate("/report"); setMobileOpen(false); }}
              onMouseEnter={() => setHovered("report")}
              onMouseLeave={() => setHovered("")}
              style={itemStyle("report")}
            >
              <FileBarChart size={18} style={{ flexShrink: 0 }} />
              <Label>Report</Label>
            </div>
          )}
          {role === "admin" && (
            <div
              title="Ask Radnus AI"
              onClick={() => { navigate("/ask-ai"); setMobileOpen(false); }}
              onMouseEnter={() => setHovered("ai")}
              onMouseLeave={() => setHovered("")}
              style={itemStyle("ai")}
            >
              <Sparkles size={18} style={{ flexShrink: 0 }} />
              <Label>Ask Radnus AI</Label>
            </div>
          )}
        </div>

        <div style={{ padding: 8, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div
            title="Logout"
            onClick={handleLogout}
            onMouseEnter={() => setHovered("logout")}
            onMouseLeave={() => setHovered("")}
            style={{ ...itemStyle("logout"), color: "#f87171" }}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            <Label>Logout</Label>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Desktop Sidebar — collapsed (icons only) by default.
          Hovering anywhere over it opens it; moving the mouse away closes it
          again after a short delay (see closeSidebarDelayed) to avoid jarring
          flicker when navigating to a new page. */}
      <div
        className="d-none d-md-flex"
        onMouseEnter={openSidebar}
        onMouseLeave={closeSidebarDelayed}
        style={{
          width: isOpen ? EXPANDED_W : COLLAPSED_W,
          minWidth: isOpen ? EXPANDED_W : COLLAPSED_W,
          minHeight: "100vh", background: "#0f172a",
          flexDirection: "column", position: "sticky", top: 0, alignSelf: "flex-start",
          borderRight: "1px solid rgba(255,255,255,0.06)", zIndex: 20,
          transition: "width 0.3s cubic-bezier(0.22, 1, 0.36, 1), min-width 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
          overflow: "hidden",
          willChange: "width",
        }}
      >
        {renderSidebar(false)}
      </div>

      {/* Mobile (< md): fixed top bar + slide-in drawer. Fixed, so it never becomes a
          squeezed flex column next to the page content. */}
      <style>{`
        @media (max-width: 767.98px) {
          body { padding-top: calc(48px + env(safe-area-inset-top, 0px)); }
        }
      `}</style>
      <div
        className="d-md-none"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 1030,
          background: "#0f172a", padding: "0 14px", paddingTop: "env(safe-area-inset-top, 0px)",
          height: "calc(48px + env(safe-area-inset-top, 0px))", boxSizing: "border-box",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>👤 {user?.username || "Admin"}</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          style={{ background: "none", border: "none", color: "#fff", padding: 4 }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        className="d-md-none"
        onClick={() => setMobileOpen(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 1035, background: "rgba(0,0,0,0.55)",
          opacity: mobileOpen ? 1 : 0, pointerEvents: mobileOpen ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />
      <div
        className="d-md-none"
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 260, maxWidth: "82vw",
          zIndex: 1040, background: "#0f172a", display: "flex", flexDirection: "column",
          overflowY: "auto", paddingTop: "env(safe-area-inset-top, 0px)",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
          boxShadow: mobileOpen ? "6px 0 24px rgba(0,0,0,0.4)" : "none",
        }}
      >
        {renderSidebar(true)}
      </div>

      {showMakeModal && <AdminMakeModal onClose={() => setShowMakeModal(false)} />}
      {showModelModal && <AdminModelModal onClose={() => setShowModelModal(false)} />}
      {showFaultModal && <FaultPopup onClose={() => setShowFaultModal(false)} />}
      {showDrawerModal && <DrawerPopup onClose={() => setShowDrawerModal(false)} />}
      {showEngineerModal && <EngineerPopup onClose={() => setShowEngineerModal(false)} />}
      {showUserModal && <UserAddition onClose={() => setShowUserModal(false)} />}
      {showUserList && <UserListPopup onClose={() => setShowUserList(false)} />}
      {showDistrictTalukModal && <DistrictTalukPopup onClose={() => setShowDistrictTalukModal(false)} />}
    </>
  );
};

export default JobSheetSidebar;