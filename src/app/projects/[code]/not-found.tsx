import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <section className="tile tile-hero">
      <div className="container" style={{ textAlign: "center" }}>
        <h1 className="t-display-lg" style={{ margin: 0 }}>No project with that code.</h1>
        <p className="t-caption" style={{ color: "var(--text-muted)" }}>Codes look like HOWL-POS-01. Renamed tasks keep their old codes as aliases.</p>
        <p style={{ marginTop: 24 }}><Link href="/projects" className="btn btn-secondary">All projects</Link></p>
      </div>
    </section>
  );
}
