import { useState, useRef, useEffect } from "react";
import {
  Send, Sparkles, RotateCcw, IndianRupee, Package,
  Users, Clock, TrendingUp, Wrench, User,
} from "lucide-react";
import JobSheetSidebar from "./JobSheetSidebar"; // Remove this import and the <JobSheetSidebar /> below if the page already shows a sidebar

// Use the same backend URL variable as the rest of your project
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const getToken = () => sessionStorage.getItem("token");

const SUGGESTIONS = [
  { icon: IndianRupee, text: "How much income did we earn this month?" },
  { icon: TrendingUp,  text: "Engineer-wise income this month" },
  { icon: Package,     text: "How much did we spend on spares last week?" },
  { icon: Users,       text: "Which engineer completed the most jobs this month?" },
  { icon: Wrench,      text: "Which make comes most for repair this month?" },
  { icon: Clock,       text: "Show pending jobs older than 7 days" },
];

const C = {
  dark: "#0f172a",
  red: "#DC2626",
  redDark: "#B91C1C",
  bg: "#f1f5f9",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
};

export default function AskRadnusAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll only inside the chat box (the page itself does not scroll)
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    const history = messages;
    setMessages([...history, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ai/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ question, history }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer || data.error || "Something went wrong.",
          isError: !data.answer,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error. Please try again.", isError: true },
      ]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    if (loading) return;
    setMessages([]);
    setInput("");
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="ai-root">
      <style>{`
        .ai-root { display:flex; height:100vh; overflow:hidden; background:${C.bg}; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
        .ai-main { flex:1; min-width:0; display:flex; flex-direction:column; }
        .ai-chat::-webkit-scrollbar { width:8px; }
        .ai-chat::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:8px; }
        .ai-sug { transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
        .ai-sug:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(15,23,42,.08); border-color:${C.red} !important; }
        .ai-send:hover:not(:disabled) { background:${C.redDark} !important; }
        .ai-clear:hover:not(:disabled) { background:#e2e8f0 !important; }
        .ai-input:focus { outline:none; }
        .ai-dot { width:7px; height:7px; border-radius:50%; background:#94a3b8; display:inline-block; animation: aiBounce 1.2s infinite ease-in-out; }
        .ai-dot:nth-child(2){ animation-delay:.15s } .ai-dot:nth-child(3){ animation-delay:.3s }
        @keyframes aiBounce { 0%,60%,100%{ transform:translateY(0); opacity:.4 } 30%{ transform:translateY(-5px); opacity:1 } }
        @keyframes aiFade { from{ opacity:0; transform:translateY(6px) } to{ opacity:1; transform:none } }
        .ai-msg { animation: aiFade .25s ease; }
        @media (max-width: 767px) {
          .ai-root { flex-direction:column; height:100dvh; }
          .ai-grid { grid-template-columns: 1fr !important; }
          .ai-title-sub { display:none; }
        }
      `}</style>

      <JobSheetSidebar />

      <div className="ai-main">
        {/* ===== Header ===== */}
        <div
          style={{
            background: "#fff", borderBottom: `1px solid ${C.border}`,
            padding: "14px 24px", display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <div
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${C.red}, #f97316)`,
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
            }}
          >
            <Sparkles size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Ask Radnus AI</div>
            <div className="ai-title-sub" style={{ fontSize: 12.5, color: C.muted }}>
              Instant answers from your live billing data
            </div>
          </div>
          {!isEmpty && (
            <button
              className="ai-clear"
              onClick={clearChat}
              disabled={loading}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
                borderRadius: 8, border: "none", background: C.bg, color: C.muted,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              <RotateCcw size={14} /> New chat
            </button>
          )}
        </div>

        {/* ===== Chat area ===== */}
        <div ref={chatRef} className="ai-chat" style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            {isEmpty ? (
              <div style={{ textAlign: "center", paddingTop: 24 }}>
                <div
                  style={{
                    width: 64, height: 64, margin: "0 auto 16px", borderRadius: 20,
                    background: `linear-gradient(135deg, ${C.red}, #f97316)`,
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                    boxShadow: "0 10px 24px rgba(220,38,38,.25)",
                  }}
                >
                  <Sparkles size={30} />
                </div>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text }}>
                  What would you like to know?
                </h2>
                <p style={{ margin: "8px 0 28px", color: C.muted, fontSize: 14.5 }}>
                  Ask about income, spares, jobs and pending work in English, Tamil or Tanglish.
                </p>

                <div
                  className="ai-grid"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "left" }}
                >
                  {SUGGESTIONS.map(({ icon: Icon, text }) => (
                    <button
                      key={text}
                      className="ai-sug"
                      onClick={() => send(text)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                        background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12,
                        cursor: "pointer", color: C.text, fontSize: 14, fontWeight: 500, textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                          background: "#fef2f2", color: C.red,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Icon size={17} />
                      </span>
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {messages.map((m, i) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={i}
                      className="ai-msg"
                      style={{
                        display: "flex", gap: 10, alignItems: "flex-start",
                        flexDirection: isUser ? "row-reverse" : "row",
                      }}
                    >
                      <div
                        style={{
                          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: isUser ? C.dark : `linear-gradient(135deg, ${C.red}, #f97316)`,
                          color: "#fff",
                        }}
                      >
                        {isUser ? <User size={16} /> : <Sparkles size={16} />}
                      </div>
                      <div
                        style={{
                          maxWidth: "80%", padding: "11px 15px", fontSize: 14.5, lineHeight: 1.6,
                          whiteSpace: "pre-wrap", wordBreak: "break-word",
                          borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                          background: isUser ? C.dark : m.isError ? "#fef2f2" : "#fff",
                          color: isUser ? "#fff" : m.isError ? C.redDark : C.text,
                          border: isUser ? "none" : `1px solid ${m.isError ? "#fecaca" : C.border}`,
                          boxShadow: isUser ? "none" : "0 1px 2px rgba(15,23,42,.04)",
                        }}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="ai-msg" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: `linear-gradient(135deg, ${C.red}, #f97316)`, color: "#fff",
                      }}
                    >
                      <Sparkles size={16} />
                    </div>
                    <div
                      style={{
                        padding: "14px 16px", background: "#fff", border: `1px solid ${C.border}`,
                        borderRadius: "4px 16px 16px 16px", display: "flex", gap: 5, alignItems: "center",
                      }}
                    >
                      <span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== Input bar ===== */}
        <div style={{ padding: "12px 16px 16px", background: C.bg }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8, background: "#fff",
                border: `1px solid ${C.border}`, borderRadius: 14, padding: "6px 6px 6px 16px",
                boxShadow: "0 2px 8px rgba(15,23,42,.06)",
              }}
            >
              <input
                ref={inputRef}
                className="ai-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
                }}
                placeholder="Ask a question... (example: this month engineer-wise income)"
                maxLength={500}
                style={{
                  flex: 1, border: "none", background: "transparent",
                  fontSize: 14.5, color: C.text, padding: "8px 0",
                }}
              />
              <button
                className="ai-send"
                onClick={() => send()}
                disabled={loading || !input.trim()}
                aria-label="Send"
                style={{
                  width: 40, height: 40, borderRadius: 10, border: "none", flexShrink: 0,
                  background: C.red, color: "#fff", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  opacity: loading || !input.trim() ? 0.5 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background .15s ease, opacity .15s ease",
                }}
              >
                <Send size={17} />
              </button>
            </div>
            <div style={{ textAlign: "center", fontSize: 11.5, color: C.muted, marginTop: 8 }}>
              AI can make mistakes. Please verify important numbers against the reports.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}