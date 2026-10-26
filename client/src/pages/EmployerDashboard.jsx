import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { closeEmployerJob, fetchEmployerJobs, updateEmployerJob } from "../api/employer";
import { useAuth } from "../auth-context";

export default function EmployerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user || user.role !== "employer") return undefined;
    let active = true;
    fetchEmployerJobs()
      .then((items) => { if (active) { setJobs(items); setError(""); } })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, authLoading]);

  async function toggleStatus(job) {
    try {
      if (job.isActive) await closeEmployerJob(job._id);
      else await updateEmployerJob(job._id, { isActive: true });
      setJobs((current) => current.map((item) =>
        item._id === job._id ? { ...item, isActive: !job.isActive } : item,
      ));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (authLoading) return <main className="employer-page" role="status"><h1>Loading employer workspace…</h1></main>;
  if (!user) return <main className="employer-page"><h1>Log in to manage job posts</h1><Link className="btn btn-primary" to="/login">Log in <ArrowRight size={16}/></Link></main>;
  if (user.role !== "employer") return <main className="employer-page"><h1>Employer account required</h1><p>Register an employer account to post and manage jobs.</p><Link className="btn btn-primary" to="/register">Create employer account <ArrowRight size={16}/></Link></main>;
  if (loading) return <main className="employer-page" role="status"><h1>Loading your job posts…</h1></main>;

  return (
    <main className="employer-page">
      <div className="employer-page-heading">
        <div><span className="section-kicker">EMPLOYER WORKSPACE</span><h1>Your job posts</h1><p>Manage listings and see who’s interested in your opportunities.</p></div>
        <Link className="btn btn-primary" to="/employer/jobs/new"><Plus size={17}/> Post a job</Link>
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {!jobs.length && !error ? (
        <div className="applications-empty"><BriefcaseBusiness size={28}/><h2>No job posts yet</h2><p>Create a listing to meet your next great hire.</p><Link className="btn btn-primary" to="/employer/jobs/new">Post your first job <ArrowRight size={16}/></Link></div>
      ) : (
        <div className="employer-job-list">
          {jobs.map((job) => (
            <article className="employer-job-card" key={job._id}>
              <div className="employer-job-title">
                <span className={"application-status " + (job.isActive ? "submitted" : "withdrawn")}>{job.isActive ? "Open" : "Closed"}</span>
                <h2>{job.title}</h2><p>{job.company} · {job.location} · {job.workplace}</p>
              </div>
              <div className="employer-job-actions">
                <Link className="btn btn-outline" to={"/employer/jobs/" + job._id + "/applications"}>Applicants ({job.applicationCount || 0})</Link>
                <Link className="btn btn-ghost" to={"/employer/jobs/" + job._id + "/edit"}>Edit</Link>
                <button className="btn btn-ghost" onClick={() => toggleStatus(job)}>{job.isActive ? "Close listing" : "Reopen listing"}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}



