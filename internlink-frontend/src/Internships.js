import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "./App";

function Internships({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [jobType, setJobType] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [sort, setSort] = useState("newest");
  const [categories, setCategories] = useState([]);
  const [appliedIds, setAppliedIds] = useState([]);
  const [bookmarkIds, setBookmarkIds] = useState([]);
  const addToast = useToast();

  const fetchInternships = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (jobType) params.set("jobType", jobType);
    if (paymentType) params.set("paymentType", paymentType);
    if (sort) params.set("sort", sort);
    fetch(`http://localhost:5000/internships?${params}`)
      .then(r => r.json())
      .then(res => { if (res.success) setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, category, jobType, paymentType, sort]);

  useEffect(() => { fetchInternships(); }, [fetchInternships]);

  useEffect(() => {
    fetch("http://localhost:5000/categories").then(r => r.json()).then(res => { if (res.success) setCategories(res.data); }).catch(() => {});
    if (user) {
      fetch(`http://localhost:5000/user-applied-ids/${user.UserID}`).then(r => r.json()).then(res => { if (res.success) setAppliedIds(res.data); }).catch(() => {});
      fetch(`http://localhost:5000/bookmark-ids/${user.UserID}`).then(r => r.json()).then(res => { if (res.success) setBookmarkIds(res.data); }).catch(() => {});
    }
  }, [user]);

  // Real-time refresh
  useEffect(() => {
    const interval = setInterval(fetchInternships, 15000);
    return () => clearInterval(interval);
  }, [fetchInternships]);

  const apply = async (id) => {
    try {
      const res = await fetch("http://localhost:5000/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.UserID, internshipId: id })
      });
      const json = await res.json();
      if (json.success) { addToast("Application submitted!", "success"); setAppliedIds([...appliedIds, id]); }
      else addToast(json.message, "error");
    } catch { addToast("Failed to apply", "error"); }
  };

  const toggleBookmark = async (id) => {
    const isBookmarked = bookmarkIds.includes(id);
    try {
      if (isBookmarked) {
        await fetch(`http://localhost:5000/bookmark/${user.UserID}/${id}`, { method: "DELETE" });
        setBookmarkIds(bookmarkIds.filter(b => b !== id));
        addToast("Bookmark removed", "info");
      } else {
        await fetch("http://localhost:5000/bookmark", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.UserID, internshipId: id })
        });
        setBookmarkIds([...bookmarkIds, id]);
        addToast("Internship saved!", "success");
      }
    } catch { addToast("Failed to update bookmark", "error"); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Explore Internships</h2>
        <p>Discover opportunities that match your skills</p>
      </div>

      <div className="filter-bar">
        <input className="input-field" placeholder="🔍 Search by title, company..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input-field" value={jobType} onChange={e => setJobType(e.target.value)}>
          <option value="">All Types</option>
          <option value="Onsite">Onsite</option>
          <option value="WFH">Work from Home</option>
          <option value="Hybrid">Hybrid</option>
        </select>
        <select className="input-field" value={paymentType} onChange={e => setPaymentType(e.target.value)}>
          <option value="">All</option>
          <option value="Paid">Paid</option>
          <option value="Unpaid">Unpaid</option>
        </select>
        <select className="input-field" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="stipend_high">Stipend: High→Low</option>
          <option value="stipend_low">Stipend: Low→High</option>
        </select>
      </div>

      {loading ? (
        <div className="grid-cards">{[1,2,3,4,5,6].map(i => <div key={i} className="skeleton skeleton-card" />)}</div>
      ) : data.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🔍</div><h3>No internships found</h3><p>Try adjusting your filters</p></div>
      ) : (
        <div className="grid-cards">
          {data.map(item => {
            const hasApplied = appliedIds.includes(item.InternshipID);
            const isBookmarked = bookmarkIds.includes(item.InternshipID);
            return (
              <div key={item.InternshipID} className="card intern-card">
                {hasApplied ? (
                  <span className="applied-badge">✓ Applied</span>
                ) : (
                  <button className={`bookmark-btn ${isBookmarked ? "active" : ""}`} onClick={() => toggleBookmark(item.InternshipID)}>
                    {isBookmarked ? "💜" : "🤍"}
                  </button>
                )}
                <div className="intern-company">{item.CompanyName || "Company"}</div>
                <h4 style={{ color: "var(--text-bright)", marginBottom: "0.5rem" }}>{item.Title}</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.2rem 0 0.5rem" }}>📍 {item.Location || "Remote"}</p>
                <div className="intern-meta">
                  <span className="badge badge-blue">₹{item.Stipend?.toLocaleString() || 0}/mo</span>
                  <span className="badge badge-green">{item.PaymentType || "Paid"}</span>
                  <span className="badge badge-orange">{item.JobType || "Onsite"}</span>
                  {item.Duration && <span className="badge badge-purple">{item.Duration}</span>}
                </div>
                <p className="intern-desc">{item.Description || "No description provided."}</p>
                {item.Skills && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    {item.Skills.split(",").map((s, i) => <span key={i} className="skill-tag">{s.trim()}</span>)}
                  </div>
                )}
                <div className="intern-footer">
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => apply(item.InternshipID)} disabled={hasApplied}>
                    {hasApplied ? "✓ Applied" : "Apply Now"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default Internships;