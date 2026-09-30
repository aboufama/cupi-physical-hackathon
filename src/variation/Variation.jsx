import { EVENT } from '../App.jsx';
import RobotStage from './RobotStage.jsx';
import './variation.css';

const Arrow = ({ diagonal = false }) => <span aria-hidden="true">{diagonal ? '↗' : '↘'}</span>;

export default function Variation() {
  const signupReady = EVENT.signupUrl && !EVENT.signupUrl.includes('REPLACE-ME');

  return (
    <div className="variation-page">
      <a className="variation-skip" href="#main">Skip to content</a>
      <header className="variation-header">
        <a className="variation-brand" href="#" aria-label="Cornell Physical Hackathon home">
          <span className="variation-brand-symbol" aria-hidden="true">c<span>↗</span></span>
          <span>CORNELL UNIVERSITY<br />PHYSICAL HACKATHON</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#about">The format <Arrow diagonal /></a>
          <a href="#sponsors">Our sponsors <Arrow diagonal /></a>
        </nav>
        <span className="variation-edition">ITHACA, NY · 2026</span>
      </header>

      <main id="main">
        <section className="variation-hero" aria-labelledby="event-title">
          <div className="variation-hero-intro">
            <p className="variation-eyebrow"><span className="variation-dot" /> IDEAS INTO THE PHYSICAL WORLD</p>
            <span className="variation-index">EXHIBIT 001 / BUILD SOMETHING REAL</span>
          </div>
          <div className="variation-hero-grid">
            <div className="variation-title-block">
              <h1 id="event-title" aria-label="Cornell University Physical Hackathon"><span>PHYSICAL</span><span>HACK<span className="variation-title-star" aria-hidden="true">✳</span></span><span>ATHON<span className="variation-title-period">.</span></span></h1>
              <div className="variation-hero-description">
                <span className="variation-large-arrow" aria-hidden="true">↘</span>
                <div>
                  <p>A week to imagine.<br />A day to make it real.</p>
                  <a className="variation-text-link" href="#about">Explore the format <Arrow diagonal /></a>
                </div>
              </div>
            </div>
            <figure className="variation-exhibit">
              <div className="variation-exhibit-label"><span>FROM CODE TO MOTION</span><span>[ 01 — 06 ]</span></div>
              <RobotStage className="variation-robot" />
              <figcaption><span>REAL HARDWARE.<br />REAL POSSIBILITIES.</span><span className="variation-exhibit-cross" aria-hidden="true">+</span></figcaption>
            </figure>
          </div>
          <div className="variation-event-strip">
            <div className="variation-date"><span>14</span><div>NOVEMBER<br />2026</div></div>
            <div className="variation-venue"><span className="variation-label">MEET US AT</span><strong>Duffield Hall</strong><span>Cornell University · Time TBA</span></div>
            <div className="variation-registration">
              {signupReady ? <a className="variation-register-link" href={EVENT.signupUrl} target="_blank" rel="noreferrer">Sign up <Arrow diagonal /></a> : <><span className="variation-label">YOUR NEXT BUILD STARTS HERE</span><span className="variation-registration-state"><span className="variation-dot" /> Registration coming soon</span></>}
            </div>
          </div>
        </section>

        <section className="variation-about" id="about" aria-labelledby="about-title">
          <div className="variation-section-heading"><span className="variation-eyebrow">01 / THE FORMAT</span><span aria-hidden="true">↓</span></div>
          <div className="variation-about-heading"><h2 id="about-title">Less hypothetical.<br />More <span>hands-on.</span></h2><p>{EVENT.paragraphs[0]}</p></div>
          <div className="variation-format">
            <article><div className="variation-format-top"><span>01</span><span className="variation-format-glyph" aria-hidden="true">↗</span></div><h3>One week.<br />Plan & design.</h3><p>Work with your team to turn a challenge into a working solution. Start with an idea. Give it a plan.</p></article>
            <article><div className="variation-format-top"><span>02</span><span className="variation-format-glyph" aria-hidden="true">✳</span></div><h3>One day.<br />Build & test.</h3><p>Come together at Duffield Hall to integrate your solution and test it on real robots.</p></article>
            <article><div className="variation-format-top"><span>03</span><span className="variation-format-glyph" aria-hidden="true">+</span></div><h3>Your ideas.<br />The tools to build.</h3><p>3D printers, extra hardware, and unlimited cloud/AI compute will be provided.</p></article>
          </div>
        </section>

        <section className="variation-sponsors" id="sponsors" aria-labelledby="sponsors-title">
          <div className="variation-section-heading"><h2 className="variation-eyebrow" id="sponsors-title">02 / OUR SPONSORS</h2><span>THE COMPANIES BEHIND THE BUILD</span></div>
          <div className="variation-sponsor-logos">{EVENT.sponsors.map(sponsor => <a key={sponsor.name} className={`variation-sponsor variation-sponsor-${sponsor.kind}`} href={sponsor.href} target="_blank" rel="noreferrer" aria-label={`${sponsor.name} website (opens in a new tab)`}><img src={sponsor.img} alt={sponsor.name} />{sponsor.kind === 'kite' && <span aria-hidden="true">Kite</span>}</a>)}</div>
        </section>
      </main>

      <footer className="variation-footer"><span>CORNELL UNIVERSITY PHYSICAL HACKATHON</span><a href={import.meta.env.BASE_URL}>Original version <Arrow diagonal /></a><span className="variation-seed">DESIGN SEED / 2673036982</span></footer>
    </div>
  );
}
