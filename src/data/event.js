export const EVENT = {
  title: "Cornell University Physical Hackathon",
  paragraphs: [
    "The Cornell University Physical Hackathon is for builders who want to make real world impact.",
    "Teams will have a week to plan and design working solutions to challenges, then have a day on site to integrate and test on real robots.",
    "3D printers, extra hardware, and unlimited cloud/AI compute will be provided.",
  ],
  details: [
    "Date: November 14, 2026",
    "Time: TBA",
    "Location: Duffield Hall, Cornell University",
  ],
  signupUrl: null, // Set the published registration form URL when registration opens.
  contactEmail: null, // Set the organizer contact before public launch.
  date: "2026-11-14",
  address: "343 Campus Road, Ithaca, NY 14853",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Duffield+Hall+Cornell+University",
  hosts: [
    {
      name: "CUPI",
      href: "https://cornellphysicalintelligence.com/",
      kind: "cupi",
      wordmark: "CUPI",
    }, // add img when there is a CUPI logo file
    {
      name: "Cornell Entrepreneurship Club",
      href: "https://www.cornellec.com",
      img: `${import.meta.env.BASE_URL}logos/cec.svg`,
      kind: "cec",
      wordmark: "Cornell Entrepreneurship Club",
    },
  ],
  sponsors: [
    {
      name: "Google",
      href: "https://www.google.com",
      img: `${import.meta.env.BASE_URL}logos/google.png`,
      kind: "google",
      width: 544,
      height: 184,
    },
    {
      name: "Anthropic",
      href: "https://www.anthropic.com",
      img: `${import.meta.env.BASE_URL}logos/anthropic.svg`,
      kind: "anthropic",
      width: 1024.2,
      height: 115,
    },
    {
      name: "Foundation",
      href: "https://foundation.bot",
      img: `${import.meta.env.BASE_URL}logos/foundation.png`,
      kind: "foundation",
      width: 1200,
      height: 288,
    },
    {
      name: "Picogrid",
      href: "https://picogrid.com",
      img: `${import.meta.env.BASE_URL}logos/picogrid.svg`,
      kind: "picogrid",
      width: 666,
      height: 62,
    },
    {
      name: "Kite",
      href: "https://kiteml.com",
      img: `${import.meta.env.BASE_URL}logos/kite.svg`,
      kind: "kite",
      width: 180,
      height: 180,
      wordmark: "Kite",
    },
  ],
};
