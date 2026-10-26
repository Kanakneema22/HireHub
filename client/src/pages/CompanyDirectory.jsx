import { useMemo, useState } from "react";
import { Building2, MapPin, Search, Sparkles } from "lucide-react";
import { sampleCompanies } from "../data/sampleCompanies";

export default function CompanyDirectory() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All cities");
  const cities = useMemo(() => ["All cities", ...new Set(sampleCompanies.map((company) => company.city).sort())], []);
  const filteredCompanies = useMemo(() => {
    const term = query.trim().toLowerCase();
    return sampleCompanies.filter((company) => {
      const matchesText = !term || `${company.name} ${company.city} ${company.state} ${company.focus}`.toLowerCase().includes(term);
      return matchesText && (city === "All cities" || company.city === city);
    });
  }, [city, query]);

  return (
    <main className="companies-page">
      <section className="companies-hero">
        <span className="section-kicker"><Sparkles size={14} /> EXPLORE INDIA'S TECH LANDSCAPE</span>
        <h1>Discover technology companies.</h1>
        <p>Browse sample company profiles and explore tech hubs across India.</p>
        <div className="companies-sample-notice"><strong>Demo directory</strong><span>These 90 entries are fictional examples created for the HireHub project. They are not real companies or job openings.</span></div>
        <div className="companies-controls">
          <label className="companies-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, city, or specialization" aria-label="Search companies" /></label>
          <label className="companies-city-label"><MapPin size={17} /><select value={city} onChange={(event) => setCity(event.target.value)} aria-label="Filter by city">{cities.map((option) => <option key={option}>{option}</option>)}</select></label>
        </div>
      </section>
      <section className="companies-content" aria-live="polite">
        <div className="companies-results-heading"><div><span className="section-kicker">COMPANY DIRECTORY</span><h2>Tech teams across India</h2></div><span>{filteredCompanies.length} sample {filteredCompanies.length === 1 ? "company" : "companies"}</span></div>
        {filteredCompanies.length ? <div className="companies-grid">{filteredCompanies.map((company, index) => <article className="company-card" key={company.id}>
          <div className={`company-mark company-mark-${index % 5}`}><Building2 size={20} /></div>
          <div className="company-card-heading"><span className="company-demo-badge">SAMPLE</span><h3>{company.name}</h3></div>
          <p className="company-location"><MapPin size={15} />{company.city}, {company.state}</p>
          <span className="company-focus">{company.focus}</span>
        </article>)}</div> : <div className="companies-empty"><Search size={25} /><h3>No sample companies match</h3><p>Try another company name or choose a different city.</p><button className="btn btn-outline" type="button" onClick={() => { setQuery(""); setCity("All cities"); }}>Clear search</button></div>}
        <p className="companies-disclaimer">All company names and profiles on this page are fictional demo data. Locations are illustrative Indian tech hubs and do not claim a real office address.</p>
      </section>
    </main>
  );
}
