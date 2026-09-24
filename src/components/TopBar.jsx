import Sponsors from './Sponsors.jsx';

// The top bar: the hosts (CUPI and the Cornell Entrepreneurship Club), an x, and the sponsors, all plain DOM on the
// bare pane.
function Host({ h }) {
  const inner = (
    <>
      {h.img ? <img src={h.img} alt={h.wordmark ? '' : h.name} /> : null}
      {h.wordmark ? <span>{h.wordmark}</span> : null}
    </>
  );
  const cls = `logo ${h.kind}`;
  return h.href ? <a className={cls} href={h.href} target="_blank" rel="noopener">{inner}</a> : <span className={cls}>{inner}</span>;
}

export default function TopBar({ hosts, sponsors }) {
  return (
    <div className="topbar">
      <div className="hosts">
        {hosts.map((h) => <Host key={h.name} h={h} />)}
      </div>
      <span className="x" aria-hidden="true">×</span>
      <Sponsors sponsors={sponsors} />
    </div>
  );
}
