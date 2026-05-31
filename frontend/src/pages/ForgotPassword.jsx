import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../components/Toast";

export default function ForgotPassword() {
  const [email, setEmail]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [devToken, setDevToken]     = useState("");   // shown in dev only
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
      // Dev helper: backend returns reset_token directly
      if (data.reset_token) setDevToken(data.reset_token);
      toast("Reset instructions sent!", "success");
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#080b14",
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "2rem 1rem", position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", width: "600px", height: "600px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
        top: "-200px", left: "-100px", pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "440px", position: "relative" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "2rem" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#e2e8f0" }}>Health AI</span>
        </div>

        {!submitted ? (
          <>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 0.375rem", letterSpacing: "-0.03em" }}>
              Forgot password?
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.9375rem", marginBottom: "1.75rem" }}>
              Enter your email and we'll send a reset link.
            </p>

            <div style={{
              background: "rgba(15,20,40,0.8)", border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "16px", padding: "2rem",
              backdropFilter: "blur(20px)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 20px 60px rgba(0,0,0,0.4)",
            }}>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <InputField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "0.75rem",
                    background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    border: "none", borderRadius: "10px", color: "white",
                    fontSize: "0.9375rem", fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {loading && <Spinner />}
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </div>
          </>
        ) : (
          /* ── Success state ── */
          <div style={{
            background: "rgba(15,20,40,0.8)", border: "1px solid rgba(52,211,153,0.3)",
            borderRadius: "16px", padding: "2rem", textAlign: "center",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 20px 60px rgba(0,0,0,0.4)",
          }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%",
              background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ color: "#f1f5f9", fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Check your email
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6 }}>
              If <strong style={{ color: "#94a3b8" }}>{email}</strong> is registered, you'll receive reset instructions shortly.
            </p>

            {/* DEV ONLY: show token so you can test without email setup */}
            {devToken && (
              <div style={{
                marginTop: "1.25rem", padding: "0.875rem",
                background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: "10px", textAlign: "left",
              }}>
                <p style={{ color: "#818cf8", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  🛠 DEV TOKEN (remove in production):
                </p>
                <p style={{
                  color: "#94a3b8", fontSize: "0.7rem", wordBreak: "break-all",
                  fontFamily: "monospace", lineHeight: 1.5,
                }}>
                  {devToken}
                </p>
                <Link
                  to={`/reset-password?token=${devToken}`}
                  style={{
                    display: "inline-block", marginTop: "0.75rem",
                    color: "#818cf8", fontSize: "0.8rem", textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  → Go to reset password page
                </Link>
              </div>
            )}
          </div>
        )}

        <p style={{ textAlign: "center", color: "#475569", fontSize: "0.875rem", marginTop: "1.5rem" }}>
          <Link to="/login" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 500 }}>
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#94a3b8", marginBottom: "0.4rem" }}>
        {label}
      </label>
      <div style={{
        display: "flex", alignItems: "center",
        background: "rgba(15,20,40,0.9)",
        border: `1px solid ${focused ? "rgba(99,102,241,0.6)" : "rgba(99,102,241,0.15)"}`,
        borderRadius: "10px",
        boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.15)" : "none",
        transition: "all 0.2s ease",
      }}>
        <span style={{ paddingLeft: "0.875rem", color: "#475569", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </span>
        <input
          type={type} value={value} onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            padding: "0.75rem 0.75rem", color: "#e2e8f0", fontSize: "0.9375rem",
          }}
        />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: "16px", height: "16px",
      border: "2px solid rgba(255,255,255,0.3)",
      borderTop: "2px solid white", borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
