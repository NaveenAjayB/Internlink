import React, { useEffect, useState } from "react";
import { useToast } from "./App";

function StudentProfile({ user, setUser }) {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const addToast = useToast();

  useEffect(() => {
    fetch(`http://localhost:5000/user-profile/${user.UserID}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setProfile(res.data);
          setForm({ name: res.data.Name, phone: res.data.Phone || "", college: res.data.College || "", skills: res.data.Skills || "", bio: res.data.Bio || "" });
        }
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/update-profile/${user.UserID}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (json.success) {
        setProfile({ ...profile, ...json.data });
        setUser({ ...user, Name: form.name });
        setEditing(false);
        addToast("Profile updated!", "success");
      } else addToast(json.message, "error");
    } catch { addToast("Failed to update", "error"); }
  };

  if (loading) return <div className="fade-in"><div className="page-header"><h2>Profile</h2></div>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 12, borderRadius: 8 }} />)}</div>;
  if (!profile) return <div className="empty-state"><div className="empty-icon">👤</div><h3>Profile not found</h3></div>;

  const stats = profile.stats || {};

  return (
    <div className="fade-in">
      <div className="page-header"><h2>My Profile</h2><p>Manage your account details</p></div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="profile-header">
          <div className="profile-avatar">{profile.Name?.charAt(0).toUpperCase()}</div>
          <div>
            <h3 style={{ marginBottom: "0.2rem" }}>{profile.Name}</h3>
            <p style={{ fontSize: "0.9rem" }}>{profile.Email}</p>
            {profile.College && <p style={{ fontSize: "0.85rem", color: "var(--primary)" }}>🎓 {profile.College}</p>}
          </div>
        </div>

        <div className="profile-stats">
          <div className="profile-stat"><h4>{stats.totalApplications || 0}</h4><p>Applications</p></div>
          <div className="profile-stat"><h4 style={{ color: "#34D399" }}>{stats.accepted || 0}</h4><p>Accepted</p></div>
          <div className="profile-stat"><h4 style={{ color: "#60A5FA" }}>{stats.shortlisted || 0}</h4><p>Shortlisted</p></div>
          <div className="profile-stat"><h4 style={{ color: "#FBBF24" }}>{stats.pending || 0}</h4><p>Pending</p></div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
          <h3 style={{ margin: 0 }}>Details</h3>
          {!editing && <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Edit Profile</button>}
        </div>

        {editing ? (
          <form onSubmit={saveProfile}>
            <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Full Name</label>
            <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Phone</label>
            <input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Your phone number" />
            <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>College / University</label>
            <input className="input-field" value={form.college} onChange={e => setForm({ ...form, college: e.target.value })} placeholder="Your college" />
            <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Skills (comma-separated)</label>
            <input className="input-field" value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="React, Python, SQL..." />
            <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Bio</label>
            <textarea className="input-field" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows="3" placeholder="Tell companies about yourself..." />
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button className="btn btn-primary" type="submit">Save Changes</button>
              <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { label: "Phone", value: profile.Phone },
              { label: "College", value: profile.College },
              { label: "Bio", value: profile.Bio },
            ].map((item, i) => (
              <div key={i}>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>{item.label}</p>
                <p style={{ color: "var(--text)" }}>{item.value || "Not set"}</p>
              </div>
            ))}
            <div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Skills</p>
              {profile.Skills ? profile.Skills.split(",").map((s, i) => <span key={i} className="skill-tag">{s.trim()}</span>) : <p style={{ color: "var(--text)" }}>No skills added</p>}
            </div>
            <div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Member Since</p>
              <p style={{ color: "var(--text)" }}>{new Date(profile.CreatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default StudentProfile;
