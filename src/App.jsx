import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Firstpage from "./components/Firstpage";
import JobSheetPage from "./components/JobSheetPage";
import Home from "./components/Home";
import JobSheetEdit from "./components/JobSheetEdit";
import EstimateBill from "./components/EstimateBill";
import ReportPage from "./components/reports/MainReportPage";
import RepairPendingReport from "./components/reports/RepairPendingReport";
import DeliveryPendingReport from "./components/reports/DeliveryPendingReport";
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
// import UserAddition from "./components/popups/UserAddition";
import UserReportPage from "./components/reports/UserReportPage";
import UserListPopup from "./components/popups/UserListPopup";
import SpareReportPage from "./components/reports/SpareReportPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Firstpage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/jobsheet" element={<JobSheetPage />} />
        <Route path="/jobsheet/:id" element={<JobSheetEdit />} />
        <Route path="/estimate-bill/:id" element={<EstimateBill />} />
        <Route path="/invoice/:id" element={<InvoiceBill />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/repair-pending" element={<RepairPendingReport />} />
        <Route path="/delivery-pending" element={<DeliveryPendingReport />} />
        <Route path="/value-report" element={<ValueReport />} />
        <Route path="/engineer-report" element={<EngineerValueReport />} />
        <Route path="/received-report" element={<DailyReceivedReport />} />
        <Route path="/repaired-report" element={<DailyRepairedReport />} />
        <Route path="/delivered-report" element={<DailyDeliveredOKReport />} />
        <Route path="/delivered-nrna-report" element={<DailyDeliveredNRNAReport />} />
        <Route path="/all-report" element={<AllReportPage />} />
        <Route path="/engineer-all-report" element={<EngineerReportPage />} />
        <Route path="/dealer-report" element={<DealerReportPage />} />
        {/* <Route path="/user-add" element={<UserAddition />} /> */}
         <Route path="/user-report" element={<UserReportPage />} />
         <Route path="/user-list" element={<UserListPopup />} />
         <Route path="/spare-report" element={<SpareReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
