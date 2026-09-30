import { useEffect, useState } from "react";
const links = [
  ["about", "About"],
  ["format", "Format"],
  ["schedule", "Schedule"],
  ["visit", "Visit"],
  ["faq", "FAQ"],
];
export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-15% 0px -60% 0px" },
    );
    for (const [id] of links) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        document.getElementById("menu-toggle")?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  return (
    <nav
      className={`site-nav ${open ? "is-open" : ""}`}
      aria-label="Main navigation"
    >
      <a
        className="nav-home"
        href="#home"
        aria-label="PH / 26 — Physical Hackathon home"
        onClick={() => setOpen(false)}
      >
        PH<span aria-hidden="true"> / 26</span>
      </a>
      <button
        id="menu-toggle"
        className="menu-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="section-links"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Close −" : "Explore +"}
      </button>
      <div id="section-links" className="section-links">
        {links.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active === id ? "location" : undefined}
            onClick={() => setOpen(false)}
          >
            {label}
          </a>
        ))}
      </div>
      <a className="nav-apply" href="#register" onClick={() => setOpen(false)}>
        Registration <span aria-hidden="true">↗</span>
      </a>
    </nav>
  );
}
