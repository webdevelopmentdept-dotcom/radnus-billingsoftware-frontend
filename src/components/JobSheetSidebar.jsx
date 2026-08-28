import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, LayoutList, Users, Database, FileBarChart, LogOut, Menu, X
} from "lucide-react";
import AdminMakeModal from "./popups/AdminMakeModal";
import AdminModelModal from "./popups/AdminModelModal";
import FaultPopup from "./popups/FaultPopup";
import DrawerPopup from "./popups/DrawerPopup";
import EngineerPopup from "./popups/EngineerPopup";
import UserAddition from "./popups/UserAddition";
import UserListPopup from "./popups/UserListPopup";
import DistrictTalukPopup from "./popups/Districttalukpopup"

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

  const itemStyle = (key, extra = {}) => ({
    ...navBtn,
    ...(hovered === key ? navBtnHover : {}),
    justifyContent: isOpen ? "flex-start" : "center",
    ...extra,
  });

  // Label span that fades/collapses away when the sidebar is closed
  const Label = ({ children }) => (
    <span
      style={{
        opacity: isOpen ? 1 : 0,
        maxWidth: isOpen ? 160 : 0,
        transition: "opacity 0.3s ease, max-width 0.38s cubic-bezier(0.22, 1, 0.36, 1)",
        overflow: "hidden",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );

  // Group submenus (Admin Operation / Data Operation) reveal on hover once the
  // sidebar itself is open — clicking still works as a fallback on touch devices.
  const handleGroupClick = (setter) => {
    if (!isOpen) {
      openSidebar();
      setter(true);
    } else {
      setter(prev => !prev);
    }
  };

  const handleGroupHover = (setter, isEntering) => {
    if (isOpen) setter(isEntering);
  };

  const sidebarContent = (
    <>
      <div
        style={{
          padding: isOpen ? "14px 16px" : "14px 0",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* 3-line icon — hovering this (or anywhere in the sidebar) opens it */}
        <div
          style={{
            display: "flex",
            justifyContent: isOpen ? "flex-end" : "center",
          }}
        >
          <button
            onClick={() => (isOpen ? setIsOpen(false) : openSidebar())}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
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
                transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
              }}
            />
          </button>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 8, color: "#fff", fontWeight: 700,
          justifyContent: isOpen ? "flex-start" : "center",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "#DC2626",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0
          }}>
            {(user?.username || "A")[0].toUpperCase()}
          </div>
          <Label>{user?.username || "Admin"}</Label>
        </div>
      </div>

      <div style={{ padding: "10px 8px", flex: 1, overflowY: "auto", overflowX: "hidden" }}>
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

        {role === "admin" && (
          <div
            onMouseEnter={() => handleGroupHover(setAdminOpen, true)}
            onMouseLeave={() => handleGroupHover(setAdminOpen, false)}
          >
            <div
              title="Admin Operation"
              onClick={() => handleGroupClick(setAdminOpen)}
              onMouseEnter={() => setHovered("admin")}
              onMouseLeave={() => setHovered("")}
              style={itemStyle("admin")}
            >
              <Users size={18} style={{ flexShrink: 0 }} />
              <Label>Admin Operation</Label>
              {isOpen && (
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
                gridTemplateRows: isOpen && adminOpen ? "1fr" : "0fr",
                opacity: isOpen && adminOpen ? 1 : 0,
                transition: "grid-template-rows 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.22s ease",
              }}
            >
              <div style={{ overflow: "hidden" }}>
                <div style={{ paddingLeft: 26, paddingTop: 2 }}>
                  <div style={subBtn} onClick={() => { setShowEngineerModal(true); setMobileOpen(false); }}>Engineer Addition</div>
                  <div style={subBtn} onClick={() => { setShowUserList(true); setMobileOpen(false); }}>User List</div>
                  <div style={subBtn} onClick={() => { setShowUserModal(true); setMobileOpen(false); }}>User Addition</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          onMouseEnter={() => handleGroupHover(setDataOpen, true)}
          onMouseLeave={() => handleGroupHover(setDataOpen, false)}
        >
          <div
            title="Data Operation"
            onClick={() => handleGroupClick(setDataOpen)}
            onMouseEnter={() => setHovered("data")}
            onMouseLeave={() => setHovered("")}
            style={itemStyle("data")}
          >
            <Database size={18} style={{ flexShrink: 0 }} />
            <Label>Data Operation</Label>
            {isOpen && (
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
              gridTemplateRows: isOpen && dataOpen ? "1fr" : "0fr",
              opacity: isOpen && dataOpen ? 1 : 0,
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
        {sidebarContent}
      </div>

      {/* Mobile top strip + toggle */}
      <div
        className="d-md-none"
        style={{
          background: "#0f172a", padding: "10px 14px", display: "flex",
          justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0, zIndex: 30,
        }}
      >
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>👤 {user?.username || "Admin"}</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: "none", border: "none", color: "#fff", padding: 4 }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="d-md-none" style={{ background: "#0f172a", display: "flex", flexDirection: "column" }}>
          {sidebarContent}
        </div>
      )}

      {showMakeModal          && <AdminMakeModal      onClose={() => setShowMakeModal(false)} />}
      {showModelModal         && <AdminModelModal     onClose={() => setShowModelModal(false)} />}
      {showFaultModal         && <FaultPopup          onClose={() => setShowFaultModal(false)} />}
      {showDrawerModal        && <DrawerPopup         onClose={() => setShowDrawerModal(false)} />}
      {showEngineerModal      && <EngineerPopup       onClose={() => setShowEngineerModal(false)} />}
      {showUserModal          && <UserAddition        onClose={() => setShowUserModal(false)} />}
      {showUserList           && <UserListPopup       onClose={() => setShowUserList(false)} />}
      {showDistrictTalukModal && <DistrictTalukPopup  onClose={() => setShowDistrictTalukModal(false)} />}
    </>
  );
};

export default JobSheetSidebar;