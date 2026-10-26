import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  MapPin,
  Upload,
  UserRound,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import JobCard from "../components/JobCard";
import { fetchJob, fetchJobs } from "../api/jobs";
import { applyToJob, fetchMyApplications, withdrawApplication } from "../api/applications";
import { useAuth } from "../auth-context";
import { fetchProfile, fetchProfileFile, uploadProfileFile } from "../api/profile";

function missingApplicationProfileFields(profile, user) {
  const missing = [];
  if (!(profile?.name || user?.name)?.trim()) missing.push("Full name");
  if (!(profile?.email || user?.email)?.trim()) missing.push("Email address");
  if (!profile?.phone?.trim()) missing.push("Phone number");
  if (!profile?.location?.trim()) missing.push("Location");
  if (!profile?.headline?.trim()) missing.push("Professional headline");
  if (!profile?.skills?.some((skill) => skill.trim())) missing.push("At least one skill");
  if (!profile?.education?.some((item) => item.level?.trim() && item.institute?.trim())) missing.push("Education (qualification and institute)");
  if (!profile?.resume?.fileName) missing.push("Resume");
  return missing;
}

export default function JobDetails() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [job, setJob] = useState(null);
  const [relatedJobs, setRelatedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [application, setApplication] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [candidatePhotoUrl, setCandidatePhotoUrl] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applicationMessage, setApplicationMessage] = useState("");
  const [applicationError, setApplicationError] = useState("");
  const [applicationBusy, setApplicationBusy] = useState(false);
  const currentApplication = application?.jobId === id && application?.userId === user?.id ? application : null;
  const missingProfileFields = missingApplicationProfileFields(candidateProfile, user);

  useEffect(() => {
    let active = true;
    Promise.all([fetchJob(id), fetchJobs()])
      .then(([detail, allJobs]) => {
        if (active) {
          setJob(detail);
          setRelatedJobs(allJobs.filter((item) => item.id !== detail.id).slice(0, 2));
          setError("");
        }
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!job || !user || user.role !== "job-seeker") return undefined;
    let active = true;
    fetchMyApplications()
      .then((items) => {
        if (!active) return;
        const found = items.find((item) => String(item.job?._id) === String(job.id));
        setApplication(found ? {
          id: found._id,
          status: found.status,
          jobId: String(job.id),
          userId: user.id,
        } : null);
      })
      .catch(() => { if (active) setApplication(null); });
    return () => { active = false; };
  }, [job, user]);

  useEffect(() => {
    if (!showApplicationForm || !user) return undefined;
    let active = true;
    let createdPhotoUrl = "";
    fetchProfile()
      .then(async (data) => {
        if (!active) return;
        setCandidateProfile(data);
        if (data.photo) {
          const photo = await fetchProfileFile("photo");
          if (active) {
            createdPhotoUrl = URL.createObjectURL(photo);
            setCandidatePhotoUrl(createdPhotoUrl);
          }
        } else {
          setCandidatePhotoUrl("");
        }
      })
      .catch((loadError) => { if (active) setApplicationError(loadError.message); })
      .finally(() => { if (active) setProfileLoading(false); });
    return () => {
      active = false;
      if (createdPhotoUrl) URL.revokeObjectURL(createdPhotoUrl);
    };
  }, [showApplicationForm, user]);

  async function uploadApplicationResume(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setResumeUploading(true);
    setApplicationError("");
    try {
      const updated = await uploadProfileFile("resume", file);
      setCandidateProfile(updated);
      setApplicationMessage("Resume saved to your profile. It will be included with this application.");
      window.dispatchEvent(new Event("hirehub-profile-updated"));
    } catch (uploadError) {
      setApplicationError(uploadError.message);
    } finally {
      setResumeUploading(false);
    }
  }
  function beginApplication() {
    setApplicationMessage("");
    setApplicationError("");
    if (authLoading) return;
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    if (user.role !== "job-seeker") {
      setApplicationMessage("Employer accounts can’t apply to jobs.");
      return;
    }
    if (currentApplication?.status === "submitted") {
      setApplicationMessage("You’ve already applied to this job. You can view it in My applications.");
      return;
    }
    setProfileLoading(true);
    setShowApplicationForm(true);
  }

  async function submitApplication(event) {
    event.preventDefault();
    if (missingProfileFields.length) {
      setApplicationError("Complete the required profile details and add your resume before applying.");
      return;
    }
    setApplicationBusy(true);
    setApplicationError("");
    try {
      const result = await applyToJob(job.id, coverLetter);
      setApplication({ id: result._id, status: "submitted", jobId: String(job.id), userId: user.id });
      setShowApplicationForm(false);
      setCoverLetter("");
      setApplicationMessage("Your application has been submitted.");
    } catch (requestError) {
      setApplicationError(requestError.message);
    } finally {
      setApplicationBusy(false);
    }
  }

  async function withdrawCurrentApplication() {
    setApplicationBusy(true);
    setApplicationError("");
    try {
      await withdrawApplication(currentApplication.id);
      setApplication((current) => ({ ...current, status: "withdrawn" }));
      setApplicationMessage("Your application has been withdrawn. You can apply again if you change your mind.");
    } catch (requestError) {
      setApplicationError(requestError.message);
    } finally {
      setApplicationBusy(false);
    }
  }

  if (loading) return <main className="not-found" role="status"><h1>Loading job…</h1></main>;

  if (error || !job) {
    return (
      <main className="not-found">
        <h1>Job not found</h1>
        <p>{error || "This listing may have been removed or the link is incorrect."}</p>
        <Link className="btn btn-primary" to="/jobs"><ArrowLeft size={16} /> Browse jobs</Link>
      </main>
    );
  }

  return (
    <main className="details-page">
      <div className="details-container">
        <Link to="/jobs" className="back-link"><ArrowLeft size={17} /> Back to jobs</Link>
        <section className="details-header">
          <div className={"company-logo details-logo " + job.color}>{job.initials}</div>
          <div className="details-heading">
            <span className="company-name">{job.company}</span>{job.isSample && <span className="sample-job-badge">SAMPLE LISTING · FICTIONAL</span>}
            <h1>{job.title}</h1>
            <div className="job-meta details-meta">
              <span><MapPin size={16} /> {job.location}</span>
              <span><BriefcaseBusiness size={16} /> {job.type}</span>
              <span>{job.workplace}</span>
            </div>
          </div>
          <div className="details-apply">
            <strong>{job.salary}</strong>
            <span>Indicative salary</span>
            {job.isSample ? (
              <p className="sample-apply-notice">Fictional demo listing. Applications are disabled for sample jobs.</p>
            ) : currentApplication?.status === "submitted" ? (
              <button className="btn btn-outline" onClick={withdrawCurrentApplication} disabled={applicationBusy}>Withdraw application</button>
            ) : (
              <button className="btn btn-primary" onClick={beginApplication} disabled={applicationBusy}>
                {currentApplication?.status === "withdrawn" ? "Apply again" : "Apply now"} <ArrowUpRight size={17} />
              </button>
            )}
            {applicationMessage && <p className="application-message" role="status">{applicationMessage}</p>}
            {applicationError && <p className="auth-error" role="alert">{applicationError}</p>}
          </div>
        </section>

        {showApplicationForm && (
          <form className="application-form" onSubmit={submitApplication}>
            <div>
              <h2>Apply for {job.title}</h2>
              <p>Review the profile details that will go with your application. <Link to="/profile" state={{ from: location.pathname }}>Edit profile</Link></p>
            </div>
            {profileLoading ? <div className="application-profile-summary" role="status">Loading your saved profile…</div> : candidateProfile && <section className="application-profile-summary">
              <div className="application-profile-heading">
                <div className="application-profile-photo">{candidatePhotoUrl ? <img src={candidatePhotoUrl} alt="Your profile"/> : <UserRound size={23}/>}</div>
                <div><strong>{candidateProfile.name || user.name}</strong><span>{candidateProfile.email || user.email}</span></div>
                <Link to="/profile" state={{ from: location.pathname }}>Edit profile</Link>
              </div>
              <div className="application-profile-details">
                {(candidateProfile.phone || candidateProfile.location) && <p>{candidateProfile.phone}{candidateProfile.phone && candidateProfile.location ? " · " : ""}{candidateProfile.location}</p>}
                {candidateProfile.headline && <p>{candidateProfile.headline}</p>}
                {candidateProfile.skills?.length > 0 && <p><strong>Skills:</strong> {candidateProfile.skills.join(", ")}</p>}
                {candidateProfile.education?.map((item, index) => <p key={index}>{item.level}{item.institute ? " · " + item.institute : ""}{item.percentage != null ? " · " + item.percentage + "%" : ""}</p>)}
              </div>
            </section>}
            <section className={"application-readiness " + (profileLoading ? "checking" : missingProfileFields.length ? "incomplete" : "complete")} role="status">
              <strong>{profileLoading ? "Checking your application profile…" : missingProfileFields.length ? "Complete your profile before applying" : "Your application profile is ready"}</strong>
              {profileLoading ? <p>We’re loading your saved details.</p> : missingProfileFields.length ? <><p>Please add these required details:</p><ul>{missingProfileFields.map((field) => <li key={field}>{field}</li>)}</ul><Link to="/profile" state={{ from: location.pathname }}>Complete profile</Link></> : <p>Your required details and resume will be shared with the hiring team.</p>}
            </section>
            <section className="application-resume-upload">
              <div className="application-resume-copy"><FileText size={20}/><div><strong>{candidateProfile?.resume?.fileName || "Add your resume"}</strong><span>{candidateProfile?.resume ? "This saved resume will go with your application." : "PDF, DOC, or DOCX · up to 5 MB"}</span></div></div>
              <label className="btn btn-outline application-resume-button"><Upload size={15}/>{resumeUploading ? "Uploading…" : candidateProfile?.resume ? "Replace resume" : "Upload resume"}<input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={uploadApplicationResume} disabled={resumeUploading || applicationBusy}/></label>
            </section>
            <label className="auth-label" htmlFor="cover-letter">Cover letter <span>Optional · up to 2,000 characters</span>
              <textarea id="cover-letter" rows="5" maxLength={2000} value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} placeholder="Tell the team why this role interests you." />
            </label>
            {applicationError && <p className="auth-error" role="alert">{applicationError}</p>}
            <div className="application-form-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setShowApplicationForm(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit" disabled={applicationBusy || profileLoading || resumeUploading || missingProfileFields.length > 0}>{applicationBusy ? "Submitting…" : "Submit application"}</button>
            </div>
          </form>
        )}

        <div className="details-layout">
          <article className="details-main">
            <section className="details-section"><h2>About the role</h2><p>{job.description}</p></section>
            <section className="details-section">
              <h2>What you'll do</h2>
              <ul>{job.responsibilities.map((item) => <li key={item}><CheckCircle2 size={18} /><span>{item}</span></li>)}</ul>
            </section>
            <section className="details-section">
              <h2>What we're looking for</h2>
              <ul>{job.requirements.map((item) => <li key={item}><CheckCircle2 size={18} /><span>{item}</span></li>)}</ul>
            </section>
            <section className="details-section">
              <h2>Skills you'll use</h2>
              <div className="job-tags">{job.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
            </section>
            <div className="demo-notice">Applications are private to your account. You can review or withdraw them from <Link to="/applications">My applications</Link>.</div>
          </article>
          <aside className="details-sidebar">
            <h3>Job overview</h3>
            <div className="overview-item"><span>Employment type</span><strong>{job.type}</strong></div>
            <div className="overview-item"><span>Workplace</span><strong>{job.workplace}</strong></div>
            <div className="overview-item"><span>Experience</span><strong>{job.experience}</strong></div>
            <div className="overview-item"><span>Category</span><strong>{job.category}</strong></div>
            <div className="overview-item"><span>Listed</span><strong>{job.posted}</strong></div>
          </aside>
        </div>

        <section className="related-section">
          <h2>Explore other opportunities</h2>
          <div className="jobs-grid">{relatedJobs.map((item) => <JobCard key={item.id} job={item} />)}</div>
        </section>
      </div>
    </main>
  );
}



