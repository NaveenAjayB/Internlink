import React, { useState } from "react";
import { useToast } from "./App";

function Login({ setUser, goToSignup, goBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const addToast = useToast();

  const login = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (json.success && json.data) {
        addToast(`Welcome back, ${json.data.Name}!`, "success");
        setUser(json.data);
      } else {
        setError(json.message || "Invalid credentials");
      }
    } catch {
      setError("Cannot connect to server. Is the backend running?");
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👩‍🎓</div>
        <h2>Welcome Back</h2>
        <p className="subtitle">Sign in to your student account</p>
        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171", padding: "0.6rem 1rem", borderRadius: "8px", fontSize: "0.88rem", marginBottom: "1rem" }}>{error}</div>}
        <form onSubmit={login}>
          <input className="input-field" placeholder="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <div style={{ position: "relative" }}>
            <input className="input-field" type={showPw ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "12px", top: "12px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}>{showPw ? "Hide" : "Show"}</button>
          </div>
          <button className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div className="auth-divider">or</div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Don't have an account? <span style={{ color: "var(--primary)", cursor: "pointer", fontWeight: "600" }} onClick={goToSignup}>Create one</span>
        </p>
        <p onClick={goBack} style={{ color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem", marginTop: "0.8rem" }}>← Back to selection</p>
      </div>
    </div>
  );
}
export default Login;