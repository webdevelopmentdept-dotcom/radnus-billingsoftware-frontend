import React, { useState } from "react";
import logo from "../assets/logo.png";
import bgImage from "../assets/samplebg.jpg";
import LoginModal from "./LoginModal";

const Firstpage = () => {
  const [showLogin, setShowLogin] = useState(false);
  

  return (
    <>
      {/* PAGE LEVEL CSS */}
      <style>
        {`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes zoomIn {
            from { opacity: 0; transform: scale(0.85); }
            to { opacity: 1; transform: scale(1); }
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .hero-logo {
            animation: zoomIn 1s ease forwards;
          }

          .hero-title {
            animation: fadeUp 1s ease forwards;
            animation-delay: 0.3s;
            opacity: 0;
          }

          .hero-subtitle {
            animation: fadeUp 1s ease forwards;
            animation-delay: 0.6s;
            opacity: 0;
          }

          .hero-button {
            animation: fadeUp 1s ease forwards;
            animation-delay: 0.9s;
            opacity: 0;
          }

          .hero-contact {
            animation: fadeIn 1.2s ease forwards;
            animation-delay: 1.2s;
            opacity: 0;
          }
        `}
      </style>

      {/* HERO SECTION */}
      <div
        className="d-flex align-items-center justify-content-center text-center position-relative"
        style={{
          minHeight: "100vh",
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay */}
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        ></div>

        {/* CONTENT */}
        <div className="position-relative text-white px-3">

          {/* Logo */}
         <img
  src={logo}
  alt="Radnus Logo"
  className="mb-4 hero-logo d-block mx-auto"
  style={{ width: "110px" }}
/>

          {/* Title */}
          <h1
            className="fw-bold hero-title"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
          >
            Welcome to <br />
            <span style={{ color: "#38bdf8" }}>
              Radnus Service Billing
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="mt-4 mx-auto hero-subtitle"
            style={{
              maxWidth: "720px",
              fontSize: "1.15rem",
              color: "#e5e7eb",
            }}
          >
            Manage your service billing easily and efficiently with Radnus.
          </p>

          {/* LOGIN BUTTON */}
          <button
            className="btn btn-primary btn-lg mt-4 px-5 hero-button"
            onClick={() => setShowLogin(true)}
          >
            Login
          </button>

          {/* Contact Info */}
          <div className="mt-5 hero-contact small text-light">
            <p><b>Address:</b> Sinnaya Plaza, MG Road, Puducherry</p>
            <p><b>Email:</b> sundar12134@gmail.com</p>
            <p><b>Phone:</b> +91 9940973030</p>
          </div>

        </div>
      </div>

      {/* LOGIN POPUP */}
      <LoginModal
        show={showLogin}
        onClose={() => setShowLogin(false)}
      />
    </>
  );
};

export default Firstpage;
