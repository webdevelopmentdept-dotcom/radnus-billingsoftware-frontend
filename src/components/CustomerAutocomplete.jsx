import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Phone, MapPin } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

const CustomerAutocomplete = ({ 
  type,
  value,
  onChange,
  onSelect,
  placeholder,
  maxLength,
  className = "",
  inputProps = {},
  filterNumbers = false,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const justSelectedRef = useRef(false); // NEW — blocks re-search right after a pick

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions when typing
  useEffect(() => {
    // NEW — if this value change came from a selection, skip the re-search once
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    if (!value || value.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/api/jobsheets/customers/search`, {
          params: { q: value, type }
        });
        setSuggestions(res.data);
        setShowSuggestions(res.data.length > 0);
      } catch (err) {
        console.error("❌ Customer search error:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [value, type]);

  const handleInputChange = (e) => {
    let val = e.target.value;
    if (filterNumbers) {
      val = val.replace(/\D/g, "");
    }
    onChange(val);
    setShowSuggestions(true);
  };

  const handleBlur = (e) => {
    if (inputProps.onBlur) {
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: value
        }
      };
      inputProps.onBlur(syntheticEvent);
    }
  };

  const handleSelect = (customer) => {
    justSelectedRef.current = true; // NEW — mark next value-change as "from selection"
    setShowSuggestions(false);
    setSuggestions([]);
    onSelect(customer);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        maxLength={maxLength}
        autoComplete="off"
      />
      
      {loading && (
        <div style={{
          position: "absolute",
          right: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "10px",
          color: "#999"
        }}>
          ⏳
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
          maxHeight: "230px",
          overflowY: "auto",
          padding: "4px"
        }}>
          {suggestions.map((customer, idx) => (
            <div
              key={idx}
              onClick={() => handleSelect(customer)}
              style={{
                padding: "8px 10px",
                cursor: "pointer",
                borderRadius: "8px",
                transition: "background 0.15s",
                fontSize: "13px"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f3f4f6"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontWeight: 600, color: "#111827" }}>
                {customer.name}
              </div>
              <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "1px", display: "flex", alignItems: "center", gap: "4px" }}>
                <Phone size={12} /> {customer.contact}
              </div>
              {customer.address && (
                <div style={{ color: "#9ca3af", fontSize: "11px", marginTop: "1px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <MapPin size={11} /> {customer.address}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerAutocomplete;