// The five groups the Organisation hub links to, in the order the cards show them.
// chartLabel is the short line under each box in the structure chart; line and count go on the cards.
// emblems are shown 64px tall; width is the width at that height.
// Draft copy, still to be approved.
export const groups = [
  {
    slug: "exec",
    name: "The Executive",
    chartLabel: "Director’s Office · Cabinet",
    line: "The Director’s Office and the Cabinet’s departments, which run the CSA day to day.",
    count: "12 departments",
    emblems: [{ src: "/brand/CSA_Insignia_Black.svg", width: 60 }],
  },
  {
    slug: "legislature",
    name: "The Legislature",
    chartLabel: "Continental Assembly",
    line: "The Continental Assembly, which makes the CSA’s laws.",
    count: "1 assembly",
    emblems: [{ src: "/images/emblems/continental-assembly.png", width: 64 }],
  },
  {
    slug: "judiciary",
    name: "The Judiciary",
    chartLabel: "The courts",
    line: "The courts, independent of the executive, from the Trial Courts to the Supreme Court.",
    count: "5 courts",
    emblems: [{ src: "/images/emblems/judiciary.png", width: 64 }],
  },
  {
    slug: "commissions",
    name: "Independent commissions",
    chartLabel: "Human Resources · Judicial Service · Civic Affairs",
    line: "Oversight bodies that work at arm’s length from the executive.",
    count: "3 commissions",
    emblems: [
      { src: "/images/emblems/human-resources-commission.png", width: 160 },
      { src: "/images/emblems/judicial-service-commission.png", width: 64 },
      { src: "/images/emblems/civic-affairs-commission.png", width: 64 },
    ],
  },
  {
    slug: "services",
    name: "Uniformed services",
    chartLabel: "Armed forces · cadets · law enforcement",
    line: "The armed forces, the cadet corps and law enforcement.",
    count: "3 services",
    emblems: [
      { src: "/images/emblems/continental-armed-forces.png", width: 64 },
      { src: "/images/emblems/continental-security-corps.png", width: 64 },
      { src: "/images/emblems/continental-law-enforcement-authority.png", width: 64 },
    ],
  },
];

// groups live at the top level (csa.org/exec), with their bodies under them (csa.org/exec/defence)
export const groupHref = (slug) => `/${slug}`;
export const groupBySlug = (slug) => groups.find((group) => group.slug === slug);
