import Sponsors from "./Sponsors.jsx";

// Company sponsors sit directly on the pane.
export default function TopBar({ sponsors }) {
  return (
    <div className="topbar">
      <Sponsors sponsors={sponsors} />
    </div>
  );
}
