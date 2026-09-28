import Link from "next/link";
import { AlarmClock, BookLock, Fingerprint, LockKeyhole, Radar, ShieldCheck, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark"><LockKeyhole size={17} /></span>
          <span><b>EXIGENT</b><small>Emergency authority</small></span>
        </Link>
        <div className="landing-actions">
          <a className="btn-secondary" href="#architecture">Architecture</a>
          <Link className="btn" href="/command">Enter Command <Zap size={15} /></Link>
        </div>
      </nav>

      <section className="hero">
        <div>
          <span className="eyebrow">GenLayer Studionet · 61999</span>
          <h1>Break glass.<br /><em>Not trust.</em></h1>
          <p className="hero-copy">
            Protocols commit to emergency powers before the crisis. When an incident happens,
            GenLayer independently checks the evidence against that frozen charter. Only a
            finalized decision can mint the exact, expiring capability required to execute the emergency action.
          </p>
          <div className="hero-cta">
            <Link className="btn" href="/charter/new"><BookLock size={16} /> Publish a charter</Link>
            <Link className="btn-secondary" href="/incident/new"><Radar size={16} /> Open an incident</Link>
          </div>
        </div>

        <div className="hero-card" aria-label="Authority chain">
          <h3>Authority cannot skip a stage</h3>
          <div className="authority-chain">
            <div className="authority-node"><span className="node-index">01</span><div><strong>Charter is frozen</strong><span>Trigger language, source hosts, hard limits and target are committed before the incident.</span></div></div>
            <div className="authority-arrow" />
            <div className="authority-node"><span className="node-index">02</span><div><strong>Evidence is independently fetched</strong><span>Validators retrieve approved public sources and interpret them against the exact charter.</span></div></div>
            <div className="authority-arrow" />
            <div className="authority-node"><span className="node-index">03</span><div><strong>Finality mints capability</strong><span>Accepted is not enough. Authority appears only after the assessment transaction finalizes.</span></div></div>
            <div className="authority-arrow" />
            <div className="authority-node"><span className="node-index">04</span><div><strong>Capability gates execution</strong><span>Target, action, duration, holder, expiry and digest are bound. Replay and tampering fail.</span></div></div>
          </div>
        </div>
      </section>

      <div className="band">
        <div className="band-inner">
          <div className="metric"><strong>61999</strong><span>Studionet chain</span></div>
          <div className="metric"><strong>Finalized</strong><span>Authority issuance point</span></div>
          <div className="metric"><strong>Single-use</strong><span>Execution capability</span></div>
          <div className="metric"><strong>Fail closed</strong><span>Ambiguity produces no power</span></div>
        </div>
      </div>

      <section id="architecture" className="section">
        <div className="section-head">
          <div><span className="kicker">Designed around the trust boundary</span><h2>No decorative consensus.</h2></div>
          <p>EXIGENT puts GenLayer between a privileged operator and extraordinary protocol power. Remove consensus and the intended authority model stops working.</p>
        </div>
        <div className="feature-grid">
          <article className="feature-card"><BookLock size={25} /><h3>Immutable charter versions</h3><p>New emergency policy cannot become active immediately. Each incident snapshots the active charter digest so later versions cannot rewrite the case.</p></article>
          <article className="feature-card"><Radar size={25} /><h3>Source-grounded assessment</h3><p>Evidence URLs must come from charter-approved hosts. Validators independently fetch the same frozen URLs and compare substantive trigger findings.</p></article>
          <article className="feature-card"><Fingerprint size={25} /><h3>Exact action binding</h3><p>The capability binds incident, charter, target, action class and duration. Any modified execution parameters produce a different digest and fail.</p></article>
          <article className="feature-card"><AlarmClock size={25} /><h3>Expiring authority</h3><p>Capability expiry starts when the finalized child issuance executes, not when the assessment was merely accepted, avoiding already-expired permissions.</p></article>
          <article className="feature-card"><ShieldCheck size={25} /><h3>Protected target</h3><p>The demo vault has no direct administrator pause. Emergency pause methods accept calls only from CapabilityGate, making the consensus path operationally necessary.</p></article>
          <article className="feature-card"><Zap size={25} /><h3>One-shot execution</h3><p>A valid capability is consumed before its finality-gated child action is emitted. Replay fails even when the original action was legitimately authorized.</p></article>
        </div>
      </section>

      <footer className="landing-footer"><span>EXIGENT · GenLayer emergency authority primitive</span><span>Stable Studionet · Chain 61999 · GEN</span></footer>
    </div>
  );
}
