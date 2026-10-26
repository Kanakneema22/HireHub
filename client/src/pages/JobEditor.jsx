import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, FileText, ListChecks, Sparkles, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createJob, fetchEmployerJob, updateEmployerJob } from "../api/employer";
import { useAuth } from "../auth-context";

const emptyForm = { title: "", company: "", location: "", type: "Full-time", workplace: "Hybrid", salary: "", description: "", responsibilities: "", requirements: "", skills: [], experience: "Entry level", category: "Technology" };
function toLines(value) { return Array.isArray(value) ? value.join("\n") : ""; }
function toSkills(value) { return Array.isArray(value) ? [...new Set(value.flatMap((skill) => String(skill).split(/[,\n]/).map((item) => item.trim()).filter(Boolean)))].slice(0, 30) : []; }

export default function JobEditor() {
  const { id } = useParams();
  const edit = Boolean(id);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(edit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [skillDraft, setSkillDraft] = useState("");

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      navigate("/login", { state: { from: edit ? "/employer/jobs/" + id + "/edit" : "/employer/jobs/new" }, replace: true });
      return undefined;
    }
    if (user.role !== "employer" || !edit) return undefined;
    let active = true;
    fetchEmployerJob(id)
      .then((job) => {
        if (!active) return;
        setForm({ title: job.title || "", company: job.company || "", location: job.location || "", type: job.type || "Full-time", workplace: job.workplace || "Hybrid", salary: job.salary || "", description: job.description || "", responsibilities: toLines(job.responsibilities), requirements: toLines(job.requirements), skills: toSkills(job.skills), experience: job.experience || "Entry level", category: job.category || "Technology" });
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, authLoading, edit, id, navigate]);

  function update(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  function addSkills(value = skillDraft) {
    const incoming = value.split(/[,\n]/).map((skill) => skill.trim()).filter(Boolean);
    if (!incoming.length) return;
    setForm((current) => {
      const next = [...current.skills];
      incoming.forEach((skill) => {
        if (next.length < 30 && !next.some((item) => item.toLowerCase() === skill.toLowerCase())) next.push(skill);
      });
      return { ...current, skills: next };
    });
    setSkillDraft("");
  }

  function removeSkill(skillToRemove) {
    setForm((current) => ({ ...current, skills: current.skills.filter((skill) => skill !== skillToRemove) }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      ...form,
      responsibilities: form.responsibilities.split("\n").map((item) => item.trim()).filter(Boolean),
      requirements: form.requirements.split("\n").map((item) => item.trim()).filter(Boolean),
      skills: form.skills,
    };
    try {
      if (edit) await updateEmployerJob(id, payload);
      else await createJob(payload);
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || !user) return <main className="employer-page" role="status"><h1>Loading job editor…</h1></main>;
  if (user.role !== "employer") return <main className="employer-page"><h1>Employer account required</h1><Link className="btn btn-primary" to="/register">Create employer account</Link></main>;
  if (loading) return <main className="employer-page" role="status"><h1>Loading job editor…</h1></main>;

  return (
    <main className="job-editor-page">
      <Link className="back-link" to="/dashboard"><ArrowLeft size={16}/> Back to your job posts</Link>
      <header className="job-editor-intro">
        <span className="job-editor-intro-icon"><BriefcaseBusiness size={22}/></span>
        <div><span className="section-kicker">EMPLOYER WORKSPACE</span><h1>{edit ? "Make your listing shine" : "Meet your next great hire"}</h1><p>{edit ? "Refresh the role details so the right candidates stay interested." : "A clear, thoughtful job post helps great candidates picture their next step."}</p></div>
      </header>
      <div className="job-editor-steps" aria-label="Job post sections"><span><i>1</i> Role details</span><span><i>2</i> What the role does</span><span><i>3</i> Candidate fit</span></div>
      <form className="job-editor-form" onSubmit={submit}>
        <section className="job-editor-section">
          <div className="job-editor-section-heading"><span className="job-editor-section-icon"><BriefcaseBusiness size={18}/></span><div><h2>Role details</h2><p>Start with the information candidates look for first.</p></div></div>
          <div className="job-editor-grid">
            <label className="auth-label">Job title<input name="title" required maxLength={120} value={form.title} onChange={update} placeholder="e.g. Full Stack Developer"/></label>
            <label className="auth-label">Company name<input name="company" required maxLength={120} value={form.company} onChange={update} placeholder="Your company"/></label>
            <label className="auth-label">Location<input name="location" required maxLength={120} value={form.location} onChange={update} placeholder="City, country or remote"/></label>
            <label className="auth-label">Salary <span>Optional, but helps candidates decide</span><input name="salary" maxLength={80} placeholder="e.g. ₹4–7 LPA" value={form.salary} onChange={update}/></label>
            <label className="auth-label">Employment type<select name="type" value={form.type} onChange={update}><option>Full-time</option><option>Part-time</option><option>Internship</option><option>Contract</option></select></label>
            <label className="auth-label">Workplace<select name="workplace" value={form.workplace} onChange={update}><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label>
            <label className="auth-label">Experience<input name="experience" maxLength={80} value={form.experience} onChange={update} placeholder="e.g. 1–3 years"/></label>
            <label className="auth-label">Category<input name="category" maxLength={80} value={form.category} onChange={update} placeholder="e.g. Software Development"/></label>
          </div>
        </section>
        <section className="job-editor-section">
          <div className="job-editor-section-heading"><span className="job-editor-section-icon"><FileText size={18}/></span><div><h2>About the role</h2><p>Describe the team, the purpose of the role, and what a good first few months look like.</p></div></div>
          <label className="auth-label">Role overview<textarea name="description" required rows={6} maxLength={5000} value={form.description} onChange={update} placeholder="Introduce the role and why it matters…"/></label>
        </section>
        <section className="job-editor-section">
          <div className="job-editor-section-heading"><span className="job-editor-section-icon"><ListChecks size={18}/></span><div><h2>Responsibilities and requirements</h2><p>Keep each point specific and easy to scan. Add one item per line.</p></div></div>
          <div className="job-editor-grid job-editor-long-grid">
            <label className="auth-label">Responsibilities<textarea name="responsibilities" rows={5} value={form.responsibilities} onChange={update} placeholder={"Build and maintain product features\nCollaborate with the design team\nReview code and improve quality"}/></label>
            <label className="auth-label">Requirements<textarea name="requirements" rows={5} value={form.requirements} onChange={update} placeholder={"Experience with React\nComfortable working with APIs\nClear communication skills"}/></label>
          </div>
        </section>
        <section className="job-editor-section">
          <div className="job-editor-section-heading"><span className="job-editor-section-icon"><Sparkles size={18}/></span><div><h2>Skills and final touches</h2><p>Use skills candidates are likely to search for.</p></div></div>
          <div className="auth-label job-skill-field">
            <label htmlFor="job-skill-input">Skills</label>
            <span>Add skills one at a time. Press Enter or click Add.</span>
            {form.skills.length > 0 && <div className="job-skill-chips" aria-label="Added skills">{form.skills.map((skill) => <span className="job-skill-chip" key={skill}>{skill}<button type="button" aria-label={`Remove ${skill}`} onClick={() => removeSkill(skill)}><X size={13}/></button></span>)}</div>}
            <div className="job-skill-entry"><input id="job-skill-input" value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addSkills(); } }} onBlur={() => { if (skillDraft.trim()) addSkills(); }} placeholder="Type one skill, e.g. React"/><button className="btn btn-outline" type="button" onClick={() => addSkills()}>Add</button></div>
          </div>
        </section>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="job-editor-submit-bar"><p><CheckCircle2 size={16}/> You can update this listing later from your dashboard.</p><div className="application-form-actions"><Link className="btn btn-ghost" to="/dashboard">Cancel</Link><button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : edit ? "Save changes" : "Publish job"} <ArrowRight size={16}/></button></div></div>
      </form>
    </main>
  );
}


