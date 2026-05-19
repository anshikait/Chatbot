import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../components/Toast";

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast("Passwords do not match", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/register", {
        username: form.username,
        email: form.email,
        password: form.password,
      });
      toast("Account created! Please log in.", "success");
      navigate("/login");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Registration failed. Please try again.";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength(form.password);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#080b14", padding: "2rem 1rem",
      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glows */}
      <div style={{
        position: "absolute", width: "700px", height: "700px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
        top: "-300px", right: "-200px", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: "500px", height: "500px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
        bottom: "-200px", left: "-100px", pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "460px", position: "relative" }}>
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
          <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#e2e8f0", letterSpacing: "-0.01em" }}>
            Chatbot AI
          </span>
        </div>

        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 0.375rem", letterSpacing: "-0.03em" }}>
          Create your account
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.9375rem", marginBottom: "1.75rem" }}>
          Start chatting with AI in under a minute
        </p>

        <div style={{
          background: "rgba(15,20,40,0.8)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "16px", padding: "2rem",
          backdropFilter: "blur(20px)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 20px 60px rgba(0,0,0,0.4)",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <InputField label="Username" type="text" value={form.username} onChange={set("username")}
              placeholder="johndoe" icon={<UserIcon />} />
            <InputField label="Email address" type="email" value={form.email} onChange={set("email")}
              placeholder="you@example.com" icon={<EmailIcon />} />

            <div>
              <InputField label="Password" type={showPass ? "text" : "password"} value={form.password}
                onChange={set("password")} placeholder="Min. 8 characters" icon={<LockIcon />}
                rightSlot={
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    background: "none", border: "none", cursor: "pointer", color: "#475569",
                    padding: "0 0.25rem", display: "flex", alignItems: "center",
                  }}>
                    {showPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
              />
              {form.password && (
                <div style={{ marginTop: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} style={{
                        flex: 1, height: "3px", borderRadius: "2px",
                        background: n <= strength.level
                          ? strength.color
                          : "rgba(255,255,255,0.08)",
                        transition: "background 0.3s ease",
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            <InputField label="Confirm password" type="password" value={form.confirm}
              onChange={set("confirm")} placeholder="Re-enter password" icon={<LockIcon />} />

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "0.5rem", padding: "0.75rem",
                background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none", borderRadius: "10px", color: "white",
                fontSize: "0.9375rem", fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                transition: "all 0.2s ease",
                boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
              }}
              onMouseEnter={(e) => { if (!loading) e.target.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.target.style.transform = "translateY(0)"; }}
            >
              {loading ? <Spinner /> : null}
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "#475569", fontSize: "0.875rem", marginTop: "1.5rem" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function passwordStrength(password) {
  if (!password) return { level: 0, label: "", color: "#475569" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { level: 1, label: "Weak", color: "#f87171" },
    { level: 2, label: "Fair", color: "#fb923c" },
    { level: 3, label: "Good", color: "#facc15" },
    { level: 4, label: "Strong", color: "#34d399" },
  ];
  return levels[score - 1] || levels[0];
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
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} required
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
      borderTop: "2px solid white",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
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