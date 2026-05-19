import React, { useState } from "react";
import { useToast } from "./App";

function Signup({ goToLogin }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", college: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const addToast = useToast();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const getStrength = (pw) => {
    if (!pw) return { level: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 6) score++; if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++; if (/[0-9]/.test(pw)) score++; if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 20, label: "Weak", color: "#EF4444" };
    if (score <= 2) return { level: 40, label: "Fair", color: "#F59E0B" };
    if (score <= 3) return { level: 60, label: "Good", color: "#3B82F6" };
    if (score <= 4) return { level: 80, label: "Strong", color: "#10B981" };
    return { level: 100, label: "Excellent", color: "#059669" };
  };
  const strength = getStrength(form.password);

  const signup = async (e) => {
    e.preventDefault(); setError("");
    if (!form.name || !form.email || !form.password) { setError("Name, email, and password are required"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (json.success) { addToast("Account created! Please sign in.", "success"); goToLogin(); }
      else setError(json.message || "Signup failed");
    } catch { setError("Cannot connect to server"); }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎓</div>
        <h2>Create Account</h2>
        <p className="subtitle">Start your internship journey today</p>
        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171", padding: "0.6rem 1rem", borderRadius: "8px", fontSize: "0.88rem", marginBottom: "1rem" }}>{error}</div>}
        <form onSubmit={signup}>
          <input className="input-field" name="name" placeholder="Full Name *" value={form.name} onChange={handleChange} />
          <input className="input-field" name="email" type="email" placeholder="Email Address *" value={form.email} onChange={handleChange} />
          <input className="input-field" name="password" type="password" placeholder="Password * (min 6 chars)" value={form.password} onChange={handleChange} />
          {form.password && (
            <div style={{ marginBottom: "0.85rem" }}>
              <div style={{ height: "4px", background: "var(--bg-surface)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: `${strength.level}%`, height: "100%", background: strength.color, transition: "all 0.3s" }} />
              </div>
              <span style={{ fontSize: "0.75rem", color: strength.color }}>{strength.label}</span>
            </div>
          )}
          <input className="input-field" name="phone" placeholder="Phone (optional)" value={form.phone} onChange={handleChange} />
          <input className="input-field" name="college" placeholder="College / University (optional)" value={form.college} onChange={handleChange} />
          <button className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
        <div className="auth-divider">or</div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Already have an account? <span style={{ color: "var(--primary)", cursor: "pointer", fontWeight: "600" }} onClick={goToLogin}>Sign in</span>
        </p>
      </div>
    </div>
  );
}
export default Signup;