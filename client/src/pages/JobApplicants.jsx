import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Download, Mail, MapPin, Phone, XCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { downloadApplicationResume, fetchApplicationPhoto, fetchJobApplications, updateApplicationStatus } from "../api/employer";
import { useAuth } from "../auth-context";

const statusLabels = { submitted: "Submitted", reviewing: "In review", accepted: "Accepted", declined: "Not selected" };

export default function JobApplicants() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingApplication, setUpdatingApplication] = useState("");
  const [applicantPhotoUrls, setApplicantPhotoUrls] = useState({});

  useEffect(() => {
    if (authLoading || !user || user.role !== "employer") return undefined;
    let active = true;
    fetchJobApplications(id)
      .then((items) => { if (active) { setApplications(items); setError(""); } })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, user, authLoading]);

  useEffect(() => {
    let active = true;
    const createdUrls = [];
    Promise.all(applications.map(async (application) => {
      try {
        const blob = await fetchApplicationPhoto(application._id);
        const url = URL.createObjectURL(blob);
        createdUrls.push(url);
        return [application._id, url];
      } catch {
        return [application._id, ""];
      }
    })).then((entries) => {
      if (active) setApplicantPhotoUrls(Object.fromEntries(entries));
    });
    return () => {
      active = false;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [applications]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { state: { from: "/employer/jobs/" + id + "/applications" }, replace: true });
  }, [authLoading, user, id, navigate]);

  async function downloadResume(application) {
    try {
      const blob = await downloadApplicationResume(application._id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = application.profileSnapshot?.resumeFileName || "resume";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message);
    }
  }

  async function changeStatus(applicationId, status) {
    setUpdatingApplication(applicationId);
    try {
      await updateApplicationStatus(applicationId, status);
      setApplications((current) => current.map((application) =>
        application._id === applicationId ? { ...application, status } : application,
      ));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingApplication("");
    }
  }

  if (authLoading || !user) return <main className="employer-page" role="status"><h1>Loading applicants…</h1></main>;
  if (user.role !== "employer") return <main className="employer-page"><h1>Employer account required</h1><Link className="btn btn-primary" to="/register">Create employer account</Link></main>;
  if (loading) return <main className="employer-page" role="status"><h1>Loading applicants…</h1></main>;

  return (
    <main className="employer-page">
      <div className="applicants-page-heading">
        <Link to="/dashboard" className="back-link"><ArrowLeft size={16}/> Back to your job posts</Link>
        <span className="section-kicker">EMPLOYER WORKSPACE</span>
        <h1>Applicants</h1>
        <p className="applications-intro">Review candidate details and update each application’s status.</p>
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {!applications.length && !error ? <div className="applications-empty"><h2>No active applications yet</h2><p>New submissions will appear here.</p></div> : (
        <div className="application-list">
          {applications.map((application) => (
            <article className="applicant-card" key={application._id}>
              <div className="application-card-main applicant-profile">
                <div className="applicant-profile-heading">
                  <div className="applicant-avatar">{applicantPhotoUrls[application._id] ? <img src={applicantPhotoUrls[application._id]} alt={(application.profileSnapshot?.name || application.applicant?.name || "Candidate") + " profile"}/> : (application.profileSnapshot?.name || application.applicant?.name || "C").trim().charAt(0).toUpperCase()}</div>
                  <div><span className="section-kicker">CANDIDATE</span><h2>{application.profileSnapshot?.name || application.applicant?.name || "Candidate"}</h2><a className="applicant-email" href={"mailto:" + (application.applicant?.email || "")}>{application.applicant?.email || "Email unavailable"} <Mail size={14}/></a></div>
                </div>
                <div className="applicant-details-grid">
                  <div><span>Applied</span><strong>{new Date(application.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</strong></div>
                  {application.profileSnapshot?.phone && <div><span>Phone</span><strong><Phone size={13}/>{application.profileSnapshot.phone}</strong></div>}
                  {application.profileSnapshot?.location && <div><span>Location</span><strong><MapPin size={13}/>{application.profileSnapshot.location}</strong></div>}
                  {application.profileSnapshot?.headline && <div className="applicant-headline"><span>Professional summary</span><strong>{application.profileSnapshot.headline}</strong></div>}
                  {application.profileSnapshot?.education?.map((item, index) => <div key={index}><span>Education</span><strong>{item.level} · {item.institute}{item.percentage != null ? " · " + item.percentage + "%" : ""}</strong></div>)}
                </div>
                {application.profileSnapshot?.skills?.length > 0 && <div className="applicant-skills"><span>Skills</span><div>{application.profileSnapshot.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div>}
                <div className="applicant-profile-actions">
                  {application.profileSnapshot?.resumeFileName && <button className="btn btn-outline" type="button" onClick={() => downloadResume(application)}><Download size={15}/>Download resume</button>}
                  {application.profileSnapshot?.resumeFileName && <span className="applicant-resume-name">{application.profileSnapshot.resumeFileName}</span>}
                </div>
                {application.coverLetter && <blockquote>{application.coverLetter}</blockquote>}
              </div>
              <aside className={"applicant-decision-panel " + application.status}>
                <div className="applicant-decision-heading"><span>Application status</span><strong className={"application-status " + application.status}>{statusLabels[application.status] || application.status}</strong></div>
                {application.status === "accepted" ? <p>The candidate has been accepted and notified in HireHub.</p> : application.status === "declined" ? <p>The candidate has been notified of this decision.</p> : <>
                  <p>Choose the next step for this candidate.</p>
                  <div className="applicant-decision-actions">
                    <button type="button" className="decision-review" disabled={updatingApplication === application._id || application.status === "reviewing"} onClick={() => changeStatus(application._id, "reviewing")}><Clock3 size={15}/>{updatingApplication === application._id ? "Updating…" : "In review"}</button>
                    <button type="button" className="decision-accept" disabled={Boolean(updatingApplication)} onClick={() => changeStatus(application._id, "accepted")}><CheckCircle2 size={15}/>Accept</button>
                    <button type="button" className="decision-decline" disabled={Boolean(updatingApplication)} onClick={() => changeStatus(application._id, "declined")}><XCircle size={15}/>Not selected</button>
                  </div>
                </>}
              </aside>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

