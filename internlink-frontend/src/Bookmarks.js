import React, { useEffect, useState } from "react";
import { useToast } from "./App";

function Bookmarks({ user }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedIds, setAppliedIds] = useState([]);
  const addToast = useToast();

  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:5000/bookmarks/${user.UserID}`)
      .then(r => r.json())
      .then(res => { if (res.success) setBookmarks(res.data); setLoading(false); })
      .catch(() => setLoading(false));
    fetch(`http://localhost:5000/user-applied-ids/${user.UserID}`)
      .then(r => r.json())
      .then(res => { if (res.success) setAppliedIds(res.data); })
      .catch(() => {});
  }, [user]);

  const removeBookmark = async (internshipId) => {
    try {
      await fetch(`http://localhost:5000/bookmark/${user.UserID}/${internshipId}`, { method: "DELETE" });
      setBookmarks(bookmarks.filter(b => b.InternshipID !== internshipId));
      addToast("Bookmark removed", "info");
    } catch { addToast("Failed to remove", "error"); }
  };

  const apply = async (internshipId) => {
    try {
      const res = await fetch("http://localhost:5000/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.UserID, internshipId })
      });
      const json = await res.json();
      if (json.success) { setAppliedIds([...appliedIds, internshipId]); addToast("Applied successfully!", "success"); }
      else addToast(json.message, "error");
    } catch { addToast("Failed to apply", "error"); }
  };

  if (loading) return (
    <div className="fade-in">
      <div className="page-header"><h2>Saved Internships</h2></div>
      <div className="grid-cards">{[1,2,3].map(i => <div key={i} className="skeleton skeleton-card" />)}</div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header"><h2>Saved Internships</h2><p>{bookmarks.length} saved internship{bookmarks.length !== 1 ? "s" : ""}</p></div>

      {bookmarks.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">💜</div><h3>No saved internships</h3><p>Bookmark internships you're interested in to find them later</p></div>
      ) : (
        <div className="grid-cards">
          {bookmarks.map(item => {
            const hasApplied = appliedIds.includes(item.InternshipID);
            return (
              <div key={item.BookmarkID} className="card intern-card">
                <button className="bookmark-btn active" onClick={() => removeBookmark(item.InternshipID)}>💜</button>
                <div className="intern-company">{item.CompanyName}</div>
                <h4 style={{ color: "var(--text-bright)", marginBottom: "0.5rem" }}>{item.Title}</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.2rem 0 0.5rem" }}>📍 {item.Location || "Remote"}</p>
                <div className="intern-meta">
                  <span className="badge badge-blue">₹{item.Stipend?.toLocaleString() || 0}/mo</span>
                  <span className="badge badge-green">{item.PaymentType}</span>
                  <span className="badge badge-orange">{item.JobType}</span>
                </div>
                <p className="intern-desc">{item.Description || "No description"}</p>
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
export default Bookmarks;
