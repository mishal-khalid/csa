import { departments } from "@/components/organisation/departments";

// The Leadership section's people. Names, ranks and posts follow the CSA's organisational
// documents; each `line` and the responsibilities wording are draft copy, still to be approved.
// Only the Director and Deputy Director have pages of their own; everyone else links to their
// body's page in Organisation.

// The Director and Deputy Director, with everything their own pages show. Their ranks have no
// short form on the site: they're written in full above the name.
export const leaders = [
  {
    slug: "enzo-hernandez",
    rank: "Universal Federal Higher Major General",
    name: "Enzo Hernandez",
    honorifics: "HPhD. MD.",
    post: "Director and Commanding Officer",
    line: "Leads the Continental Security Agency from The Director’s Office in Washington, D.C.",
    posts: [
      "Director and Commanding Officer of the Continental Security Agency",
      "Director of Security",
      "Member of the Senior Counsel",
      "Member of the International Intelligence Council’s Intermediary Council",
    ],
    responsibilities: [
      "Signs and confirms every Instrument of Leadership Confirmation.",
      "Appoints the Cabinet’s Secretaries and Secretaries of State.",
      "Awards the CSA’s medals.",
      "Alone holds the Director of Security flag.",
    ],
    // the details below were supplied by the user for Enzo's page
    designations: [
      "Director of International Security",
      "International Security Specialist",
      "Neurocardiology Surgical Doctor",
      "Psychiatrist",
      "Honorary Doctor of Law",
      "International Relations Specialist",
      "Black Ops",
      "High-Level Military Personnel",
    ],
    otherPositions: [
      "Chairperson of the Managing Board of the Ethos Regional Hospital",
      "Chairperson and President of the Ethos Institute",
      "Chairperson, Executive Managing Director, Managing Director and Founder of the Ethos Group of Companies LLC",
    ],
    previousPositions: [
      "Secretary-General of the United Nations",
      "Federal Commander of the International Federal Security Corps",
      "Chief of Surgery, San Jose St. Bonaventure Hospital",
      "Chief Justice of the Supreme Court of the United States",
      "Chief Justice of the United States",
      "Chief Justice of the International Court of Justice and the International Criminal Court",
    ],
    education: {
      degrees: [
        "Honorary Doctorate in International Security and Foreign Affairs, awarded by the World Education Center",
        "Honourable Designatory Speciality in Military Leadership and Military Executive",
        "Honorary Doctorate in Medicine: the first specialised doctorate for Cardiothoracics and Neurology in one, awarded honorarily to him alone",
      ],
      fields: [
        "Political Sciences and International Relations",
        "Law",
        "Foreign Affairs",
        "Education",
        "Military",
        "Black Ops",
        "Medicine",
        "Neurology",
        "Cardiology",
        "Philosophy",
        "Research",
      ],
    },
  },
  {
    slug: "jana-mohamed",
    rank: "Universal Federal Major General",
    name: "Jana Mohamed",
    honorifics: "HPhD. MD.",
    post: "Deputy Director, Deputy Commanding Officer and Chairwoman of the Cabinet",
    line: "Deputises for the Director, chairs the Cabinet and leads The Director’s Office’s communications.",
    posts: [
      "Deputy Director and Deputy Commanding Officer of the Continental Security Agency",
      "Chairwoman of the Cabinet",
      "Chief Communications Director of The Director’s Office, since 16 March 2025",
      "Special Advisor to the Director",
      "Deputy Director of Security",
      "Member of the Senior Counsel",
      "Member of the International Intelligence Council’s Intermediary Council",
    ],
    responsibilities: [
      "Chairs the Cabinet.",
      "Leads The Director’s Office’s communications, with the Press Secretary and Press Representative.",
      "Advises the Director.",
    ],
    // supplied by the user for Jana's page
    education: {
      degrees: ["Honorary Doctorate in Political Sciences, awarded by Harvard", "PhD in Research of Medicine"],
      fields: ["International Relations", "Political Sciences", "Medicine", "Military", "Black Ops"],
    },
  },
];

export const leaderHref = (slug) => `/leadership/${slug}`;
export const leaderBySlug = (slug) => leaders.find((leader) => leader.slug === slug);

// The Cabinet: each department's Secretary (or equivalent head), in the fixed department order.
export const cabinet = departments.map(({ name, head, post, href }) => ({ name: head, title: post, note: name, href }));

// The Senior Counsel, or Immediate Security Team.
export const seniorCounsel = [
  { name: "UFHMG. Enzo Hernandez, HPhD. MD.", title: "Director and Commanding Officer", href: leaderHref("enzo-hernandez") },
  {
    name: "UFMG. Jana Mohamed, HPhD. MD.",
    title: "Deputy Director, Deputy Commanding Officer and Chairwoman of the Cabinet",
    href: leaderHref("jana-mohamed"),
  },
  { name: "FA. David Larochelle, PhD", title: "Secretary of Defence", href: "/exec/defence" },
  {
    name: "H.COL. Zayner Manner, PhD",
    title: "Secretary of Foreign Affairs; Chief Technological Officer of the Cabinet",
    href: "/exec/foreign-affairs",
  },
  { name: "Dr. Mark Simmons", title: "Adjutant of the CSA" },
  {
    name: "MAJ. Livian Valicha, PhD",
    title: "Madam Chief of Internal Affairs; Chief Financial Officer of the Cabinet",
    href: "/exec/internal-affairs",
  },
  { name: "FA. Hamoodh Abdullah, PhD", title: "Director of the International Intelligence Council", href: "/exec/iic" },
];

// The heads of every other body, grouped as Organisation groups them. A null name is a post not
// yet filled.
export const otherHeads = [
  {
    group: "The Director’s Office",
    people: [{ name: "Zaha Rasheed", title: "Chief of Staff", href: "/exec/directors-office" }],
  },
  {
    group: "Within the Department of Justice",
    people: [
      { name: "FA. Luz Miranda, AG", title: "Attorney General", href: "/exec/attorney-generals-office" },
      { name: "Fayé Trammell", title: "Prosecutor General", href: "/exec/prosecutor-generals-office" },
    ],
  },
  {
    group: "The Judiciary",
    people: [
      { name: "Dr. Evelyn Castellanos", title: "Chief Justice", href: "/judiciary" },
      {
        name: "Uz. Ahmed Naail Zubair, PhD",
        title: "Chief Judicial Administrator",
        href: "/judiciary/judicial-administration",
      },
    ],
  },
  {
    group: "The Legislature",
    people: [{ name: null, title: "Leadership of the Continental Assembly", href: "/legislature" }],
  },
  {
    group: "Independent commissions",
    people: [
      { name: "Renee Walcott", title: "Chair, Human Resources Commission", href: "/commissions/human-resources" },
      { name: "Harriet Okonkwo", title: "President, Judicial Service Commission", href: "/commissions/judicial-service" },
      { name: null, title: "Head, Civic Affairs Commission", href: "/commissions/civic-affairs" },
    ],
  },
  {
    group: "Uniformed services",
    people: [
      {
        name: "CPT. Shamaal Imthiyaz Shareef",
        title: "Commanding Officer, Continental Armed Forces",
        href: "/services/armed-forces",
      },
      { name: "LT. Jasper Omar", title: "Commanding Officer, Continental Security Corps", href: "/services/security-corps" },
      { name: null, title: "Head, Continental Law Enforcement Authority", href: "/services/law-enforcement" },
    ],
  },
];
