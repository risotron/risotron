import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <section className="page">
      <p className="eyebrow">Phase 1</p>
      <h1>Risotron Studio</h1>
      <p className="lede">Bootstrap a project or create a release server.</p>
      <div className="action-grid">
        <Link className="action-card" to="/new-project">
          <span>New Project</span>
          <small>Prepare the App X scaffold flow.</small>
        </Link>
        <Link className="action-card" to="/new-release-server">
          <span>New Release Server</span>
          <small>Prepare the GitHub release setup flow.</small>
        </Link>
      </div>
    </section>
  );
}
