import GlassPane from "./components/GlassPane.jsx";
import Copy from "./components/Copy.jsx";
import TopBar from "./components/TopBar.jsx";
import { EVENT } from "./data/event.js";
export { EVENT } from "./data/event.js";

export default function App() {
  const bare =
    typeof location !== "undefined" &&
    new URLSearchParams(location.search).has("bare");
  return (
    <>
      <GlassPane />
      {!bare && (
        <>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <main id="main" tabIndex={-1}>
            <section
              className="page"
              id="home"
              aria-labelledby="event-title"
            >
              <TopBar sponsors={EVENT.sponsors} />
              <div className="hero">
                <Copy event={EVENT} signupUrl={EVENT.signupUrl} />
              </div>
            </section>
          </main>
        </>
      )}
    </>
  );
}
