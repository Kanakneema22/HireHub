import { useSavedJobs } from "../useSavedJobs";
import JobCard from "../components/JobCard";
import { ArrowRight, Bookmark } from "lucide-react";
import { Link } from "react-router-dom";

export default function SavedJobs() {
  const { savedJobs, loading } = useSavedJobs();
  if (loading) return <main className="saved-jobs-page" role="status"><h1>Loading saved jobs…</h1></main>;
  return <main className="saved-jobs-page">
    <span className="section-kicker">YOUR SHORTLIST</span>
    <h1>Saved jobs</h1>
    <p className="applications-intro">Keep the roles you’re considering in one place.</p>
    {savedJobs.length ? <div className="jobs-grid">{savedJobs.filter((item) => item.job).map((item) => <JobCard key={item._id} job={item.job}/>)}</div> : <div className="applications-empty"><Bookmark size={28}/><h2>No saved jobs yet</h2><p>Bookmark a role while browsing, and it’ll show up here.</p><Link className="btn btn-primary" to="/jobs">Browse jobs <ArrowRight size={16}/></Link></div>}
  </main>;
}
