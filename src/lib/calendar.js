const escape = (value) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
export function eventCalendar(event) {
  const next = new Date(`${event.date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const date = (value) => value.replaceAll("-", "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cornell Physical Hackathon//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:physical-hackathon-20261114@cornellphysicalintelligence.com",
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${date(event.date)}`,
    `DTEND;VALUE=DATE:${date(next.toISOString().slice(0, 10))}`,
    `SUMMARY:${escape(event.title)}`,
    `LOCATION:${escape(`Duffield Hall, ${event.address}`)}`,
    "DESCRIPTION:Save the date. Event start and end times are to be announced. This calendar entry does not register you for the event.",
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return (
    lines.map((line) => line.match(/.{1,73}/g).join("\r\n ")).join("\r\n") +
    "\r\n"
  );
}
export function downloadCalendar(event) {
  const url = URL.createObjectURL(
    new Blob([eventCalendar(event)], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "cornell-physical-hackathon-2026.ics";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
