// Full profiles of the commissions and uniformed services, for their own pages. Names, seats and
// structures follow the CSA's organisational documents; each `line` and the "what it does" wording
// are draft copy, still to be approved. `colour` is the band behind the header, taken from the
// body's own emblem. `restricted` bodies have no named leader yet, so their pages show the header only.
//
// The head is featured on the page; headNote adds a line under them. members are everyone else on
// the body, as [name, seat] pairs. oversight is who oversees a service from its department, kept apart
// so a more senior official never reads as sitting under the head. organisation entries are
// [label, text] pairs.

const emblem = (file, width = 64) => ({ src: `/images/emblems/${file}`, width });

const profile = (group, slug, rest) => ({ group, slug, href: `/${group}/${slug}`, ...rest });

export const profiles = [
  profile("commissions", "human-resources", {
    name: "Human Resources Commission",
    head: "Renee Walcott",
    post: "Chair",
    colour: "#007078",
    emblem: emblem("human-resources-commission.png", 160),
    line: "Oversees, manages and regulates employment across the CSA.",
    duties: [
      "Manages personnel across the CSA, up to and including Executive Officers.",
      "Sets salaries, benefits and standards.",
      "Runs recruitment, classification, records and payroll.",
      "Handles appointments, promotions, demotions and dismissals.",
      "Decides the roles, titles and designations of Executive Officers.",
      "Sets fitness-for-duty policy and issues HRC Policies.",
    ],
    organisation: [
      ["Executive Service Department", "Administers the Executive Service: the CSA’s Executive Officers."],
      ["Continental Security Service Department", "Administers the Continental Security Service: administrative staff and other employees."],
    ],
    domain: "hrc.gov.csa",
  }),
  profile("commissions", "judicial-service", {
    name: "Judicial Service Commission",
    head: "Harriet Okonkwo",
    post: "President",
    colour: "#386078",
    emblem: emblem("judicial-service-commission.png"),
    line: "Manages the Judiciary, independent of the executive.",
    duties: [
      "Manages the Judiciary independently of the executive.",
      "Decides the leadership of the International Court of Justice and the International Criminal Court.",
    ],
    headNote: "Voted in by the Continental Assembly.",
    members: [
      ["Brandon Langford", "Vice President, a Supreme Court judge elected by Supreme Court judges"],
      ["Genevieve Delgado", "High Court judge elected by High Court judges"],
      ["Miriam Hartley", "Trial Court judge elected by Trial Court judges"],
      ["Gloria Lawson", "Member of the Continental Assembly, appointed by the Assembly"],
      ["Owen Norwood", "Member of the public, appointed by the Assembly"],
      ["Renee Walcott", "Chair of the Human Resources Commission"],
      ["Tyler Garrison", "Appointee of the Director"],
      ["FA. Luz Miranda, AG", "Attorney General"],
      ["Victor Jarvis", "Lawyer elected from the Universal Board of Legal Affairs"],
    ],
    organisation: [
      ["Ten seats", "Judges elected by each level of court, two members appointed by the Continental Assembly, and seats held by office."],
      ["In the Department of Justice", "Ibrahim Faishan Adam, Secretary of State for Justice, leads the JSC policy. A separate post from the President."],
    ],
    domain: "jsc.gov.csa",
  }),
  profile("commissions", "civic-affairs", {
    name: "Civic Affairs Commission",
    head: null,
    post: "Leadership not yet named",
    colour: "#583878",
    emblem: emblem("civic-affairs-commission.png"),
    line: "Elections, politics, democracy and political parties.",
    restricted: true,
  }),
  profile("services", "armed-forces", {
    name: "Continental Armed Forces",
    head: "CPT. Shamaal Imthiyaz Shareef",
    post: "Commanding Officer",
    colour: "#586028",
    emblem: emblem("continental-armed-forces.png"),
    line: "The CSA’s military branch, under the Department of Defence.",
    duties: [
      "Serves as the CSA’s military branch.",
      "Works alongside the Continental Security Corps under the Department of Defence.",
    ],
    headNote: "Also Deputy Secretary for Defence.",
    oversight: [["BRIG.GEN. Arlene Poynter", "Secretary of State for Defence, leading Military Branch Leadership"]],
    organisation: [
      ["Department of Defence", "The Armed Forces sit within its Military Branch Leadership policy."],
    ],
    domain: "caf.gov.csa",
  }),
  profile("services", "security-corps", {
    name: "Continental Security Corps",
    head: "LT. Jasper Omar",
    post: "Commanding Officer",
    colour: "#2850A0",
    emblem: emblem("continental-security-corps.png"),
    line: "The CSA’s cadet corps for school students aged 14 to 18.",
    duties: [
      "Trains school students aged 14 to 18 as cadets.",
      "Is presented to the public by the Department of Education and led internally by the Department of Defence.",
      "Is the only CSA body with field uniforms.",
    ],
    headNote: "Also Deputy Secretary for Defence.",
    oversight: [["BRIG.GEN. Arlene Poynter", "Secretary of State for Defence, leading Military Branch Leadership"]],
    organisation: [
      ["CSC Instructors", "Alumni and former cadets who volunteer, holding warrant officer ranks from Warrant Officer Trainee to Executive Warrant Officer of the CSC."],
      ["Cadet Instructors", "Cadet seniors at Staff Sergeant and above."],
      ["Cadet ranks", "SUC., JUC., CCM., SSM., S.SGT., SGT., CPL. and PVT."],
    ],
    domain: "csc.csa",
  }),
  profile("services", "law-enforcement", {
    name: "Continental Law Enforcement Authority",
    head: null,
    post: "Leadership not yet named",
    colour: "#181818",
    emblem: emblem("continental-law-enforcement-authority.png"),
    line: "Law enforcement for the CSA.",
    restricted: true,
  }),
];

export const profilesIn = (group) => profiles.filter((p) => p.group === group);
export const profileBySlug = (group, slug) => profiles.find((p) => p.group === group && p.slug === slug);
