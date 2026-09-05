import Link from "next/link";
import { ArrowLeft, FileStack } from "lucide-react";
export default function ImportPage() {
  return (
    <section className="placeholder">
      <span className="empty-icon">
        <FileStack size={30} />
      </span>
      <h1>Bring your backlog together</h1>
      <p>
        This is the home for Backlog Import. File upload, field mapping, and
        validation will be built here to bring existing campus records into
        LostLink.
      </p>
      <div className="info-notice">
        Coming next · Importing and saving reports are not enabled yet.
      </div>
      <Link className="button" href="/reports">
        <ArrowLeft size={15} />
        Back to reports
      </Link>
    </section>
  );
}
