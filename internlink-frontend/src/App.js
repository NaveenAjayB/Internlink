import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import Login from "./Login";
import Signup from "./Signup";
import CompanyLogin from "./CompanyLogin";
import CompanySignup from "./CompanySignup";
import Internships from "./Internships";
import MyApplications from "./MyApplications";
import CompanyDashboard from "./CompanyDashboard";
import StudentProfile from "./StudentProfile";
import Bookmarks from "./Bookmarks";
import "./index.css";

/* ====== TOAST CONTEXT ====== */
const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);
  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"} {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ====== MAIN APP ====== */
function AppContent() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("internlink_user")); } catch { return null; }
  });
  const [company, setCompany] = useState(() => {
    try { return JSON.parse(localStorage.getItem("internlink_company")); } catch { return null; }
  });
  const [page, setPage] = useState("landing");
  const [activeTab, setActiveTab] = useState("explore");
  const [unreadCount, setUnreadCount] = useState(0);
  const addToast = useToast();

  // Persist auth
  useEffect(() => {
    if (user) localStorage.setItem("internlink_user", JSON.stringify(user));
    else localStorage.removeItem("internlink_user");
  }, [user]);
  useEffect(() => {
    if (company) localStorage.setItem("internlink_company", JSON.stringify(company));
    else localStorage.removeItem("internlink_company");
  }, [company]);

  // Real-time polling for notifications
  useEffect(() => {
    if (!user) return;
    const poll = () => {
      fetch(`http://localhost:5000/my-applications/${user.UserID}`)
        .then(r => r.json())
        .then(res => {
          if (res.success) setUnreadCount(res.data.filter(a => !a.UserSeen).length);
        }).catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    setUser(null); setCompany(null); setPage("landing"); setActiveTab("explore");
    addToast("Logged out successfully", "info");
  };

  const handleLogin = (userData) => { setUser(userData); setActiveTab("explore"); };
  const handleCompanyLogin = (companyData) => { setCompany(companyData); };

  /* ====== LANDING PAGE ====== */
  if (!user && !company && page === "landing") {
    return (
      <div className="auth-container">
        <div className="glass-panel auth-card">
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🚀</div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.3rem" }}>
            <span style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>InternLink</span>
          </h1>
          <p className="subtitle">Your gateway to amazing internship opportunities</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setPage("login")}>
              👩‍🎓 I am a Student
            </button>
            <button className="btn btn-outline" style={{ width: "100%" }} onClick={() => setPage("company")}>
              🏢 I am a Company
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ====== AUTH FLOWS ====== */
  if (!user && !company) {
    if (page === "login") return <Login setUser={handleLogin} goToSignup={() => setPage("signup")} goBack={() => setPage("landing")} />;
    if (page === "signup") return <Signup goToLogin={() => setPage("login")} />;
    if (page === "company") return <CompanyLogin setCompany={handleCompanyLogin} goToSignup={() => setPage("companySignup")} goBack={() => setPage("landing")} />;
    if (page === "companySignup") return <CompanySignup goToLogin={() => setPage("company")} />;
  }

  /* ====== STUDENT DASHBOARD ====== */
  if (user) {
    return (
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-brand">🚀 <span>InternLink</span></div>
          <div className="nav-right">
            <div className="nav-user">
              <div className="nav-avatar">{user.Name?.charAt(0).toUpperCase()}</div>
              <span>{user.Name}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
          </div>
        </nav>
        <div className="dashboard-layout">
          <aside className="sidebar">
            <div className="sidebar-item" style={{ padding: "0.5rem 1.5rem", marginBottom: "1rem", pointerEvents: "none" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)" }}>Dashboard</span>
            </div>
            {[
              { key: "explore", icon: "🔍", label: "Explore" },
              { key: "applications", icon: "📋", label: "My Applications", badge: unreadCount },
              { key: "bookmarks", icon: "💜", label: "Saved" },
              { key: "profile", icon: "👤", label: "Profile" },
            ].map(item => (
              <div key={item.key} className={`sidebar-item ${activeTab === item.key ? "active" : ""}`} onClick={() => setActiveTab(item.key)}>
                <span>{item.icon}</span> {item.label}
                {item.badge > 0 && <span className="sidebar-badge">{item.badge}</span>}
              </div>
            ))}
          </aside>
          <main className="main-content fade-in">
            {activeTab === "explore" && <Internships user={user} />}
            {activeTab === "applications" && <MyApplications user={user} />}
            {activeTab === "bookmarks" && <Bookmarks user={user} />}
            {activeTab === "profile" && <StudentProfile user={user} setUser={setUser} />}
          </main>
        </div>
      </div>
    );
  }

  /* ====== COMPANY DASHBOARD ====== */
  if (company) {
    return (
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-brand">🚀 <span>InternLink</span></div>
          <div className="nav-right">
            <div className="nav-user">
              <div className="nav-avatar" style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
                {(company.CompanyName || "C").charAt(0).toUpperCase()}
              </div>
              <span>{company.CompanyName || company.Name || "Company"}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
          </div>
        </nav>
        <div className="main-content fade-in" style={{ maxWidth: "1200px" }}>
          <CompanyDashboard company={company} />
        </div>
      </div>
    );
  }
  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}