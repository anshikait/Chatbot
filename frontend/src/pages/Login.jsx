import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../components/Toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);
      const { data } = await api.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      localStorage.setItem("token", data.access_token);
      toast("Welcome back!", "success");
      navigate("/chat");
    } catch (err) {
      console.error(err);
      const detail = err?.response?.data?.detail || "Invalid email or password.";
      toast(detail, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", background: "#080b14",
      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
      overflow: "hidden", position: "relative",
    }}>
      {/* Ambient glows */}
      <div style={{
        position: "absolute", width: "600px", height: "600px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
        top: "-200px", left: "-100px", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: "500px", height: "500px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
        bottom: "-150px", right: "20%", pointerEvents: "none",
      }} />

      {/* Left decorative panel */}
      <div className="login-left-panel" style={{
        flex: 1, display: "none", flexDirection: "column", justifyContent: "center",
        alignItems: "center", padding: "3rem",
        borderRight: "1px solid rgba(99,102,241,0.15)",
      }}>
        <LeftPanel />
      </div>

      {/* Right form panel */}
      <div style={{
        width: "100%", maxWidth: "480px", margin: "0 auto",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "2rem",
      }}>
        {/* Logo */}
        <div style={{ marginBottom: "2.5rem" }}>
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
            <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#e2e8f0", letterSpacing: "-0.01em" }}>
              Health AI
            </span>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 0.5rem", letterSpacing: "-0.03em" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "#64748b", margin: 0 }}>
            Sign in to continue your conversations
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: "rgba(15,20,40,0.8)",
          border: "1px solid rgba(99,102,241,0.2)",
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
              icon={<EmailIcon />}
            />
            <InputField
              label="Password"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<LockIcon />}
              rightSlot={
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#475569", padding: "0 0.25rem",
                  display: "flex", alignItems: "center",
                }}>
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />

            {/* ✅ Now links to the real Forgot Password page */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Link to="/forgot-password" style={{ fontSize: "0.8125rem", color: "#818cf8", textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.75rem",
                background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none", borderRadius: "10px", color: "white",
                fontSize: "0.9375rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
              }}
            >
              {loading ? <Spinner /> : null}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "#475569", fontSize: "0.875rem", marginTop: "1.5rem" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 500 }}>
            Create one free
          </Link>
        </p>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .login-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function LeftPanel() {
  const features = [
    { icon: "⚡", text: "Instant AI responses" },
    { icon: "🔒", text: "End-to-end encrypted" },
    { icon: "📁", text: "Persistent chat history" },
    { icon: "🎨", text: "Rich markdown rendering" },
  ];
  return (
    <div style={{ maxWidth: "400px", textAlign: "center" }}>
      <div style={{
        width: "80px", height: "80px", borderRadius: "20px", margin: "0 auto 2rem",
        background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))",
        border: "1px solid rgba(99,102,241,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem",
      }}>🤖</div>
      <h2 style={{ color: "#f1f5f9", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>
        Your AI companion
      </h2>
      <p style={{ color: "#64748b", lineHeight: 1.6, marginBottom: "2rem" }}>
        Have meaningful conversations, get instant answers, and boost your productivity.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "left" }}>
        {features.map((f, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "0.75rem 1rem",
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.12)", borderRadius: "10px",
          }}>
            <span style={{ fontSize: "1.1rem" }}>{f.icon}</span>
            <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>{f.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder, icon, rightSlot }) {
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
        borderRadius: "10px", transition: "border-color 0.2s ease",
        boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.15)" : "none",
      }}>
        <span style={{ paddingLeft: "0.875rem", color: "#475569", flexShrink: 0 }}>{icon}</span>
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          required
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            padding: "0.75rem 0.75rem", color: "#e2e8f0", fontSize: "0.9375rem",
          }}
        />
        {rightSlot}
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

const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
  </svg>
);
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
