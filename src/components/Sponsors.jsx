export default function Sponsors({ sponsors }) {
  return (
    <div className="sponsors">
      {sponsors.map((s) => (
        <a key={s.name} className={`logo ${s.kind}`} href={s.href} target="_blank" rel="noopener">
          <img src={s.img} alt={s.wordmark ? '' : s.name} />
          {s.wordmark ? <span>{s.wordmark}</span> : null}
        </a>
      ))}
    </div>
  );
}
