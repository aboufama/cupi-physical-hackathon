export default function SignUp({ href, available = true }) {
  if (!available) return <span className="signup">Registration coming soon</span>;
  return (
    <a
      className="signup"
      href={href}
      target={available ? "_blank" : undefined}
      rel={available ? "noopener noreferrer" : undefined}
    >
      {available ? "Apply to build" : "Registration details"}{" "}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
