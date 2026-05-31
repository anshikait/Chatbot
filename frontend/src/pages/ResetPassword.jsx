import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../components/Toast";

export default function ResetPassword() {
  const [searchParams]              = useSearchParams();
  const token                       = searchParams.get("token") || "";
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);
  const navigate                    = useNavigate();
  const { toast }                   = useToast();

  const strength = passwordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast("Passwords do not match.", "error");
      return;
    }
    if (password.length < 6) {
      toast("Password must be at least 6 characters.", "error");
      return;
    }
    if (!token) {
      toast("Missing reset token. Please use the link from your email.", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
      toast("Password updated! Redirecting to login…", "success");
      setTimeout(() => navigate("/login"), 2200);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Reset failed. The link may have expired.";
      toast(detail, "error");
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
        position: "absolute", width: "600px", height: "600px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
        top: "-200px", right: "-100px", pointerEvents: "none",
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

        {!done ? (
          <>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 0.375rem", letterSpacing: "-0.03em" }}>
              Set new password
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.9375rem", marginBottom: "1.75rem" }}>
              Choose a strong password for your account.
            </p>

            <div style={{
              background: "rgba(15,20,40,0.8)", border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "16px", padding: "2rem",
              backdropFilter: "blur(20px)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 20px 60px rgba(0,0,0,0.4)",
            }}>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                <div>
                  <InputField
                    label="New password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    showToggle
                    showPass={showPass}
                    onToggle={() => setShowPass(!showPass)}
                  />
                  {/* Strength meter */}
                  {password && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                        {[1, 2, 3, 4].map((n) => (
                          <div key={n} style={{
                            flex: 1, height: "3px", borderRadius: "2px",
                            background: n <= strength.level ? strength.color : "rgba(255,255,255,0.08)",
                            transition: "background 0.3s ease",
                          }} />
                        ))}
                      </div>
                      <span style={{ fontSize: "0.75rem", color: strength.color }}>{strength.label}</span>
                    </div>
                  )}
                </div>

                <InputField
                  label="Confirm new password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
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
                  {loading ? "Updating…" : "Update password"}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{
            background: "rgba(15,20,40,0.8)", border: "1px solid rgba(52,211,153,0.3)",
            borderRadius: "16px", padding: "2.5rem", textAlign: "center",
            backdropFilter: "blur(20px)",
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
              Password updated!
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Redirecting you to sign in…
            </p>
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

// ── Helpers ────────────────────────────────────────────────────

function passwordStrength(password) {
  if (!password) return { level: 0, label: "", color: "#475569" };
  let score = 0;
  if (password.length >= 6)          score++;
  if (/[A-Z]/.test(password))        score++;
  if (/[0-9]/.test(password))        score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { level: 1, label: "Weak",   color: "#f87171" },
    { level: 2, label: "Fair",   color: "#fb923c" },
    { level: 3, label: "Good",   color: "#facc15" },
    { level: 4, label: "Strong", color: "#34d399" },
  ];
  return levels[score - 1] || levels[0];
}

function InputField({ label, type, value, onChange, placeholder, showToggle, showPass, onToggle }) {
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
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
        {showToggle && (
          <button type="button" onClick={onToggle} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#475569", padding: "0 0.75rem",
            display: "flex", alignItems: "center",
          }}>
            {showPass
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        )}
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
