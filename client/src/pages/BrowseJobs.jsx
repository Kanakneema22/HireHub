import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  BriefcaseBusiness,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import JobCard from "../components/JobCard";
import { fetchJobs } from "../api/jobs";

export default function BrowseJobs() {
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState(params.get("q") || "");
  const [location, setLocation] = useState(params.get("location") || "");
  const [jobType, setJobType] = useState("All");
  const [workplace, setWorkplace] = useState("All");
  const [sort, setSort] = useState("relevant");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchJobs()
      .then((data) => { if (active) { setJobs(data); setError(""); } })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredJobs = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    const searchLocation = location.trim().toLowerCase();

    let result = jobs.filter((job) => {
      const searchableText = [
        job.title,
        job.company,
        job.location,
        job.category,
        ...job.skills,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!searchText || searchableText.includes(searchText)) &&
        (!searchLocation ||
          job.location.toLowerCase().includes(searchLocation)) &&
        (jobType === "All" || job.type === jobType) &&
        (workplace === "All" || job.workplace === workplace)
      );
    });

    if (sort === "salary") {
      result = [...result].sort((a, b) => {
        const getSalary = (value) => Number(value.match(/\d+/)?.[0] || 0);

        return getSalary(b.salary) - getSalary(a.salary);
      });
    }

    return result;
  }, [jobs, query, location, jobType, workplace, sort]);

  function clearFilters() {
    setQuery("");
    setLocation("");
    setJobType("All");
    setWorkplace("All");
    setSort("relevant");
    setParams({});
  }

  function handleSearch(event) {
    event.preventDefault();

    const nextParams = {};
    if (query.trim()) nextParams.q = query.trim();
    if (location.trim()) nextParams.location = location.trim();
    setParams(nextParams);
  }

  return (
    <main className="browse-page">
      <section className="browse-hero">
        <span className="section-kicker">FIND YOUR NEXT OPPORTUNITY</span>
        <h1>Find a job that feels right.</h1>
        <p>
          Explore opportunities that match your skills, ambitions, and preferred
          way of working.
        </p>

        <form
          className="browse-search"
          onSubmit={handleSearch}
        >
          <label className="search-field">
            <Search size={20} />
            <input
              aria-label="Search jobs"
              placeholder="Job title, skill or company"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <span className="search-divider" />

          <label className="search-field">
            <MapPin size={20} />
            <input
              aria-label="Filter by location"
              placeholder="Location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </label>

          <button
            className="btn btn-primary"
            type="submit"
          >
            Search <Search size={16} />
          </button>
        </form>
      </section>

      <section className="browse-content">
        <div className="browse-heading">
          <div>
            <span className="section-kicker">EXPLORE OPPORTUNITIES</span>
            <h2>Jobs for your next chapter</h2>
            <p>
              {loading ? "Loading opportunities…" : `Showing ${filteredJobs.length} ${filteredJobs.length === 1 ? "role" : "roles"}`}
            </p>
          </div>

          <label className="sort-select">
            <ArrowDownUp size={17} />
            <select
              aria-label="Sort jobs"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="relevant">Most relevant</option>
              <option value="salary">Salary (highest first)</option>
            </select>
          </label>
        </div>

        <div className="browse-layout">
          <aside className="filter-panel">
            <div className="filter-title">
              <SlidersHorizontal size={18} />
              <strong>Filters</strong>
              <button onClick={clearFilters}>Clear all</button>
            </div>

            <label
              className="filter-label"
              htmlFor="job-type"
            >
              Job type
            </label>
            <select
              id="job-type"
              value={jobType}
              onChange={(event) => setJobType(event.target.value)}
            >
              <option>All</option>
              <option>Full-time</option>
              <option>Internship</option>
              <option>Part-time</option>
              <option>Contract</option>
            </select>

            <label
              className="filter-label"
              htmlFor="workplace"
            >
              Workplace
            </label>
            <select
              id="workplace"
              value={workplace}
              onChange={(event) => setWorkplace(event.target.value)}
            >
              <option>All</option>
              <option>Remote</option>
              <option>Hybrid</option>
              <option>On-site</option>
            </select>

            <div className="filter-note">
              <BriefcaseBusiness size={19} />
              <strong>Find your fit</strong>
              <p>Use search and filters to narrow down your opportunities.</p>
            </div>
          </aside>

          <div className="browse-results">
            {loading ? (
              <div className="empty-state" role="status">Loading jobs…</div>
            ) : error ? (
              <div className="empty-state" role="alert">
                <h3>Jobs are temporarily unavailable</h3>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>
              </div>
            ) : filteredJobs.length > 0 ? (
              <div className="jobs-grid">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Search size={30} />
                <h3>No matching jobs found</h3>
                <p>Try changing your keywords or filters.</p>
                <button
                  className="btn btn-primary"
                  onClick={clearFilters}
                >
                  <X size={16} /> Clear filters
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="demo-notice">
          Sample opportunities are loaded from the HireHub jobs service.
          <Link to="/"> Back to home</Link>
        </div>
      </section>
    </main>
  );
}
