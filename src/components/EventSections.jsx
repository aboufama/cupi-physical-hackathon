import { useState } from "react";
import Sponsors from "./Sponsors.jsx";
import { downloadCalendar } from "../lib/calendar.js";

const questions = [
  [
    "What is a physical hackathon?",
    "A team-based build event where software meets the physical world. You will plan and design a solution, then integrate and test it on real robots at Cornell.",
  ],
  [
    "When and where is the event?",
    "The on-site event is November 14, 2026 at Duffield Hall, Cornell University, in Ithaca, New York. Start and end times, room assignments, and check-in instructions will be announced.",
  ],
  [
    "Who can participate? Do I need robotics experience?",
    "Eligibility, experience requirements, and the application process are being finalized. These details will be published here with registration information.",
  ],
  [
    "Do I need a team before registering?",
    "Team size limits and team formation details have not been announced yet. Check the registration information before making team arrangements.",
  ],
  [
    "What equipment will be available?",
    "3D printers, extra hardware, and unlimited cloud/AI compute will be provided. The specific hardware inventory, supported platforms, and access instructions will be shared ahead of the event.",
  ],
  [
    "What should I bring?",
    "Plan for hands-on work with your team. A final packing list, software setup guide, and equipment safety requirements will be published before the event.",
  ],
  [
    "Is there a fee? Are meals or travel covered?",
    "Attendance costs, meals, accommodation, and travel support have not been announced. Please wait for confirmed logistics before booking travel.",
  ],
  [
    "What are the challenges, prizes, and judging criteria?",
    "Challenge briefs, prize details, and judging criteria are still to be announced. The confirmed format is one week to plan and design, followed by a day of integration and testing on real robots.",
  ],
  [
    "Where are the participation and accessibility policies?",
    "The event code of conduct, accessibility contact, and hardware safety guidance will be published alongside registration.",
  ],
];
const Arrow = () => <span aria-hidden="true">↗</span>;
function Label({ number, children }) {
  return (
    <p className="section-label">
      <span>{number}</span>
      {children}
    </p>
  );
}

