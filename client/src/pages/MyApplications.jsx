import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, MapPin, RotateCcw, Send, Trash2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { deleteWithdrawnApplication, fetchMyApplications, withdrawApplication } from "../api/applications";
import { useAuth } from "../auth-context";

const statusLabels = { submitted: "Submitted", reviewing: "In review", accepted: "Accepted", declined: "Not selected", withdrawn: "Withdrawn" };
const statusMessages = {
  submitted: { icon: Send, title: "Application sent", message: "Your profile and resume are with the hiring team. You can check back here for updates." },
  reviewing: { icon: Clock3, title: "Your application is under review", message: "The hiring team is reviewing your details. We’ll show any status update here." },
  accepted: { icon: CheckCircle2, title: "Congratulations! Your application was accepted", message: "Great news—the hiring team accepted your application. Keep an eye out for a message from them about next steps." },
  declined: { icon: XCircle, title: "This role wasn’t a match this time", message: "Thank you for putting yourself forward. Your skills are still valuable—keep exploring roles that fit your next step." },
  withdrawn: { icon: RotateCcw, title: "Application withdrawn", message: "You withdrew this application. You can apply again if the role is still available." },
};

export default function MyApplications() {
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading || !user || user.role !== "job-seeker") return undefined;
    let active = true;
    async function loadApplications() {
      try {
        const items = await fetchMyApplications();
        if (active) { setApplications(items); setError(""); }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadApplications();
    const interval = window.setInterval(loadApplications, 30000);
    window.addEventListener("hirehub-applications-updated", loadApplications);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("hirehub-applications-updated", loadApplications);
    };
  }, [user, authLoading]);

  async function withdraw(item) {
    try {
      await withdrawApplication(item._id);
      setApplications((current) => current.map((application) =>
        application._id === item._id ? { ...application, status: "withdrawn" } : application,
      ));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function removeFromHistory(item) {
    setPendingDelete(item);
    setError("");
  }

  async function confirmRemoveFromHistory() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteWithdrawnApplication(pendingDelete._id);
      setApplications((current) => current.filter((application) => application._id !== pendingDelete._id));
      setPendingDelete(null);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeleting(false);
    }
  }
  if (authLoading) return <main className="applications-page" role="status"><h1>Loading your account…</h1></main>;
  if (!user) return <main className="applications-page"><h1>Log in to see your applications</h1><Link className="btn btn-primary" to="/login">Log in <ArrowRight size={16}/></Link></main>;
  if (user.role !== "job-seeker") return <main className="applications-page"><h1>This page is for job seekers</h1><p>Employer accounts can review applications after posting jobs.</p><Link className="btn btn-outline" to="/jobs">Browse jobs</Link></main>;
  if (loading) return <main className="applications-page" role="status"><h1>Loading your applications…</h1></main>;

  return (
    <main className="applications-page">
      <span className="section-kicker">YOUR NEXT CHAPTER</span>
      <h1>My applications</h1>
      <p className="applications-intro">Keep track of the roles you’ve applied to.</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {!applications.length && !error ? (
        <div className="applications-empty"><BriefcaseBusiness size={28}/><h2>No applications yet</h2><p>When you apply to a job, it will appear here.</p><Link className="btn btn-primary" to="/jobs">Explore jobs <ArrowRight size={16}/></Link></div>
      ) : (
        <div className="application-list">
          {applications.map((application) => (
            <article className="application-card" key={application._id}>
              <div className="application-card-main">
                <span className="section-kicker">{application.job?.company || "HireHub"}</span>
                <h2>{application.job ? application.job.title : "This role is no longer available"}</h2>
                {application.job && <p><MapPin size={15}/>{application.job.location} · {application.job.workplace} · {application.job.type}</p>}
                <p className="application-applied-at"><Clock3 size={14}/>Applied {new Date(application.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                
              </div>
              {(() => { const update = statusMessages[application.status] || statusMessages.submitted; const StatusIcon = update.icon; return <div className={"application-status-note " + application.status}><span className="application-status-note-icon"><StatusIcon size={19}/></span><div><strong>{update.title}</strong><p>{update.message}</p></div></div>; })()}
              <div className="application-card-actions">
                <span className={"application-status " + application.status}>{statusLabels[application.status] || application.status}</span>
                {application.job && <Link className="btn btn-outline" to={"/jobs/" + application.job._id}>View job</Link>}
                {["submitted", "reviewing"].includes(application.status) && <button className="btn btn-ghost" onClick={() => withdraw(application)}>Withdraw</button>}{application.status === "withdrawn" && <button className="btn btn-ghost application-delete-button" onClick={() => removeFromHistory(application)}><Trash2 size={15}/>Delete from history</button>}
              </div>
            </article>
          ))}
        </div>
      )}
      {pendingDelete && <div className="confirm-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setPendingDelete(null); }}>
        <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-application-title">
          <div className="confirm-dialog-icon"><Trash2 size={21}/></div>
          <h2 id="delete-application-title">Delete from history?</h2>
          <p>“{pendingDelete.job?.title || "This application"}” will be permanently removed from your application history.</p>
          <div className="confirm-dialog-actions">
            <button className="btn btn-outline" type="button" onClick={() => setPendingDelete(null)} disabled={deleting}>Cancel</button>
            <button className="btn confirm-delete-action" type="button" onClick={confirmRemoveFromHistory} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</button>
          </div>
        </section>
      </div>}    </main>
  );
}

