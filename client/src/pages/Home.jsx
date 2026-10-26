import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  MapPin,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import JobCard from "../components/JobCard";
import { fetchJobs } from "../api/jobs";

export default function Home() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    fetchJobs()
      .then((data) => { if (active) setFeaturedJobs(data.slice(0, 3)); })
      .catch((error) => { if (active) setJobsError(error.message); })
      .finally(() => { if (active) setJobsLoading(false); });
    return () => { active = false; };
  }, []);

  function handleSearch(event) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (location.trim()) params.set("location", location.trim());

    navigate(`/jobs?${params.toString()}`);
  }

  return (
    <main>
      <section className="home-hero">
        <div className="hero-content">
          <span className="section-kicker">
            <Sparkles size={15} /> YOUR NEXT CHAPTER STARTS HERE
          </span>

          <h1>
            Find work that
            <br />
            <span>moves you forward.</span>
          </h1>

          <p>
            Discover opportunities, connect with great companies, and take the
            next step in your career with HireHub.
          </p>

          <form
            className="browse-search"
            onSubmit={handleSearch}
          >
            <label className="search-field">
              <Search size={20} />
              <input
                aria-label="Job title or skill"
                placeholder="Job title, skill or company"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <span className="search-divider" />

            <label className="search-field">
              <MapPin size={20} />
              <input
                aria-label="Preferred location"
                placeholder="City or remote"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </label>

            <button
              className="btn btn-primary"
              type="submit"
            >
              Find jobs <ArrowRight size={17} />
            </button>
          </form>

          <div className="hero-trust">
            <span>
              <CheckCircle2 size={16} /> Explore curated opportunities
            </span>
            <span>
              <CheckCircle2 size={16} /> Find your ideal fit
            </span>
          </div>
        </div>

        <div
          className="hero-visual"
          aria-hidden="true"
        >
          <div className="hero-orb orb-one" />
          <div className="hero-orb orb-two" />

          <div className="hero-art-card">
            <div className="hero-art-top">
              <span className="hero-art-icon">
                <BriefcaseBusiness size={24} />
              </span>
              <span className="hero-art-status">Opportunity awaits</span>
            </div>

            <div className="hero-art-lines">
              <span />
              <span />
              <span />
            </div>

            <div className="hero-art-tags">
              <span>Growth</span>
              <span>Skills</span>
              <span>Career</span>
            </div>

            <div className="hero-art-bottom">
              <div className="hero-art-avatar">
                <Users size={20} />
              </div>
              <div>
                <strong>Your next opportunity</strong>
                <p>One search closer</p>
              </div>
              <ArrowUpRight size={21} />
            </div>
          </div>

          <div className="floating-note">
            <Sparkles size={18} />
            <span>
              <strong>Make your move</strong>
              <small>Your future starts here</small>
            </span>
          </div>
        </div>
      </section>

      <section
        className="home-benefits"
        id="features"
      >
        <div>
          <span className="benefit-icon">
            <Search size={21} />
          </span>
          <strong>Discover opportunities</strong>
          <p>Explore roles that match your interests and skills.</p>
        </div>

        <div>
          <span className="benefit-icon">
            <Users size={21} />
          </span>
          <strong>Explore great teams</strong>
          <p>Learn about companies and the work they do.</p>
        </div>

        <div>
          <span className="benefit-icon">
            <ArrowUpRight size={21} />
          </span>
          <strong>Take your next step</strong>
          <p>Find opportunities to grow your career.</p>
        </div>
      </section>

      <section className="featured-section">
        <div className="featured-heading">
          <div>
            <span className="section-kicker">HANDPICKED FOR EXPLORATION</span>
            <h2>Featured opportunities</h2>
            <p>Explore a few roles from our latest opportunities.</p>
          </div>

          <Link
            className="btn btn-outline"
            to="/jobs"
          >
            Browse all jobs <ArrowUpRight size={17} />
          </Link>
        </div>

        {jobsLoading ? <p role="status">Loading featured opportunities…</p> : jobsError ? (
          <p role="alert">Featured jobs are temporarily unavailable. {jobsError}</p>
        ) : featuredJobs.length ? <div className="jobs-grid">
          {featuredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
            />
          ))}
        </div> : <p>No opportunities are available yet. Please check back soon.</p>}

        <p className="home-demo-note">
          Listings are provided by HireHub. Please review each role before applying.
        </p>
      </section>

      <section className="home-cta">
        <div>
          <span className="section-kicker">YOUR NEXT CHAPTER</span>
          <h2>Ready to find your next opportunity?</h2>
          <p>
            Start exploring jobs and discover where your skills can take you.
          </p>
        </div>

        <Link
          className="btn btn-primary"
          to="/jobs"
        >
          Explore jobs <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