export default function EventSections({ event }) {
  const [phase, setPhase] = useState("planning");
  const [notice, setNotice] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  function calendar() {
    downloadCalendar(event);
    setNotice(
      "Your calendar file is ready. The event time is still to be announced.",
    );
  }
  async function share() {
    const url = `${location.origin}/`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Page link copied.");
      setCopyFallback("");
    } catch {
      setCopyFallback(url);
      setNotice("Select and copy the page link below.");
    }
  }
  function changeTab(event) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "planning"
        : event.key === "End"
          ? "onsite"
          : phase === "planning"
            ? "onsite"
            : "planning";
    setPhase(next);
    document.getElementById(`tab-${next}`).focus();
  }
  return (
    <div className="event-content">
      <section
        className="content-section about-section"
        id="about"
        aria-labelledby="about-title"
      >
        <Label number="01">The idea</Label>
        <div className="section-intro">
          <h2 id="about-title">
            Good ideas deserve
            <br />
            <em>a place in the real world.</em>
          </h2>
          <div className="intro-copy">
            <p>
              Build beyond the screen. The Cornell University Physical Hackathon
              brings teams together to turn ideas into working solutions—with
              real hardware, real constraints, and room to experiment.
            </p>
            <p>
              Bring the thinking. We’ll provide the tools to make it tangible.
            </p>
          </div>
        </div>
        <div className="event-facts" aria-label="Event at a glance">
          <div>
            <strong>01 week</strong>
            <span>To plan & design</span>
          </div>
          <div>
            <strong>01 day</strong>
            <span>To integrate & test</span>
          </div>
          <div>
            <strong>Real robots</strong>
            <span>From code to motion</span>
          </div>
        </div>
      </section>

      <section
        className="content-section"
        id="format"
        aria-labelledby="format-title"
      >
        <Label number="02">The experience</Label>
        <div className="section-intro">
          <h2 id="format-title">
            Think it through.
            <br />
            <em>Then make it work.</em>
          </h2>
          <p className="section-lede">
            A week of preparation makes space for the part that matters: testing
            your ideas in the physical world.
          </p>
        </div>
        <div className="format-steps">
          <article>
            <span className="step-number">01 / DESIGN</span>
            <h3>Start with a challenge.</h3>
            <p>
              Work with your team to plan and design a working solution. Use the
              planning week to explore your approach before you arrive.
            </p>
          </article>
          <article>
            <span className="step-number">02 / INTEGRATE</span>
            <h3>Bring the pieces together.</h3>
            <p>
              Spend the on-site day connecting your solution to real robots,
              supported by fabrication tools, hardware, and compute.
            </p>
          </article>
          <article>
            <span className="step-number">03 / TEST</span>
            <h3>Learn from the real thing.</h3>
            <p>
              Put your work to the test. See how your design behaves, identify
              what needs to change, and refine it with your team.
            </p>
          </article>
        </div>
        <div className="resources-panel">
          <div>
            <span className="eyebrow">A WORKBENCH, NOT JUST A WORKSPACE</span>
            <h3>The tools are here.</h3>
          </div>
          <ul className="resource-list">
            <li>
              <span>01</span>
              <strong>3D printers</strong>
              <span>Prototype physical parts.</span>
            </li>
            <li>
              <span>02</span>
              <strong>Extra hardware</strong>
              <span>Connect your ideas to the world.</span>
            </li>
            <li>
              <span>03</span>
              <strong>Cloud & AI compute</strong>
              <span>Unlimited compute provided.</span>
            </li>
          </ul>
        </div>
      </section>

      <section
        className="content-section schedule-section"
        id="schedule"
        aria-labelledby="schedule-title"
      >
        <Label number="03">The timeline</Label>
        <div className="section-intro">
          <h2 id="schedule-title">
            A little runway.
            <br />
            <em>A day of real progress.</em>
          </h2>
          <div>
            <p className="section-lede">
              The on-site date is set. The detailed program and planning-week
              dates are coming soon.
            </p>
            <button type="button" className="text-button" onClick={calendar}>
              Save November 14 <span aria-hidden="true">↓</span>
            </button>
          </div>
        </div>
        <div
          className="schedule-tabs"
          role="tablist"
          aria-label="Hackathon phases"
          onKeyDown={changeTab}
        >
          <button
            id="tab-planning"
            type="button"
            role="tab"
            aria-selected={phase === "planning"}
            aria-controls="panel-planning"
            tabIndex={phase === "planning" ? 0 : -1}
            onClick={() => setPhase("planning")}
          >
            The planning week
          </button>
          <button
            id="tab-onsite"
            type="button"
            role="tab"
            aria-selected={phase === "onsite"}
            aria-controls="panel-onsite"
            tabIndex={phase === "onsite" ? 0 : -1}
            onClick={() => setPhase("onsite")}
          >
            November 14 · On site
          </button>
        </div>
        <div
          id="panel-planning"
          className="schedule-panel"
          role="tabpanel"
          aria-labelledby="tab-planning"
          tabIndex={0}
          hidden={phase !== "planning"}
        >
          <div className="schedule-date">
            <span>BEFORE THE EVENT</span>
            <strong>One week.</strong>
            <small>Exact dates to be announced</small>
          </div>
          <div className="schedule-description">
            <h3>Plan and design with your team.</h3>
            <p>
              Develop your approach to the challenge and prepare your solution
              for the on-site integration day.
            </p>
            <p className="muted">
              Challenge release and preparation instructions will be shared when
              confirmed.
            </p>
          </div>
        </div>
        <div
          id="panel-onsite"
          className="schedule-panel"
          role="tabpanel"
          aria-labelledby="tab-onsite"
          tabIndex={0}
          hidden={phase !== "onsite"}
        >
          <div className="schedule-date">
            <span>SATURDAY · NOVEMBER 2026</span>
            <strong>14</strong>
            <small>Duffield Hall · Time TBA</small>
          </div>
          <div className="schedule-description">
            <h3>Integrate. Test. Iterate.</h3>
            <p>
              Bring your team’s solution to Cornell and put it to work on real
              robots.
            </p>
            <p className="muted">
              Check-in, session times, room assignments, and any final
              presentations will be announced in the detailed program.
            </p>
          </div>
        </div>
      </section>

      <section
        className="content-section visit-section"
        id="visit"
        aria-labelledby="visit-title"
      >
        <Label number="04">The place</Label>
        <div className="visit-grid">
          <div>
            <h2 id="visit-title">
              Meet us
              <br />
              <em>at Duffield.</em>
            </h2>
            <p className="venue-address">
              Duffield Hall, Cornell University
              <br />
              343 Campus Road
              <br />
              Ithaca, NY 14853
            </p>
            <a
              className="pill-button"
              href={event.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get directions <Arrow />
            </a>
          </div>
          <div className="venue-placard">
            <span className="eyebrow">CORNELL UNIVERSITY / ITHACA, NY</span>
            <div className="venue-coordinate" aria-hidden="true">
              Ithaca,
              <br />
              New York.
            </div>
            <div className="venue-bottom">
              <strong>Duffield Hall</strong>
              <span>November 14, 2026</span>
            </div>
          </div>
        </div>
        <div className="visit-notes">
          <p>
            <strong>Before you travel</strong>Room details, arrival
            instructions, meals, and travel support are still to be confirmed.
          </p>
          <p>
            <strong>Accessibility & accommodations</strong>
            {event.contactEmail ? (
              <>
                Contact{" "}
                <a href={`mailto:${event.contactEmail}`}>
                  {event.contactEmail}
                </a>{" "}
                with accommodation questions.
              </>
            ) : (
              "Venue access details and the organizer contact will be published before registration opens."
            )}
          </p>
        </div>
      </section>

      <section
        className="content-section sponsor-section"
        id="sponsors"
        aria-labelledby="sponsors-title"
      >
        <Label number="05">The companies</Label>
        <div className="sponsor-heading">
          <h2 id="sponsors-title">Built with support.</h2>
          <p>The companies behind the hackathon.</p>
        </div>
        <Sponsors sponsors={event.sponsors} />
      </section>

      <section
        className="content-section faq-section"
        id="faq"
        aria-labelledby="faq-title"
      >
        <div className="faq-heading">
          <Label number="06">A few answers</Label>
          <h2 id="faq-title">
            Before
            <br />
            <em>you build.</em>
          </h2>
          <p>
            What we know so far.
            <br />
            More details are on the way.
          </p>
          {event.contactEmail && (
            <a className="text-button" href={`mailto:${event.contactEmail}`}>
              Ask the organizers <Arrow />
            </a>
          )}
        </div>
        <div className="faq-list">
          {questions.map(([question, answer], index) => (
            <details key={question} name="event-faq">
              <summary>
                <span className="faq-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{question}</span>
                <span className="faq-toggle" aria-hidden="true">
                  +
                </span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section
        className="content-section registration-section"
        id="register"
        aria-labelledby="registration-title"
      >
        <Label number="07">Your next build</Label>
        <div className="registration-grid">
          <div>
            <h2 id="registration-title">
              Make something
              <br />
              <em>that matters.</em>
            </h2>
            <p>
              November 14, 2026.
              <br />
              Duffield Hall. Real robots. Your ideas.
            </p>
          </div>
          <div className="registration-card">
            <span className="eyebrow">
              {event.signupUrl
                ? "REGISTRATION"
                : "REGISTRATION DETAILS COMING SOON"}
            </span>
            <h3>
              {event.signupUrl ? "Ready to build?" : "First, save the date."}
            </h3>
            <p>
              {event.signupUrl
                ? "Use the registration form to apply and review the participation requirements."
                : "The registration link, eligibility requirements, and team guidelines will be posted here once confirmed."}
            </p>
            {event.signupUrl ? (
              <a
                className="pill-button primary"
                href={event.signupUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open registration <Arrow />
              </a>
            ) : (
              <button
                className="pill-button primary"
                type="button"
                onClick={calendar}
              >
                Add to calendar <span aria-hidden="true">↓</span>
              </button>
            )}
            <button className="text-button" type="button" onClick={share}>
              Copy page link <span aria-hidden="true">↗</span>
            </button>
            {copyFallback && (
              <label className="copy-fallback">
                Page link
                <input
                  readOnly
                  value={copyFallback}
                  onFocus={(event) => event.target.select()}
                />
              </label>
            )}
            <p className="registration-note">
              {event.signupUrl
                ? "Registration is handled through the linked form."
                : "Saving the date does not register you for the event."}
            </p>
          </div>
        </div>
        <div className="contact-line">
          {event.contactEmail ? (
            <>
              <span>Questions, partnerships, or accommodations?</span>
              <a href={`mailto:${event.contactEmail}`}>
                {event.contactEmail} <Arrow />
              </a>
            </>
          ) : (
            <>
              <span>Looking for an organizer?</span>
              <span>Contact details will be published with registration.</span>
            </>
          )}
        </div>
      </section>
      <div
        className={`site-notice ${notice ? "is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice && (
          <>
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </>
        )}
      </div>
    </div>
  );
}
