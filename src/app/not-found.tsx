import Link from "next/link";

export default function NotFound() {
  return (
    <section className="tile tile-hero">
      <div className="container" style={{ textAlign: "center" }}>
        <h1 className="t-display-lg" style={{ margin: 0 }}>This page isn’t here.</h1>
        <p style={{ marginTop: 24 }}><Link href="/" className="btn btn-secondary">Back to overview</Link></p>
      </div>
    </section>
  );
}
