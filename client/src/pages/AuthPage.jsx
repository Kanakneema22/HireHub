import { useState } from "react";
import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth-context";

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "job-seeker" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(form, mode);
      navigate(location.state?.from || "/", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="auth-icon"><BriefcaseBusiness size={23} /></span>
        <span className="section-kicker">{isRegister ? "YOUR NEXT CHAPTER" : "WELCOME BACK"}</span>
        <h1>{isRegister ? "Create your account" : "Log in to HireHub"}</h1>
        <p className="auth-intro">{isRegister ? "Join HireHub to find your next opportunity or meet your next great hire." : "Sign in to continue to your HireHub account."}</p>

        <form className="auth-form" onSubmit={submit}>
          {isRegister && <label className="auth-label">Full name<input name="name" type="text" autoComplete="name" minLength={2} maxLength={80} required value={form.name} onChange={update} /></label>}
          <label className="auth-label">Email address<input name="email" type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={update} /></label>
          <label className="auth-label">Password<input name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={8} maxLength={128} required value={form.password} onChange={update} /><span>Use at least 8 characters.</span></label>
          {isRegister && <label className="auth-label">I’m here to<select name="role" value={form.role} onChange={update}><option value="job-seeker">Find a job</option><option value="employer">Hire someone</option></select></label>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : isRegister ? "Create account" : "Log in"}<ArrowRight size={16} /></button>
        </form>

        <p className="auth-switch">{isRegister ? "Already have an account?" : "New to HireHub?"} <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Log in" : "Create an account"}</Link></p>
      </section>
    </main>
  );
}


