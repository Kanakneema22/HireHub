import { useEffect, useState } from "react";
import { ArrowLeft, Download, Plus, Trash2, Upload, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { deleteProfileFile, fetchProfile, fetchProfileFile, saveProfile, uploadProfileFile } from "../api/profile";
import { useAuth } from "../auth-context";

const blankEducation = { level: "", institute: "", year: "", percentage: "" };
const blankExperience = { title: "", company: "", years: "" };

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "resume";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = typeof location.state?.from === "string" ? location.state.from : "/";
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoVersion, setPhotoVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fileBusy, setFileBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      navigate("/login", { state: { from: "/profile" }, replace: true });
      return undefined;
    }
    let active = true;
    fetchProfile()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          location: data.location || "",
          headline: data.headline || "",
          bio: data.bio || "",
          skills: (data.skills || []).join(", "),
          education: data.education?.length ? data.education.map((item) => ({ ...item, year: item.year || "", percentage: item.percentage ?? "" })) : [{ ...blankEducation }],
          experience: data.experience?.length ? data.experience.map((item) => ({ ...item, years: item.years ?? "" })) : [{ ...blankExperience }],
        });
      })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, user, navigate]);

  const hasPhoto = Boolean(profile?.photo);
  const photoFileName = profile?.photo?.fileName;

  useEffect(() => {
    if (!hasPhoto) return undefined;
    let active = true;
    let objectUrl = "";
    fetchProfileFile("photo")
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPhotoUrl(objectUrl);
      })
      .catch(() => { if (active) setPhotoUrl(""); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasPhoto, photoFileName, photoVersion]);
  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateRow(collection, index, key, value) {
    setForm((current) => ({
      ...current,
      [collection]: current[collection].map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await saveProfile({
        name: form.name,
        phone: form.phone,
        location: form.location,
        headline: form.headline,
        bio: form.bio,
        skills: form.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
        education: form.education.filter((item) => item.level.trim() || item.institute.trim()).map((item) => ({ ...item, year: item.year === "" ? null : Number(item.year), percentage: item.percentage === "" ? null : Number(item.percentage) })),
        experience: form.experience.filter((item) => item.title.trim() || item.company.trim()).map((item) => ({ ...item, years: item.years === "" ? null : Number(item.years) })),
      });
      setProfile(data);
      setMessage("Profile saved. These details will be included with new job applications.");
      await refreshUser();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function upload(kind, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileBusy(kind);
    setError("");
    setMessage("");
    try {
      const data = await uploadProfileFile(kind, file);
      setProfile(data);
      if (kind === "photo") {
        setPhotoVersion((version) => version + 1);
        window.dispatchEvent(new Event("hirehub-profile-updated"));
      }
      setMessage(kind === "photo" ? "Profile photo updated." : "Resume saved to your profile.");
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setFileBusy("");
    }
  }

  async function removeFile(kind) {
    setFileBusy(kind);
    setError("");
    try {
      const data = await deleteProfileFile(kind);
      setProfile(data);
      if (kind === "photo") {
        setPhotoUrl("");
        window.dispatchEvent(new Event("hirehub-profile-updated"));
      }
      setMessage(kind === "photo" ? "Profile photo removed." : "Resume removed.");
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setFileBusy("");
    }
  }

  async function downloadResume() {
    try {
      const blob = await fetchProfileFile("resume");
      downloadBlob(blob, profile.resume.fileName);
    } catch (downloadError) {
      setError(downloadError.message);
    }
  }

  const completedFields = profile ? [profile.name?.trim(), profile.phone?.trim(), profile.location?.trim(), profile.headline?.trim(), profile.skills?.some((skill) => skill.trim()), profile.education?.some((item) => item.level?.trim() && item.institute?.trim()), profile.resume?.fileName].filter(Boolean).length : 0;

  if (authLoading || loading) return <main className="profile-page" role="status"><h1>Loading your profile…</h1></main>;
  if (error && !form) return <main className="profile-page"><p className="auth-error" role="alert">{error}</p><Link className="btn btn-outline" to="/">Back home</Link></main>;
  if (!form || !profile) return null;

  return (
    <main className="profile-page">
      <Link className="back-link" to={returnTo}><ArrowLeft size={16}/> {returnTo === "/" ? "Back to HireHub" : "Back to your application"}</Link>
      <div className="profile-heading">
        <div><span className="section-kicker">YOUR HIREHUB PROFILE</span><h1>Your details, ready to share.</h1><p>Complete the required details and add a resume before applying. Your photo, bio, and experience are optional.</p></div>
        <div className="profile-completion"><strong>{Math.round((completedFields / 7) * 100)}%</strong><span>profile complete</span></div>
      </div>

      <form className="profile-form" onSubmit={submit}>
        <section className="profile-card profile-photo-card">
          <div className="profile-photo">
            {photoUrl ? <img src={photoUrl} alt="Your profile" /> : <UserRound size={34}/>}
          </div>
          <div className="profile-photo-copy"><h2>Profile photo <span className="profile-optional-label">Optional</span></h2><p>JPEG, PNG, or WebP · up to 3 MB</p></div>
          <label className="btn btn-outline profile-upload-button"><Upload size={15}/>{fileBusy === "photo" ? "Uploading…" : "Choose photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload("photo", event)} disabled={Boolean(fileBusy)} /></label>
          {profile.photo && <button className="btn btn-ghost" type="button" onClick={() => removeFile("photo")} disabled={Boolean(fileBusy)}><Trash2 size={15}/>Remove</button>}
        </section>

        <section className="profile-card">
          <div className="profile-section-heading"><div><h2>Personal details</h2><p>These appear with your application when you apply.</p></div></div>
          <div className="profile-fields-grid">
            <label className="auth-label">Full name<input name="name" required minLength={2} maxLength={80} value={form.name} onChange={update}/></label>
            <label className="auth-label">Email address<input value={profile.email} readOnly/><span>Email comes from your login account.</span></label>
            <label className="auth-label">Phone number <span className="profile-required-label">Required to apply</span><input name="phone" type="tel" maxLength={25} placeholder="+91 98765 43210" value={form.phone} onChange={update}/></label>
            <label className="auth-label">Location <span className="profile-required-label">Required to apply</span><input name="location" maxLength={120} placeholder="City, country" value={form.location} onChange={update}/></label>
            <label className="auth-label profile-full-field">Professional headline <span className="profile-required-label">Required to apply</span><input name="headline" maxLength={140} placeholder="e.g. Frontend developer | React" value={form.headline} onChange={update}/></label>
            <label className="auth-label profile-full-field">About you<textarea name="bio" rows={4} maxLength={1500} placeholder="A short introduction for hiring teams" value={form.bio} onChange={update}/></label>
            <label className="auth-label profile-full-field">Skills <span>Required to apply · Separate with commas</span><input name="skills" placeholder="React, communication, customer service" value={form.skills} onChange={update}/></label>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-section-heading"><div><h2>Education <span className="profile-required-label">Required to apply</span></h2><p>Add at least one qualification and institute. Marks and year are optional.</p></div><button className="btn btn-outline" type="button" onClick={() => setForm((current) => ({ ...current, education: [...current.education, { ...blankEducation }] }))}><Plus size={15}/>Add education</button></div>
          <div className="profile-repeat-list">
            {form.education.map((item, index) => (
              <div className="profile-repeat-row" key={"education-" + index}>
                <label className="auth-label">Qualification<input value={item.level} onChange={(event) => updateRow("education", index, "level", event.target.value)} placeholder="e.g. B.Sc. Computer Science"/></label>
                <label className="auth-label">School / institute<input value={item.institute} onChange={(event) => updateRow("education", index, "institute", event.target.value)}/></label>
                <label className="auth-label">Year<input type="number" min="1900" max="2100" value={item.year} onChange={(event) => updateRow("education", index, "year", event.target.value)}/></label>
                <label className="auth-label">Percentage<input type="number" min="0" max="100" step="0.01" value={item.percentage} onChange={(event) => updateRow("education", index, "percentage", event.target.value)}/></label>
                <button className="profile-remove-row" type="button" aria-label="Remove education" onClick={() => setForm((current) => ({ ...current, education: current.education.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-section-heading"><div><h2>Experience <span className="profile-optional-label">Optional</span></h2><p>Add roles you’ve held and your years of experience.</p></div><button className="btn btn-outline" type="button" onClick={() => setForm((current) => ({ ...current, experience: [...current.experience, { ...blankExperience }] }))}><Plus size={15}/>Add experience</button></div>
          <div className="profile-repeat-list">
            {form.experience.map((item, index) => (
              <div className="profile-repeat-row experience-row" key={"experience-" + index}>
                <label className="auth-label">Role<input value={item.title} onChange={(event) => updateRow("experience", index, "title", event.target.value)}/></label>
                <label className="auth-label">Company<input value={item.company} onChange={(event) => updateRow("experience", index, "company", event.target.value)}/></label>
                <label className="auth-label">Years<input type="number" min="0" max="60" step="0.5" value={item.years} onChange={(event) => updateRow("experience", index, "years", event.target.value)}/></label>
                <button className="profile-remove-row" type="button" aria-label="Remove experience" onClick={() => setForm((current) => ({ ...current, experience: current.experience.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </section>

        <section className="profile-card profile-resume-card">
          <div><h2>Resume <span className="profile-required-label">Required to apply</span></h2><p>PDF, DOC, or DOCX · up to 5 MB. Add a resume before submitting an application.</p>{profile.resume && <strong className="resume-name">{profile.resume.fileName}</strong>}</div>
          <div className="profile-file-actions">
            {profile.resume && <button className="btn btn-ghost" type="button" onClick={downloadResume}><Download size={15}/>Download</button>}
            <label className="btn btn-outline profile-upload-button"><Upload size={15}/>{fileBusy === "resume" ? "Uploading…" : profile.resume ? "Replace resume" : "Choose resume"}<input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => upload("resume", event)} disabled={Boolean(fileBusy)} /></label>
            {profile.resume && <button className="btn btn-ghost" type="button" onClick={() => removeFile("resume")} disabled={Boolean(fileBusy)}><Trash2 size={15}/>Remove</button>}
          </div>
        </section>

        {error && <p className="auth-error" role="alert">{error}</p>}
        {message && <p className="profile-success" role="status">{message}</p>}
        <div className="profile-save-row"><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button></div>
      </form>
    </main>
  );
}




