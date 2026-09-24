import GlassPane from './components/GlassPane.jsx';
import Copy from './components/Copy.jsx';
import TopBar from './components/TopBar.jsx';

// Edit the event here. Everything the page says lives in this one object.
export const EVENT = {
  title: 'Cornell University Physical Hackathon',
  paragraphs: [
    'The Cornell University Physical Hackathon is for builders who want to make real world impact.',
    'Teams will have a week to plan and design working solutions to challenges, then have a day on site to integrate and test on real robots.',
    '3D printers, extra hardware, and unlimited cloud/AI compute will be provided.',
  ],
  details: ['Date: November 14, 2026', 'Time: TBA', 'Location: Duffield Hall, Cornell University'],
  signupUrl: 'https://forms.gle/REPLACE-ME',   // point this at the real form
  hosts: [
    { name: 'CUPI', href: 'https://cornellphysicalintelligence.com/', kind: 'cupi', wordmark: 'CUPI' },   // add img when there is a CUPI logo file
    { name: 'Cornell Entrepreneurship Club', href: 'https://www.cornellec.com', img: '/logos/cec.svg', kind: 'cec', wordmark: 'Cornell Entrepreneurship Club' },
  ],
  sponsors: [
    { name: 'Google',     href: 'https://www.google.com', img: '/logos/google.png', kind: 'google' },
    { name: 'Anthropic',  href: 'https://www.anthropic.com', img: '/logos/anthropic.svg', kind: 'anthropic' },
    { name: 'Foundation', href: 'https://foundation.bot', img: '/logos/foundation.png', kind: 'foundation' },
    { name: 'Picogrid',   href: 'https://picogrid.com',   img: '/logos/picogrid.svg',   kind: 'picogrid' },
    { name: 'Kite',       href: 'https://kiteml.com',     img: '/logos/kite.svg',       kind: 'kite', wordmark: 'Kite' },
  ],
};

export default function App() {
  const bare = new URLSearchParams(location.search).has('bare');   // ?bare: the pane alone, for screenshots
  return (
    <>
      <GlassPane />
      {!bare && (
        <>
          <div className="page">
            <main className="hero">
              <Copy event={EVENT} signupUrl={EVENT.signupUrl} />
            </main>
          </div>
          <TopBar hosts={EVENT.hosts} sponsors={EVENT.sponsors} />
        </>
      )}
    </>
  );
}
