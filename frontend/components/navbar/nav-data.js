import { departments } from "@/components/organisation/departments";

// The labels and CTA are approved. Organisation's and Leadership's cards are filled in (card copy
// is draft, still to be approved).
//
// Every dropdown uses the same five-card layout from the sketch:
//   row 1: [0] image + text   [1] text          [2] wide list
//   row 2: [3] framed image   [4] text
// Cards [0] and [3] take an optional `image`; without one they show a neutral placeholder.
// Card [0] can show a person's silhouette instead (`portrait`), until portraits exist.
// In the list card [2] each item is its own link; the card itself isn't (its href is only used
// by the phone menu, which lists every card by title).

const organisationCards = [
  {
    title: "Organisation",
    text: "How the CSA fits together.",
    href: "/organisation",
    image: "/images/organisation-building.jpg",
  },
  { title: "The Executive", text: "The Director’s Office and the Cabinet.", href: "/exec" },
  {
    title: "The Cabinet’s departments",
    // short names so they fit the dropdown's two columns
    items: departments.map(({ slug, name, href }) => ({
      label: slug === "iic" ? "Intelligence Council" : name.replace(/^Department of /, ""),
      href,
    })),
    href: "/exec#cabinet",
  },
  {
    title: "The Judiciary",
    text: "Independent courts, from the Trial Courts to the Supreme Court.",
    href: "/judiciary",
    image: "/images/judiciary-library.jpg",
  },
  { title: "The Legislature", text: "The Continental Assembly, which makes the CSA’s laws.", href: "/legislature" },
];

const leadershipCards = [
  {
    title: "The Director",
    text: "UFHMG. Enzo Hernandez, HPhD. MD.",
    href: "/leadership/enzo-hernandez",
    portrait: true,
  },
  { title: "The Deputy Director", text: "UFMG. Jana Mohamed, HPhD. MD.", href: "/leadership/jana-mohamed" },
  {
    title: "On the Leadership page",
    items: [
      { label: "The Cabinet", href: "/leadership#cabinet" },
      { label: "Senior Counsel", href: "/leadership#senior-counsel" },
      { label: "Heads of the other bodies", href: "/leadership#heads" },
    ],
    href: "/leadership",
  },
  {
    title: "All leadership",
    text: "The Administration, the Cabinet and the head of every body.",
    href: "/leadership",
    image: "/images/leadership-office.jpg",
  },
  {
    title: "The Director’s Office",
    text: "Where the Director and Deputy Director work, with their communications team and advisers.",
    href: "/exec/directors-office",
  },
];

const cardsFor = { Organisation: organisationCards, Leadership: leadershipCards };

// Items with an href are plain links with no dropdown (the Gazette and Careers are one click, each a
// single page); the rest open their cards.
const directLinks = { Gazette: "/gazette", Careers: "/careers" };

export const navItems = ["Organisation", "Leadership", "Gazette", "Careers"].map((label) =>
  directLinks[label]
    ? { id: label.toLowerCase(), label, href: directLinks[label] }
    : { id: label.toLowerCase(), label, cards: cardsFor[label] },
);

export const cta = { label: "Contact", href: "/contact" };
