import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: "⚡",
      title: "Blazing fast responses",
      desc: "Get answers in milliseconds. Powered by state-of-the-art language models.",
    },
    {
      icon: "💬",
      title: "Natural conversations",
      desc: "bot naturally with context-aware AI that remembers your conversation.",
    },
    {
      icon: "🔒",
      title: "Private & secure",
      desc: "Your conversations are encrypted and never shared with third parties.",
    },
    {
      icon: "📱",
      title: "Works everywhere",
      desc: "Fully responsive — chat on desktop, tablet, or mobile seamlessly.",
    },
    {
      icon: "🧠",
      title: "Deep knowledge",
      desc: "From coding to creative writing, get expert-level help on any topic.",
    },
    {
      icon: "🗂️",
      title: "Chat history",
      desc: "Persistent sessions so you can pick up where you left off anytime.",
    },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#080b14",
      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
      color: "#e2e8f0", overflow: "hidden",
    }}>
      {/* Gradient orbs */}
      <div style={{
        position: "fixed", width: "800px", height: "800px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
        top: "-300px", left: "-200px", pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", width: "600px", height: "600px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
        bottom: "0", right: "-100px", pointerEvents: "none",
      }} />

      {/* Navbar */}
      <nav style={{
        height: "64px", display: "flex", alignItems: "center",
        padding: "0 2rem", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,11,20,0.8)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(99,102,241,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span style={{ fontSize: "1rem", fontWeight: 600, color: "#f1f5f9" }}>DoctorEase</span>
        </div>
        <div style={{ display: "flex", gap: "0.625rem" }}>
          <button onClick={() => navigate("/login")} style={{
            padding: "0.5rem 1.125rem",
            background: "transparent",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "8px", color: "#94a3b8",
            fontSize: "0.875rem", cursor: "pointer",
            transition: "all 0.2s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; e.currentTarget.style.color = "#c7d2fe"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            Sign in
          </button>
          <button onClick={() => navigate("/register")} style={{
            padding: "0.5rem 1.125rem",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none", borderRadius: "8px", color: "white",
            fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
            boxShadow: "0 2px 12px rgba(99,102,241,0.4)",
            transition: "all 0.2s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            Get started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        maxWidth: "900px", margin: "0 auto",
        padding: "6rem 2rem 5rem",
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          padding: "0.375rem 1rem",
          background: "rgba(99,102,241,0.1)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: "20px",
          fontSize: "0.8125rem", color: "#a5b4fc",
          marginBottom: "2rem",
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#818cf8", display: "inline-block" }} />
          Now with persistent conversation memory
        </div>

        <h1 style={{
          fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
          fontWeight: 800, color: "#f1f5f9",
          letterSpacing: "-0.04em", lineHeight: 1.15,
          margin: "0 0 1.25rem",
        }}>
          AI conversations that{" "}
          <span style={{
            background: "linear-gradient(135deg, #818cf8, #c084fc)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            actually help
          </span>
        </h1>

        <p style={{
          fontSize: "1.125rem", color: "#64748b", lineHeight: 1.7,
          maxWidth: "560px", margin: "0 auto 2.5rem",
        }}>
          Chat with a powerful AI assistant that understands context, remembers your conversations, and helps you get things done faster.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "0.875rem", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/register")} style={{
            padding: "0.8rem 2rem",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none", borderRadius: "10px", color: "white",
            fontSize: "1rem", fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 24px rgba(99,102,241,0.5)",
            transition: "all 0.2s",
            display: "flex", alignItems: "center", gap: "0.5rem",
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            Start for free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
          <button onClick={() => navigate("/login")} style={{
            padding: "0.8rem 2rem",
            background: "transparent",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "10px", color: "#94a3b8",
            fontSize: "1rem", cursor: "pointer",
            transition: "all 0.2s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; e.currentTarget.style.color = "#c7d2fe"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            Sign in
          </button>
        </div>
      </section>

      {/* Chat preview */}
      <section style={{ maxWidth: "800px", margin: "0 auto", padding: "0 2rem 5rem" }}>
        <div style={{
          background: "rgba(15,20,40,0.8)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "16px", overflow: "hidden",
          boxShadow: "0 0 80px rgba(99,102,241,0.15)",
        }}>
          {/* Window chrome */}
          <div style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid rgba(99,102,241,0.1)",
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(8,11,20,0.5)",
          }}>
            {["#f87171", "#facc15", "#34d399"].map((c, i) => (
              <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />
            ))}
            <div style={{ flex: 1, textAlign: "center", fontSize: "0.75rem", color: "#334155" }}>
              DoctorEase — New conversation
            </div>
          </div>
          {/* Fake messages */}
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { role: "user", text: "Can you explain how neural networks work?" },
              { role: "ai", text: "Neural networks are computing systems loosely inspired by biological neural networks. They consist of layers of interconnected nodes (neurons) that process data and learn patterns through training. Each connection has a weight that gets adjusted during training to minimize errors. Would you like me to go deeper on any specific aspect?" },
              { role: "user", text: "Yes! How does backpropagation work?" },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "ai" && (
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%", marginRight: "0.625rem",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.7rem", flexShrink: 0,
                  }}>🤖</div>
                )}
                <div style={{
                  maxWidth: "70%", padding: "0.625rem 0.875rem",
                  borderRadius: m.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                  background: m.role === "user"
                    ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                    : "rgba(255,255,255,0.04)",
                  border: m.role === "user" ? "none" : "1px solid rgba(99,102,241,0.12)",
                  color: m.role === "user" ? "white" : "#94a3b8",
                  fontSize: "0.875rem", lineHeight: 1.6,
                }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: "960px", margin: "0 auto", padding: "0 2rem 6rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>
            Everything you need
          </h2>
          <p style={{ color: "#64748b", fontSize: "1rem", maxWidth: "400px", margin: "0 auto" }}>
            Built for people who want real help, not just a demo.
          </p>
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem",
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              padding: "1.5rem",
              background: "rgba(15,20,40,0.6)",
              border: "1px solid rgba(99,102,241,0.12)",
              borderRadius: "14px",
              transition: "all 0.25s",
              cursor: "default",
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)";
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.12)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>{f.icon}</div>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#f1f5f9", marginBottom: "0.375rem" }}>{f.title}</h3>
              <p style={{ fontSize: "0.875rem", color: "#475569", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        maxWidth: "700px", margin: "0 auto", padding: "0 2rem 6rem",
        textAlign: "center",
      }}>
        <div style={{
          padding: "3rem 2rem",
          background: "rgba(15,20,40,0.6)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "20px",
          boxShadow: "0 0 80px rgba(99,102,241,0.1)",
        }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>
            Ready to get started?
          </h2>
          <p style={{ color: "#64748b", marginBottom: "2rem" }}>
            Create a free account and start chatting in seconds.
          </p>
          <button onClick={() => navigate("/register")} style={{
            padding: "0.875rem 2.5rem",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none", borderRadius: "10px", color: "white",
            fontSize: "1rem", fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 24px rgba(99,102,241,0.5)",
            transition: "all 0.2s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            Create free account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid rgba(99,102,241,0.1)",
        padding: "1.5rem 2rem",
        textAlign: "center",
        color: "#1e293b",
        fontSize: "0.8rem",
      }}>
        © {new Date().getFullYear()} DoctorEase — Built with ❤️
      </footer>
    </div>
  );
}