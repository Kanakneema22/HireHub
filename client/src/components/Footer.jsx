import { BriefcaseBusiness } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <Link
        className="brand"
        to="/"
      >
        <span className="brand-icon">
          <BriefcaseBusiness size={21} />
        </span>
        <span>
          Hire<span className="brand-accent">Hub</span>
        </span>
      </Link>

      <p>Built for the next step in your career.</p>

      <span>© {new Date().getFullYear()} HireHub</span>
    </footer>
  );
}
