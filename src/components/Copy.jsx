import SignUp from "./SignUp.jsx";

// Every word is its own element: the engine measures them, paints them onto the pane, and lets the arm nudge them.
// The sign-up sits just above the title; it is plain DOM on its own glass slab, not painted.
export function Words({ text }) {
  const words = text.split(" ");
  return words.map((w, i) => (
    <span key={i}>
      <i>{w}</i>
      {i < words.length - 1 ? " " : null}
    </span>
  ));
}

export default function Copy({ event, signupUrl }) {
  return (
    <div className="copy" id="copy">
      <SignUp href={signupUrl} available={Boolean(signupUrl)} />
      <h1 className="sub" id="event-title">
        <span>
          <Words text={event.title} />
        </span>
      </h1>
      <div className="desc">
        {event.paragraphs.map((p, i) => (
          <p key={i}><span><Words text={p} /></span></p>
        ))}
        <p className="meta">
          {event.details.map((d, i) => (
            <span key={i}><Words text={d} /></span>
          ))}
        </p>
      </div>
    </div>
  );
}
