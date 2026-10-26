import { useState } from "react";
import { ArrowUpRight, Bookmark, BriefcaseBusiness, MapPin } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth-context";
import { useSavedJobs } from "../useSavedJobs";

export default function JobCard({ job }) {
  const { user } = useAuth();
  const { savedJobs, toggleSavedJob } = useSavedJobs();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saved = savedJobs.some((item) => String(item.job?.id || item.job?._id) === String(job.id));

  async function handleSave() {
    if (!user) {
      navigate("/login", { state: { from: "/jobs/" + job.id } });
      return;
    }
    if (user.role !== "job-seeker") return;
    setBusy(true);
    setError("");
    try {
      await toggleSavedJob(job);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="job-card">
      <div className="job-card-top">
        <div className={`company-logo ${job.color}`}>{job.initials}</div>
        {user?.role !== "employer" && <button type="button" className={`save-button ${saved ? "is-saved" : ""}`} aria-label={saved ? "Remove saved job" : "Save job"} aria-pressed={saved} disabled={busy} onClick={handleSave} title={saved ? "Remove from saved jobs" : "Save job"}>
          <Bookmark size={18} fill={saved ? "currentColor" : "none"}/>
        </button>}
      </div>
      {error && <span className="job-card-save-error" role="alert">{error}</span>}
      <span className="company-name">{job.company}</span>{job.isSample && <span className="sample-job-badge">SAMPLE LISTING · FICTIONAL</span>}
      <h3><Link to={`/jobs/${job.id}`}>{job.title}</Link></h3>
      <div className="job-meta">
        <span><MapPin size={15} /> {job.location}</span>
        <span><BriefcaseBusiness size={15} /> {job.type}</span>
      </div>
      <div className="job-tags">{(job.skills || []).slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}</div>
      <div className="job-card-footer">
        <div><strong>{job.salary}</strong><span>{job.workplace} · {job.posted}</span></div>
        <Link className="btn btn-outline" to={`/jobs/${job.id}`} aria-label={`View ${job.title} at ${job.company}`}>View <ArrowUpRight size={16} /></Link>
      </div>
    </article>
  );
}

