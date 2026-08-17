import React, { useState, useEffect } from "react";
import { BarChart2, Clock, CheckCircle, Zap } from "lucide-react";
import JobSheetSidebar from "./JobSheetSidebar";

const Counter = ({ target }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = target / (2000 / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span className="text-4xl font-extrabold tracking-tight">{count.toLocaleString()}</span>;
};

const Home = () => {
  const API = import.meta.env.VITE_API_URL;
  const [stats, setStats] = useState({ totalJobs: 0, pendingJobs: 0, completedJobs: 0 });

  useEffect(() => {
    fetch(`${API}/api/dashboard/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-950 text-white">

      {/* ============ LEFT SIDEBAR (SAME AS JOB SHEET PAGE) ============ */}
      <JobSheetSidebar />

      {/* ============ MAIN CONTENT COLUMN ============ */}
      <div className="flex-1 min-w-0 flex flex-col">

        <main className="flex-1 container mx-auto px-6 py-8 flex flex-col items-center">
          <div className="text-center max-w-4xl mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
              <Zap size={14} />Enterprise Performance Monitor
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight leading-tight">
              Radnus <span className="text-indigo-500">24/7</span><br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
                Service Billing Software
              </span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Manage service jobs, engineer assignments, billing records, and service performance analytics in real-time.
            </p>
          </div>

          {/* METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mb-10">
            {[
              { icon: <BarChart2 size={28} />, label: "Total Service Jobs",  value: stats.totalJobs },
              { icon: <Clock size={28} />,     label: "Pending Service",     value: stats.pendingJobs },
              { icon: <CheckCircle size={28} />, label: "Completed Service", value: stats.completedJobs },
            ].map((metric, idx) => (
              <div key={idx} className="p-8 rounded-3xl bg-slate-900/60 border border-white/5 backdrop-blur-xl shadow-xl">
                <div className="mb-6 text-indigo-400">{metric.icon}</div>
                <p className="text-slate-400 text-sm uppercase tracking-wider mb-2">{metric.label}</p>
                <Counter target={metric.value} />
              </div>
            ))}
          </div>
        </main>

        <footer className="py-8 border-t border-white/5 text-center text-xs text-slate-500 uppercase tracking-widest">
          © 2026 Radnus Communication • Service Billing Platform
        </footer>

      </div>
    </div>
  );
};

export default Home;