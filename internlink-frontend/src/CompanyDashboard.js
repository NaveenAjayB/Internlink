import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "./App";

function CompanyDashboard({ company }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [apps, setApps] = useState([]);
  const [internships, setInternships] = useState([]);
  const [stats, setStats] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: "", location: "", category: "", duration: "", stipend: 0, paymentType: "Paid", jobType: "Onsite", description: "", skills: "", openings: 1, deadline: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const addToast = useToast();

  const fetchData = useCallback(() => {
    if (!company) return;
    fetch(`http://localhost:5000/company-applications/${company.CompanyID}`)
      .then(r => r.json()).then(res => { if (res.success) setApps(res.data); }).catch(() => {});
    fetch(`http://localhost:5000/company-internships/${company.CompanyID}`)
      .then(r => r.json()).then(res => { if (res.success) setInternships(res.data); }).catch(() => {});
    fetch(`http://localhost:5000/company-stats/${company.CompanyID}`)
      .then(r => r.json()).then(res => { if (res.success) setStats(res.data); }).catch(() => {});
  }, [company]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, [fetchData]);

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch("http://localhost:5000/update-status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: id, status })
      });
      const json = await res.json();
      if (json.success) {
        setApps(apps.map(a => a.ApplicationID === id ? { ...a, Status: status } : a));
        addToast(`Application ${status.toLowerCase()}`, "success");
      }
    } catch { addToast("Failed to update", "error"); }
  };

  const markSeen = async (id) => {
    await fetch("http://localhost:5000/mark-seen", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "company", applicationId: id })
    });
    setApps(apps.map(a => a.ApplicationID === id ? { ...a, CompanySeen: 1 } : a));
  };

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ title: "", location: "", category: "", duration: "", stipend: 0, paymentType: "Paid", jobType: "Onsite", description: "", skills: "", openings: 1, deadline: "" });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.InternshipID);
    setFormData({
      title: item.Title, location: item.Location || "", category: item.Category || "", duration: item.Duration || "",
      stipend: item.Stipend || 0, paymentType: item.PaymentType || "Paid", jobType: item.JobType || "Onsite",
      description: item.Description || "", skills: item.Skills || "", openings: item.Openings || 1,
      deadline: item.Deadline ? item.Deadline.split("T")[0] : ""
    });
    setShowModal(true);
  };

  const saveInternship = async (e) => {
    e.preventDefault();
    const url = editingId ? `http://localhost:5000/update-internship/${editingId}` : "http://localhost:5000/add-internship";
    const method = editingId ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, companyId: company.CompanyID })
      });
      const json = await res.json();
      if (json.success) {
        addToast(editingId ? "Internship updated!" : "Internship posted!", "success");
        setShowModal(false); fetchData();
      } else addToast(json.message, "error");
    } catch { addToast("Failed to save", "error"); }
  };

  const deleteInternship = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/delete-internship/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { addToast("Internship deleted", "info"); fetchData(); }
      else addToast(json.message, "error");
    } catch { addToast("Failed to delete", "error"); }
    setConfirmDelete(null);
  };

  const unreadCount = apps.filter(a => !a.CompanySeen).length;

  return (
    <div className="fade-in">
      {/* TABS */}
      <div className="tabs" style={{ marginBottom: "2rem" }}>
        {[
          { key: "overview", label: "📊 Overview" },
          { key: "applications", label: "📋 Applications", badge: unreadCount },
          { key: "manage", label: "📝 Internships" },
        ].map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
            {t.badge > 0 && <span className="tab-badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ====== OVERVIEW ====== */}
      {activeTab === "overview" && (
        <div>
          <div className="page-header"><h2>Dashboard Overview</h2><p>Real-time analytics for your company</p></div>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon purple">📋</div><div className="stat-info"><h4>{stats.totalInternships || 0}</h4><p>Total Postings</p></div></div>
            <div className="stat-card"><div className="stat-icon green">✅</div><div className="stat-info"><h4>{stats.activeInternships || 0}</h4><p>Active</p></div></div>
            <div className="stat-card"><div className="stat-icon blue">👥</div><div className="stat-info"><h4>{stats.totalApplications || 0}</h4><p>Applications</p></div></div>
            <div className="stat-card"><div className="stat-icon orange">⏳</div><div className="stat-info"><h4>{stats.pending || 0}</h4><p>Pending Review</p></div></div>
            <div className="stat-card"><div className="stat-icon green">🎉</div><div className="stat-info"><h4>{stats.accepted || 0}</h4><p>Accepted</p></div></div>
            <div className="stat-card"><div className="stat-icon red">🔔</div><div className="stat-info"><h4>{stats.unread || 0}</h4><p>Unread</p></div></div>
          </div>
          {/* Recent applications */}
          <h3 style={{ marginBottom: "1rem" }}>Recent Applications</h3>
          {apps.slice(0, 5).map(item => (
            <div key={item.ApplicationID} className={`card app-row ${!item.CompanySeen ? "unread" : ""}`} style={{ marginBottom: "0.5rem" }}>
              <div className="app-info" style={{ flex: 1 }}>
                <h4>{item.Name}</h4>
                <p>{item.Title} • {item.Email}</p>
              </div>
              <span className={`status-badge status-${item.Status.toLowerCase()}`}>{item.Status}</span>
            </div>
          ))}
        </div>
      )}

      {/* ====== APPLICATIONS ====== */}
      {activeTab === "applications" && (
        <div>
          <div className="page-header"><h2>Review Applications</h2><p>{apps.length} total applications received</p></div>
          {apps.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📋</div><h3>No applications yet</h3><p>Applications will appear here when students apply</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {apps.map(item => (
                <div key={item.ApplicationID} className={`card app-row ${!item.CompanySeen ? "unread" : ""}`} onClick={() => !item.CompanySeen && markSeen(item.ApplicationID)}>
                  <div className="app-info" style={{ flex: 1 }}>
                    <h4>{item.Name}</h4>
                    <p>{item.Title} • {item.Email}{item.College ? ` • ${item.College}` : ""}</p>
                    {item.Skills && <div style={{ marginTop: "0.4rem" }}>{item.Skills.split(",").slice(0, 4).map((s, i) => <span key={i} className="skill-tag">{s.trim()}</span>)}</div>}
                  </div>
                  <div className="app-actions">
                    <span className={`status-badge status-${item.Status.toLowerCase()}`}>{item.Status}</span>
                    {item.Status !== "Accepted" && item.Status !== "Rejected" && item.Status !== "Withdrawn" && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={e => { e.stopPropagation(); updateStatus(item.ApplicationID, "Accepted"); }}>Accept</button>
                        <button className="btn btn-outline btn-sm" onClick={e => { e.stopPropagation(); updateStatus(item.ApplicationID, "Shortlisted"); }}>Shortlist</button>
                        <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); updateStatus(item.ApplicationID, "Rejected"); }}>Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====== MANAGE INTERNSHIPS ====== */}
      {activeTab === "manage" && (
        <div>
          <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div><h2>Manage Internships</h2><p>{internships.length} internship{internships.length !== 1 ? "s" : ""} posted</p></div>
            <button className="btn btn-primary" onClick={openAddModal}>+ Post New</button>
          </div>
          {internships.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📝</div><h3>No internships posted</h3><p>Create your first internship posting</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {internships.map(item => (
                <div key={item.InternshipID} className="card" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: "1.2rem 1.5rem" }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ marginBottom: "0.3rem" }}>{item.Title}</h4>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      📍 {item.Location || "—"} • 💰 ₹{item.Stipend?.toLocaleString()}/mo • 👥 {item.ApplicationCount || 0} application{(item.ApplicationCount || 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEditModal(item)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(item.InternshipID)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====== ADD/EDIT MODAL ====== */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editingId ? "Edit Internship" : "Post New Internship"}</h3>
            <form onSubmit={saveInternship}>
              <input className="input-field" name="title" placeholder="Job Title *" value={formData.title} onChange={handleInputChange} required />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <input className="input-field" name="location" placeholder="Location" value={formData.location} onChange={handleInputChange} />
                <input className="input-field" name="category" placeholder="Category" value={formData.category} onChange={handleInputChange} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <input className="input-field" name="duration" placeholder="Duration" value={formData.duration} onChange={handleInputChange} />
                <input className="input-field" name="stipend" type="number" placeholder="Stipend" value={formData.stipend} onChange={handleInputChange} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                <select className="input-field" name="paymentType" value={formData.paymentType} onChange={handleInputChange}>
                  <option value="Paid">Paid</option><option value="Unpaid">Unpaid</option>
                </select>
                <select className="input-field" name="jobType" value={formData.jobType} onChange={handleInputChange}>
                  <option value="Onsite">Onsite</option><option value="WFH">WFH</option><option value="Hybrid">Hybrid</option>
                </select>
                <input className="input-field" name="openings" type="number" placeholder="Openings" value={formData.openings} onChange={handleInputChange} min="1" />
              </div>
              <input className="input-field" name="skills" placeholder="Required Skills (comma-separated)" value={formData.skills} onChange={handleInputChange} />
              <input className="input-field" name="deadline" type="date" value={formData.deadline} onChange={handleInputChange} />
              <textarea className="input-field" name="description" placeholder="Job Description" rows="4" value={formData.description} onChange={handleInputChange} />
              <div className="modal-actions">
                <button className="btn btn-ghost" type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit">{editingId ? "Update" : "Post Internship"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== DELETE CONFIRM ====== */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⚠️</div>
            <h3>Delete Internship?</h3>
            <p style={{ margin: "0.75rem 0 1.5rem" }}>This will permanently delete this internship and all associated applications. This cannot be undone.</p>
            <div className="modal-actions" style={{ justifyContent: "center" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deleteInternship(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default CompanyDashboard;