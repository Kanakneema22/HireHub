import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="not-found">
      <span className="section-kicker">404 · PAGE NOT FOUND</span>

      <h1>This page took a different path.</h1>

      <p>The page may have moved or the link may be incorrect.</p>

      <Link
        className="btn btn-primary"
        to="/"
      >
        <ArrowLeft size={16} />
        Return home
      </Link>
    </main>
  );
}
