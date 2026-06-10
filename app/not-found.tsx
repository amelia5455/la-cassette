import Link from "next/link";

export default function NotFound() {
  return (
    <div className="device">
      <div className="bar">
        <div className="logo">La Cassette</div>
      </div>
      <div className="stage">
        <div className="eyebrow">
          <span className="br">[</span> side b <span className="br">]</span>
        </div>
        <h1>This tape&apos;s gone.</h1>
        <p className="sub">
          The link may have expired or never existed. Tapes are kept for a while, but not forever.
        </p>
        <div className="stack">
          <Link href="/" className="btn" style={{ textAlign: "center", textDecoration: "none", display: "block" }}>
            Make your own
          </Link>
        </div>
      </div>
      <div className="footer">
        <span>
          la cassette<b>.v0</b>
        </span>
        <span>
          <b>404</b> view
        </span>
      </div>
    </div>
  );
}
