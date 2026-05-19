import React, { useState } from "react";
import { useToast } from "./App";

function CompanySignup({ goToLogin }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", industry: "", website: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const addToast = useToast();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const signup = async (e) => {
    e.preventDefault(); setError("");
    if (!form.name || !form.email || !form.password) { setError("Company name, email, and password are required"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/company-signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (json.success) { addToast("Company registered! Please sign in.", "success"); goToLogin(); }
      else setError(json.message || "Registration failed");
    } catch { setError("Cannot connect to server"); }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card" style={{ maxWidth: "460px" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏗️</div>
        <h2>Register Company</h2>
        <p className="subtitle">Post internships and find great talent</p>
        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171", padding: "0.6rem 1rem", borderRadius: "8px", fontSize: "0.88rem", marginBottom: "1rem" }}>{error}</div>}
        <form onSubmit={signup}>
          <input className="input-field" name="name" placeholder="Company Name *" value={form.name} onChange={handleChange} />
          <input className="input-field" name="email" type="email" placeholder="Work Email *" value={form.email} onChange={handleChange} />
          <input className="input-field" name="password" type="password" placeholder="Password * (min 6 chars)" value={form.password} onChange={handleChange} />
          <input className="input-field" name="industry" placeholder="Industry (e.g. Technology, Finance)" value={form.industry} onChange={handleChange} />
          <input className="input-field" name="website" placeholder="Website URL (optional)" value={form.website} onChange={handleChange} />
          <textarea className="input-field" name="description" placeholder="Brief company description (optional)" rows="3" value={form.description} onChange={handleChange} />
          <button className="btn btn-success" style={{ width: "100%", marginTop: "0.5rem" }} disabled={loading}>
            {loading ? "Registering..." : "Register Company"}
          </button>
        </form>
        <div className="auth-divider">or</div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Already registered? <span style={{ color: "var(--accent)", cursor: "pointer", fontWeight: "600" }} onClick={goToLogin}>Sign in</span>
        </p>
      </div>
    </div>
  );
}
export default CompanySignup;
