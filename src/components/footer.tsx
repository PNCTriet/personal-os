export function Footer({ demo }: { demo: boolean }) {
  return (
    <footer className="footer">
      <div className="container">
        <p className="t-fine" style={{ margin: "0 0 16px" }}>
          {demo
            ? "Demo mode. Sample data lives in memory on the server and resets when it restarts. Connect Supabase to keep your data."
            : "Private workspace. Signed in as the owner. All data is protected by row-level security."}
        </p>
        <div className="rule t-fine" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
          <span>Personal OS v0.1 · HOWL LAB</span>
          <span>
            <a className="link" href="/api/v1/health">API status</a>
            <span aria-hidden="true"> · </span>
            <a className="link" href="https://github.com/PNCTriet/personal-os">Source</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
