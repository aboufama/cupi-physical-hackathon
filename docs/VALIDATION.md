# Cornell Physical Hackathon — validation and launch status

The main site at `/` preserves the original glass-and-robot design. The experimental `/variation.html` remains separate and is not linked from the main site. Hosting is local only.

## Benchmark criteria

There is no universal certification that makes one website equivalent to every major hackathon. This work uses their common participant-facing requirements alongside measurable browser checks:

| Reference | Useful benchmark | Applied here |
| --- | --- | --- |
| [HackMIT](https://hackmit.org/?lang=en) | Clear event identity, format, dates, participant information, sponsor visibility | Original hero retained; dedicated format, event timeline, sponsor sections and FAQ |
| [Hack the North 2025](https://2025.hackthenorth.com/) | FAQs covering eligibility, experience, cost, event format and resources | Accessible FAQ addressing those questions; unknown facts are explicitly unconfirmed |
| [PennApps](https://pennapps.com/) | Honest registration status and a clear next action | Registration availability is driven by the real form URL; calendar and sharing work before applications open |
| [Cornell NanoScale Facility](https://www.cnf.cornell.edu/about/contact) | Official Duffield Hall location | 343 Campus Road, Ithaca, NY; direct directions link |

The reference sites informed information architecture, not copied content or unverified promises. Their event eligibility, funding, prizes and policies do not apply to this hackathon.

## Working features

- Seven linked sections: overview, format and equipment, timeline, venue, sponsors, FAQ, registration.
- Responsive glass navigation, active section indicator, accessible mobile menu, Escape handling, skip link, visible focus.
- Accessible schedule tabs with arrow/Home/End keyboard controls and correctly associated panels.
- Native keyboard-operable FAQ disclosures.
- Calendar download with a valid all-day November 14 entry and exclusive November 15 end date. The description states that times remain TBA and a calendar entry is not registration.
- Clipboard sharing with a selectable-link fallback and dismissible status feedback.
- Directions and all five company links return HTTP 200 at validation time.
- Live original robot scene, pause/resume, on-demand startup, and lightweight static renders of the same design. Browsing event information does not depend on loading WebGL or the robot mesh.
- Small screens, reduced-motion users and data-saver users opt in explicitly. Desktop pointer exploration starts the live hero; manually pausing is respected.
- Readable content and a static scene if WebGL is unavailable. The complete page is pre-rendered at build time. No-JavaScript visitors can read all event information, see both schedule phases, open FAQs and use directions.
- Self-hosted fonts with OFL license, descriptive metadata, favicon, image dimensions, and a valid robots.txt.

## Automated checks

`npm run build` succeeds. Run `npm run preview -- --host 127.0.0.1 --port 4173`, then `npm run validate`.

The browser suite checks 320, 390, 768, 1024 and 1440px widths; exactly one main heading; sponsor ordering; loaded images; internal anchors; no placeholder or empty links; no clipped section text or horizontal overflow; schedule tabs and keyboard behavior; FAQ behavior; registration navigation; calendar file contents; clipboard and notification dismissal; mobile-menu behavior; reduced-motion and WebGL fallback; live animation pause/resume; and a 200% zoom-equivalent CSS viewport.

Axe checks WCAG 2 A/AA, 2.1 AA and 2.2 AA at desktop and mobile widths. Automated checks supplement visual and keyboard review; they are not an accessibility certification.

Reports and screenshots are saved to `/tmp/cupi-validation/` by default. `SITE_TEST_URL`, `SITE_TEST_OUTPUT` and `CHROME_PATH` can override the local server, artifact directory and Chromium executable.

## Event inputs still needed before public registration

These are deliberately not invented or substituted with another event's rules:

1. Published registration form URL and organizer contact email (`src/data/event.js`).
2. Eligibility, team sizes, registration deadline, participation cost and experience requirements.
3. Confirmed planning dates, on-site times, rooms and check-in instructions.
4. Challenge briefs, judging criteria, submission rules and prizes, if applicable.
5. Code of conduct, accessibility contact, hardware safety rules and relevant organizer-approved policies.
6. Meals, accommodation and travel support, if any.

Until those are supplied, this is a functional pre-registration information site. It does not pretend to accept applications, collect a waitlist or send emails. No production hosting or ChatGPT Sites deployment was performed for this work.

## Final audit results

Lighthouse 13.5.0, Chromium on the local preview. Mobile uses simulated mobile throttling; desktop uses a desktop viewport and throttling profile. These are laboratory snapshots, not field Core Web Vitals or a guarantee for every device.

| Category | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 93 | 99 |
| Accessibility | 100 | 100 |
| Best practices | 100 | 100 |
| SEO | 100 | 100 |

Mobile: FCP 2.3 s, LCP 2.8 s, blocking time 0 ms, layout shift 0. Desktop: LCP 0.6 s, blocking time 0 ms, layout shift 0. Mobile LCP remains slightly above the [2.5-second good threshold](https://web.dev/articles/lcp) under the simulated profile; no claim of field Core Web Vitals compliance is made.

All 11 functional check groups passed, with zero failures and zero uncaught page/local-resource errors. Axe reported zero violations at both audited widths. No registration submission or email delivery was tested because no real registration service or contact was supplied.

Machine-readable results are in `docs/validation-results.json`. Full Lighthouse HTML reports, Axe details, screenshots and the downloaded calendar are in `/tmp/cupi-validation/`.
