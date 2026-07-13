import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Firstpage from "./components/Firstpage";
import JobSheetPage from "./components/JobSheetPage";
import JobSheetEditWrapper from "./components/JobSheetEditWrapper";
import Home from "./components/Home";
import EstimateBill from "./components/EstimateBill";
import RepairedReport from "./components/reports/Repairedreport";
// App.jsx / routes-ல்
import ServiceRepReportPage from "./components/reports/ServiceRepReportPage";


import DailyPendingReport from "./components/reports/DailyPendingReport";
import ReportPage from "./components/reports/MainReportPage";
import RepairPendingReport from "./components/reports/RepairPendingReport";
import DeliveryReport from "./components/reports/DeliveryReport";
import ValueReport from "./components/reports/ValueReport";
import EngineerValueReport from "./components/reports/EngineerValueReport";
import DailyReceivedReport from "./components/reports/DailyReceivedReport";
import DailyDeliveredOKReport from "./components/reports/DailyDeliveredOKReport";
import DailyDeliveredNRNAReport from "./components/reports/DailyDeliveredNRNAReport";
import DailyRepairedReport from "./components/reports/DailyRepairedReport";
import AllReportPage from "./components/reports/AllReportPage";
import EngineerReportPage from "./components/reports/EngineerReportPage";
import DealerReportPage from "./components/reports/DealerReportPage";
import InvoiceBill from "./components/InvoiceBill";
import UserReportPage from "./components/reports/UserReportPage";
import UserListPopup from "./components/popups/UserListPopup";
import SpareReportPage from "./components/reports/SpareReportPage";
import ServiceReportPage from "./components/reports/ServiceReportPage";
import OthersReportPage from "./components/reports/OthersReportPage";
import AdvanceReportPage from "./components/reports/AdvanceReportPage";
import IncomeReportPage from "./components/reports/IncomeReportPage";
import EngineerDashboard from "./components/Engineerdashboard"
import RebillReportPage from "./components/reports/RebillReportPage";
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Firstpage />} />
        <Route path="/home" element={<Home />} />

        {/* ✅ Dynamic engineer route - /engineer/ajith, /engineer/barani */}
        <Route path="/engineer/:name" element={<EngineerDashboard />} />

        <Route path="/jobsheet" element={<Navigate to="/jobsheet/new" replace />} />
        <Route path="/jobsheet/new" element={<JobSheetPage isEdit={false} editData={null} />} />
        <Route path="/jobsheet/:id" element={<JobSheetEditWrapper />} />

        <Route path="/estimate-bill/:id" element={<EstimateBill />} />
        <Route path="/invoice/:id" element={<InvoiceBill />} />
        <Route path="/report" element={<ReportPage />} />
               <Route path="/pending-report"  element={<RepairPendingReport />} />
        <Route path="/repaired-report" element={<RepairedReport />} />
        <Route path="/delivered-report" element={<DeliveryReport />} />





        
      
        <Route path="/value-report" element={<ValueReport />} />
        <Route path="/engineer-report" element={<EngineerValueReport />} />
        <Route path="/received-report" element={<DailyReceivedReport />} />
     
      <Route path="/daily-pending-report"   element={<DailyPendingReport />} />
<Route path="/daily-repaired-report"  element={<DailyRepairedReport />} />
<Route path="/daily-delivered-report" element={<DailyDeliveredOKReport />} />
        <Route path="/delivered-nrna-report" element={<DailyDeliveredNRNAReport />} />
        <Route path="/all-report" element={<AllReportPage />} />
        <Route path="/engineer-all-report" element={<EngineerReportPage />} />
        <Route path="/dealer-report" element={<DealerReportPage />} />


<Route path="/salesrep-report" element={<ServiceRepReportPage />} />
<Route path="/service-report" element={<ServiceReportPage />} />
<Route path="/income-report" element={<IncomeReportPage />} />
<Route path="/others-report" element={<OthersReportPage />} />
<Route path="/advance-report" element={<AdvanceReportPage />} />

<Route path="/my-report" element={<ServiceRepReportPage />} />
     
        <Route path="/rebill-report" element={<RebillReportPage />} />
        <Route path="/user-list" element={<UserListPopup />} />
        <Route path="/spare-report" element={<SpareReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;