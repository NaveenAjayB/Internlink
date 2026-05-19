import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "./App";

function MyApplications({ user }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const addToast = useToast();

  const fetchData = useCallback(() => {
    if (!user) return;
    fetch(`http://localhost:5000/my-applications/${user.UserID}`)
      .then(r => r.json())
      .then(res => { if (res.success) setApps(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time polling
  useEffect(() => {
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const withdraw = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/withdraw-application/${id}`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setApps(apps.map(a => a.ApplicationID === id ? { ...a, Status: "Withdrawn" } : a));
        addToast("Application withdrawn", "info");
      } else addToast(json.message, "error");
    } catch { addToast("Failed to withdraw", "error"); }
  };

  const markSeen = async (id) => {
    try {
      await fetch("http://localhost:5000/mark-seen", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", applicationId: id })
      });
      setApps(apps.map(a => a.ApplicationID === id ? { ...a, UserSeen: 1 } : a));
    } catch {}
  };

  const markAllSeen = async () => {
    try {
      await fetch("http://localhost:5000/mark-all-seen", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", userId: user.UserID })
      });
      setApps(apps.map(a => ({ ...a, UserSeen: 1 })));
      addToast("All notifications cleared", "info");
    } catch {}
  };

  const filtered = filter === "all" ? apps : apps.filter(a => a.Status === filter);
  const unreadCount = apps.filter(a => !a.UserSeen).length;

  const statusSteps = ["Applied", "Shortlisted", "Accepted"];
  const getStepIndex = (status) => {
    if (status === "Rejected" || status === "Withdrawn") return -1;
    return statusSteps.indexOf(status);
  };

  if (loading) return (
    <div className="fade-in">
      <div className="page-header"><h2>My Applications</h2></div>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, marginBottom: "0.75rem", borderRadius: 14 }} />)}
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div><h2>My Applications</h2><p>{apps.length} total application{apps.length !== 1 ? "s" : ""}</p></div>
        {unreadCount > 0 && (
          <button className="btn btn-outline btn-sm" onClick={markAllSeen}>
            🔔 Clear {unreadCount} notification{unreadCount > 1 ? "s" : ""}
          </button>
        )}
      </div>

      <div className="tabs">
        {[{ key: "all", label: "All" }, { key: "Applied", label: "Pending" }, { key: "Shortlisted", label: "Shortlisted" }, { key: "Accepted", label: "Accepted" }, { key: "Rejected", label: "Rejected" }].map(t => (
          <button key={t.key} className={`tab ${filter === t.key ? "active" : ""}`} onClick={() => setFilter(t.key)}>{t.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📋</div><h3>No applications found</h3><p>{filter === "all" ? "Start applying to internships!" : `No ${filter.toLowerCase()} applications`}</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map(item => {
            const stepIdx = getStepIndex(item.Status);
            return (
              <div key={item.ApplicationID} className={`card app-row ${!item.UserSeen ? "unread" : ""}`} onClick={() => !item.UserSeen && markSeen(item.ApplicationID)}>
                <div className="app-info" style={{ flex: 1 }}>
                  <h4>{item.Title}</h4>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    {item.CompanyName} • {item.Location} • Applied {new Date(item.AppliedDate).toLocaleDateString()}
                  </p>
                  {/* Status stepper */}
                  {item.Status !== "Rejected" && item.Status !== "Withdrawn" && (
                    <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.6rem", alignItems: "center" }}>
                      {statusSteps.map((step, i) => (
                        <React.Fragment key={step}>
                          <div style={{
                            width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.65rem", fontWeight: 700,
                            background: i <= stepIdx ? (step === "Accepted" ? "rgba(16,185,129,0.2)" : "rgba(99,102,241,0.2)") : "var(--bg-surface)",
                            color: i <= stepIdx ? (step === "Accepted" ? "#34D399" : "#6366F1") : "var(--text-muted)",
                            border: `2px solid ${i <= stepIdx ? (step === "Accepted" ? "#34D399" : "#6366F1") : "var(--border)"}`,
                          }}>
                            {i <= stepIdx ? "✓" : i + 1}
                          </div>
                          {i < statusSteps.length - 1 && (
                            <div style={{ flex: 1, height: 2, maxWidth: 40, background: i < stepIdx ? "var(--primary)" : "var(--border)" }} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
                <div className="app-actions">
                  <span className={`status-badge status-${item.Status.toLowerCase()}`}>{item.Status}</span>
                  {(item.Status === "Applied" || item.Status === "Shortlisted") && (
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={(e) => { e.stopPropagation(); withdraw(item.ApplicationID); }}>
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default MyApplications;