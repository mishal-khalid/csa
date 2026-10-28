import { departments as departmentProfiles } from "./departments";
import { profilesIn } from "./profiles";

// Who sits in each group, for the group pages' cards. Names and posts follow the CSA's
// organisational structure; descriptions are draft copy, still to be approved.
// emblems are shown 64px tall; width is the width at that height.

export const insignia = { src: "/brand/CSA_Insignia_Black.svg", width: 60 };
const emblem = (file, width = 64) => ({ src: `/images/emblems/${file}`, width });

// The Executive

export const directorsOffice = {
  href: "/exec/directors-office",
  people: [
    { name: "UFHMG. Enzo Hernandez, HPhD. MD.", post: "Director and Commanding Officer" },
    {
      name: "UFMG. Jana Mohamed, HPhD. MD.",
      post: "Deputy Director, Deputy Commanding Officer and Chairwoman of the Cabinet",
    },
    { name: "Zaha Rasheed", post: "Chief of Staff" },
  ],
};

// the Cabinet's departments, from their full profiles
export const departments = departmentProfiles.map(({ href, name, head, post }) => ({
  href,
  name,
  head,
  post,
  emblem: insignia,
}));

// offices within the Department of Justice
export const justiceOffices = [
  {
    href: "/exec/attorney-generals-office",
    name: "Attorney General’s Office",
    head: "FA. Luz Miranda, AG",
    post: "Attorney General",
    emblem: insignia,
  },
  {
    href: "/exec/prosecutor-generals-office",
    name: "Prosecutor General’s Office",
    head: "Fayé Trammell",
    post: "Prosecutor General",
    emblem: emblem("pgo-emblem-colour.png", 57),
  },
];

// The Legislature

export const assembly = {
  duties: [
    "Makes the CSA’s laws as its legislature, in place of the former Parliament of the CSA.",
    "Votes on the President of the Judicial Service Commission.",
    "Appoints two members of the Judicial Service Commission.",
  ],
  website: "assembly.gov.csa",
};

// The Judiciary

export const judiciaryLeaders = [
  { name: "Dr. Evelyn Castellanos", post: "Chief Justice" },
  { name: "Uz. Ahmed Naail Zubair, PhD", post: "Chief Judicial Administrator" },
];

export const courts = [
  { name: "Supreme Court", text: "The highest court, led by the Chief Justice." },
  { name: "High Courts", text: "Hear serious cases and appeals from the Trial Courts." },
  { name: "Trial Courts", text: "Where most cases are first heard." },
  {
    name: "International Court of Justice",
    text: "Sits in The Hague.",
    justices: [
      "Marcus Wagner",
      "Philip Meier",
      "Andreas Maurer",
      "Sandra Barth",
      "Ralph Schwartz",
      "Bernd Gerste",
      "Stefanie Eberhart",
    ],
  },
  { name: "International Criminal Court", text: "Its leadership and bench are for the Judicial Service Commission to decide." },
];

export const judicialAdministration = {
  href: "/judiciary/judicial-administration",
  name: "Department of Judicial Administration",
  head: "Uz. Ahmed Naail Zubair, PhD",
  post: "Chief Judicial Administrator",
  emblem: emblem("judiciary.png"),
};

// Independent commissions and uniformed services, from their full profiles

const card = ({ href, name, head, post, emblem }) => ({ href, name, head, post, emblem });

export const commissions = profilesIn("commissions").map(card);

export const services = profilesIn("services").map(card);
