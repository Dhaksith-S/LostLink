import Link from "next/link";
import { FileSearch } from "lucide-react";
export default function NotFound() {
  return (
    <section className="placeholder">
      <span className="empty-icon">
        <FileSearch size={30} />
      </span>
      <h1>Page not found</h1>
      <p>
        This page is not part of LostLink Admin. Return to the dashboard to
        browse live reports.
      </p>
      <Link className="button primary" href="/reports">
        Back to reports
      </Link>
    </section>
  );
}
