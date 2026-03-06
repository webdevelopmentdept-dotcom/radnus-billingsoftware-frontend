import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ReportPage = () => {

  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [engineers, setEngineers] = useState([]);
  const [engineer, setEngineer] = useState("");

  const [dealer, setDealer] = useState("");

  const [counts, setCounts] = useState({
    received: 0,
    repaired: 0,
    delivered: 0,
    nrna: 0
  });
  const API = import.meta.env.VITE_API_URL;

  const fetchCounts = async () => {

    try {

      const res = await axios.get(
        `${API}/api/jobsheets/filter`,
        {
          params: { fromDate, toDate, engineer, dealer }
        }
      );

      let data = res.data;

      const received = data.filter(
        d => d.device?.mobileStatus === "Received"
      ).length;

      const repaired = data.filter(
        d => d.device?.mobileStatus === "Pending"
      ).length;

      const delivered = data.filter(
        d => d.device?.mobileStatus === "Delivered"
      ).length;

      const nrna = data.filter(
        d => d.device?.mobileStatus === "Delivered NR/NA"
      ).length;

      setCounts({ received, repaired, delivered, nrna });

    } catch (err) {

      console.error(err);
      alert("Failed ❌");

    }

  };

  useEffect(() => {
    fetchEngineers();
  }, []);

  const fetchEngineers = async () => {

    try {

      const res = await axios.get(`${API}/api/engineers`);
      setEngineers(res.data);

    } catch (err) {

      console.error(err);

    }

  };

  return (

    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">

      {/* PAGE LEVEL CSS */}
      <style>
        {`

        @media (max-width:768px){

          .report-filters{
            flex-direction:column;
            align-items:stretch;
          }

          .report-filters input,
          .report-filters select,
          .report-filters button{
            width:100%;
          }

          .report-cards{
            grid-template-columns:1fr 1fr;
          }

        }

        @media (max-width:480px){

          .report-cards{
            grid-template-columns:1fr;
          }

        }

      `}
      </style>

      {/* HEADER */}

      <div className="mb-6">

        <h1 className="text-2xl font-bold text-gray-800">
          📊 Report Dashboard
        </h1>

        <p className="text-sm text-gray-500">
          Track and analyze service reports
        </p>

      </div>

      {/* FILTER CARD */}

      <div className="report-filters bg-white p-5 rounded-2xl shadow-md mb-6 flex flex-wrap gap-4 items-end">

        {/* Engineer */}

        <div className="flex flex-col">

          <label className="text-xs text-gray-500 mb-1">
            Engineer
          </label>

          <select
            className="border px-3 py-2 rounded-lg focus:ring-2 focus:ring-black"
            value={engineer}
            onChange={(e) => setEngineer(e.target.value)}
          >

            <option value="">
              Select Engineer
            </option>

            {engineers.map((eng) => (

              <option key={eng._id} value={eng.name}>
                {eng.name}
              </option>

            ))}

          </select>

        </div>

        {/* Dealer */}

        <div className="flex flex-col">

          <label className="text-xs text-gray-500 mb-1">
            Dealer
          </label>

          <input
            type="text"
            placeholder="Enter Dealer Name"
            className="border px-3 py-2 rounded-lg focus:ring-2 focus:ring-black"
            value={dealer}
            onChange={(e) => setDealer(e.target.value)}
          />

        </div>

        {/* From Date */}

        <div className="flex flex-col">

          <label className="text-xs text-gray-500 mb-1">
            From Date
          </label>

          <input
            type="date"
            className="border px-3 py-2 rounded-lg focus:ring-2 focus:ring-black"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />

        </div>

        {/* To Date */}

        <div className="flex flex-col">

          <label className="text-xs text-gray-500 mb-1">
            To Date
          </label>

          <input
            type="date"
            className="border px-3 py-2 rounded-lg focus:ring-2 focus:ring-black"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />

        </div>

        {/* Search */}

        <button
          onClick={fetchCounts}
          className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg shadow"
        >
          🔍 Search
        </button>

      </div>

      {/* COUNT CARDS */}

      <div className="report-cards grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">

        {[

          { label: "Received", value: counts.received, color: "text-blue-600" },
          { label: "Repaired", value: counts.repaired, color: "text-green-600" },
          { label: "Delivered", value: counts.delivered, color: "text-purple-600" },
          { label: "NR/NA", value: counts.nrna, color: "text-red-600" }

        ].map((item, i) => (

          <div
            key={i}
            className="bg-white p-5 rounded-2xl shadow-md text-center hover:shadow-lg transition"
          >

            <p className="text-xs text-gray-500">
              {item.label}
            </p>

            <h2 className={`text-2xl font-bold ${item.color}`}>
              {item.value}
            </h2>

          </div>

        ))}

      </div>

      {/* ACTION SECTIONS */}

      <div className="grid md:grid-cols-2 gap-6">

        {/* STATUS REPORT */}

        <div className="bg-white p-5 rounded-2xl shadow-md">

          <h3 className="font-semibold text-gray-700 mb-4">
            📋 Status Reports
          </h3>

          <div className="grid grid-cols-2 gap-3">

            <ActionBtn label="Repair Pending" path="/repair-pending" navigate={navigate} />

            <ActionBtn label="Delivery Pending" path="/delivery-pending" navigate={navigate} />

            <ActionBtn label="Value Report" path="/value-report" navigate={navigate} />

            <ActionBtn label="Engineer Report" path="/engineer-report" navigate={navigate} />

            <ActionBtn label="Spare Report" path="/spare-report" navigate={navigate} />

             <ActionBtn label="Dealer Report" path="/dealer-report" navigate={navigate} />

          </div>

          {/* <button
            onClick={() => navigate("/dealer-report")}
            className="mt-4 w-full bg-gray-100 hover:bg-gray-200 p-2 rounded-lg"
          >

            Dealer Report

          </button> */}

        </div>

        {/* DAILY SUMMARY */}

        <div className="bg-white p-5 rounded-2xl shadow-md">

          <h3 className="font-semibold text-gray-700 mb-4">
            📅 Daily Summary
          </h3>

          <div className="grid grid-cols-2 gap-3">

            <ActionBtn label="Received" path="/received-report" navigate={navigate} />

            <ActionBtn label="Repaired" path="/repaired-report" navigate={navigate} />

            <ActionBtn label="Delivered" path="/delivered-report" navigate={navigate} />

            <ActionBtn label="Delivered NR/NA" path="/delivered-nrna-report" navigate={navigate} />

          </div>

          <div className="flex gap-3 mt-4">

            <ActionBtn label="All Report" path="/all-report" navigate={navigate} full />

            <ActionBtn label="All Engineer Report" path="/engineer-all-report" navigate={navigate} full />

          </div>

        </div>

      </div>

    </div>

  );

};

/* BUTTON COMPONENT */

const ActionBtn = ({ label, path, navigate, full }) => (

  <button
    onClick={() => navigate(path)}
    className={`border hover:bg-black hover:text-white transition p-2 rounded-lg ${full ? "w-full" : ""}`}
  >

    {label}

  </button>

);

export default ReportPage;