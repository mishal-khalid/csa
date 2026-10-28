// The Cabinet's twelve departments, in the fixed CSA order, with their full rosters.
// Names and posts follow the CSA's organisational structure; each `line` is draft copy, still to
// be approved. Internal Affairs and the International Intelligence Council are `restricted`: their
// pages show only public-safe details (name, head, one line), with no roster or contact details.
//
// Each policy is [name, lead, parts], where parts are [part, Deputy Secretary] pairs. A policy's
// lead is a Secretary of State unless leadPost says otherwise (the Attorney General and Prosecutor
// General are titled only that).
//
// Titles go by department, not policy: "Secretary of State for Defence", "Deputy Secretary for
// Defence". `portfolio` is that department word, taken from the Secretary's own title.

const department = (slug, name, head, post, rest) => ({
  slug,
  href: `/exec/${slug}`,
  name,
  head,
  post,
  portfolio: post.startsWith("Secretary of ") ? post.slice("Secretary of ".length) : null,
  ...rest,
});
const policy = ([name, lead, parts, leadPost = "Secretary of State"]) => ({
  name,
  lead,
  leadPost,
  parts: parts.map(([part, deputy]) => ({ part, deputy })),
});

export const departments = [
  department("defence", "Department of Defence", "FA. David Larochelle, PhD", "Secretary of Defence", {
    line: "Defends the continents: international defence, counterterrorism, aviation and maritime security, and the military branches.",
    executiveDirector: "Oluwaseun Adeyemi",
    domain: "defence.csa",
    policies: [
      ["International Defence", "Charles Perkins", [["Defence Progression", "Farida Haddad"], ["Defence Sustainment and Development", "Bianca Dalton"]]],
      ["Counterterrorism", "Steven Munoz", [["Counterterrorism Policy Implementation", "Mohamed Najah Fikury"], ["Counterterrorism Sustainment and Development", "Joshua Finch"]]],
      ["International Aviation Security", "Daniel Zamora", [["Aviation Security Sustainment and Development", "Lamyaa R. Latheef"], ["Transport Coordination", "Malcolm Fontaine"]]],
      ["Hydrographic, Maritime and Marine Security", "Leticia Vance", [["Hydrographic Services", "Allison Reyes"], ["Maritime Security", "Clarence Thorton"], ["Marine Services", "Elijah Dunbar"]]],
      ["Military Branch Leadership", "BRIG.GEN. Arlene Poynter", [["Continental Armed Forces", "CPT. Shamaal Imthiyaz Shareef"], ["Continental Security Corps", "LT. Jasper Omar"]]],
    ],
  }),
  department("foreign-affairs", "Department of Foreign Affairs", "H.COL. Zayner Manner, PhD", "Secretary of Foreign Affairs", {
    line: "The CSA’s relations with other nations and the United Continents, its missions abroad and its help for citizens overseas.",
    executiveDirector: "Aminath Mishfa Nizar",
    domain: "foreign.csa",
    policies: [
      ["International Relations", "Elijah Mayfield", [["Bilateral Relations", "Dr. Lars Henriksen"], ["Multilateral and United Continents Affairs", "James Lindqvist"]]],
      ["Diplomatic Representation and Missions", "Marilyn Gonzalez", [["Embassies and Consulates", "Paula Avery"], ["Honorary Consuls", "Jessica Prentice"], ["Ambassadors-at-Large", "Zoe Lyle"]]],
      ["Protocol", "Sonja Gaulke", [["Protocol Implementation", "Hon. Priya Raman"]]],
      ["Consular and Citizen Assistance", "Leticia Emerson", [["Consular Services", "Elaine Nguyen"], ["Emergency Citizen Assistance", "Mausooma Yaaniu Rauf"]]],
    ],
  }),
  department("internal-affairs", "Department of Internal Affairs", "MAJ. Livian Valicha, PhD", "Madam Chief of Internal Affairs", {
    line: "Further information on the Department is not disclosed under the confidential bylaws of the Continental Security Agency.",
    restricted: true,
  }),
  department("iic", "International Intelligence Council", "FA. Hamoodh Abdullah, PhD", "Director and Commander", {
    line: "Brings together the CSA’s leaders in defence, security and law to coordinate intelligence.",
    restricted: true,
  }),
  department("justice", "Department of Justice", "Gregory Alston", "Secretary of Justice", {
    line: "The CSA’s legal advice and criminal prosecution, human rights and public safety.",
    executiveDirector: "Valerie Dorsey",
    domain: "justice.csa",
    policies: [
      ["Universal Board of Legal Affairs", "FA. Luz Miranda, AG", [["Legal Affairs & Regulations", "Nathan Winslow"]], "Attorney General"],
      ["Prosecutor General’s Office", "Fayé Trammell", [["Prosecution", "Hannah Jennings"]], "Prosecutor General"],
      ["Human Rights and Public Safety", "Nathan Ibarra", [["Human Rights", "Shifaz Zuhail Mahir"], ["Public Safety", "Azim Sameeh Naseem"]]],
      ["CSA Judicial Service Commission", "Ibrahim Faishan Adam", []],
    ],
  }),
  department("homeland-security", "Department of Homeland Security", "Dr. Stanely Hall", "Secretary of Homeland Security", {
    line: "Digital services, law enforcement, registration and customs, corrections and immigration.",
    executiveDirector: "Shiuna Rasheed",
    domain: "home.csa",
    policies: [
      ["Information Technology and Digital Innovation", "Jessica Redding", [["Information Technology", "Monica Merritt"], ["Digital Innovation", "Allison Keller"]]],
      ["Law Enforcement", "William Reed", [["National Law Enforcement", "Dennis Ellison"], ["International Law Enforcement", "Ingrid Solberg"]]],
      ["Registration and Customs", "Dr. Willie Hogg", [["National and International Registration", "Hassan Raaif Haneef"], ["Customs Services", "Miriam Crawford"]]],
      ["Correctional Services", "Sarah Easton", [["Prisons and Correctional Facilities", "Dennis Prescott"], ["Rehabilitation", "Mei Lin Chou"]]],
      ["Immigration", "Rachel Templeton", [["Immigration and Visas", "Natalie Faulkner"], ["Border Control", "Patricia Rowland"]]],
    ],
  }),
  department("education", "Department of Education", "Dr. Carol MJare", "Secretary of Education", {
    line: "Curriculum, teaching, student welfare, and higher and vocational education. It is also the public face of the Continental Security Corps.",
    executiveDirector: "Andrew Whitaker",
    domain: "education.csa",
    policies: [
      ["Curriculum and Assessment", "Dr. Carlos Robinson", [["Curriculum Development", "Kenji Nakamura"], ["Examinations and Assessment", "Rafael Domingues"]]],
      ["Teaching and Inclusion", "Ismail Ahusan Thaufeeq", [["Teacher Development and Standards", "Aishath Rishwa Najeeb"], ["Inclusive and Special Education", "Ismail Najah Saeed"]]],
      ["Children and Student Welfare", "Arjun Mehta", [["Children’s Rights", "Dr. Shifaz Imthiyaz Didi"], ["Student Welfare", "Nadia Harlow"], ["Educational Consultation and Guidance", "Ibrahim Rifau Zahir"]]],
      ["Higher and Vocational Education", "Dr. Dieter Bieber", [["Higher Education and Qualifications", "Victoria Fairbanks"], ["Technical and Vocational Education", "Nashwa Inaan Faaiz"], ["Scholarships and Grants", "Camille Castillo"]]],
      ["Education Policy and Planning", "Hussain Zuhail Hameed", [["Education Policy", "Mateo Albornoz"], ["Planning and Research", "Daniel Okafor"]]],
    ],
  }),
  department("health-and-welfare", "Department of Health and Welfare", "Damian Holloway", "Secretary of Health and Welfare", {
    line: "Public health, health services, social welfare, family development and religious affairs.",
    executiveDirector: "Tomasz Wiezrbicki",
    domain: "health.csa",
    policies: [
      ["Public Health", "Gayle Gristoy", [["Disease Prevention", "Natalie Tran"], ["Mental Health and Psychosocial Support", "Nadia Montgomery"]]],
      ["Health Services and Regulation", "Elaine Sloane", [["Clinical and Hospital Services", "Gloria Sandoval"], ["Health Regulation and Medicines", "Dr. Raaidha Fazna Shakir"]]],
      ["Social Welfare and Protection", "Dr. Patrick Barlow", [["Social Welfare", "Isaac Caldwell"], ["Disability and Elderly Care", "Shifna Riyaz"]]],
      ["Social and Family Development", "Lisa Flavin", [["Family Development", "Dr. Dominic Ferreira"], ["Child and Family Protection", "Hannah Cortez"]]],
      ["Religious Affairs", "Hon. Keith Erickson", [["Religious Affairs", "Hon. Spencer Ingram"]]],
    ],
  }),
  department("culture-and-youth", "Department of Culture and Youth", "Vivian Calderon", "Secretary of Culture and Youth", {
    line: "Youth, the arts, language and heritage, and sport.",
    executiveDirector: "Monica Lowell",
    domain: "dcy.csa",
    policies: [
      ["Youth Empowerment", "Dr. Amy Yates", [["Youth Empowerment", "Kevin Galloway"], ["Youth Engagement and Volunteerism", "Sonia Mendez"]]],
      ["Information Arts", "Hawwa Raaidha Easa", [["Information Arts", "Russell Kirkland"]]],
      ["Language, Traditions and Heritage", "Dr. Shigetaka Uchiumi", [["Language and Traditions", "Denise Osborne"], ["Heritage, Museums and Archives", "Sarah Beaumont"]]],
      ["Sports, Fitness and Recreation", "Thoriq Mohamed", [["Sports", "Denise Ogden"], ["Fitness and Recreation", "Rachael Stanton"]]],
    ],
  }),
  department("economy-and-trade", "Department of Economy and Trade", "Dr. Jasper Rowe", "Secretary of Economy and Trade", {
    line: "The treasury, the budget, economic policy, trade and investment, and enterprise.",
    executiveDirector: "Patrick Fletcher",
    domain: "trade.csa",
    policies: [
      ["Treasury", "Scott Martinez", [["Treasury and Public Accounts", "Samuel Ortega"], ["Public Debt Management", "Russell Everett"]]],
      ["Budget and Revenue", "Danielle Draper", [["Budget and Public Expenditure", "Robert Kincaid"], ["Revenue and Taxation", "Raymond Talbot"]]],
      ["Economic Policy and Development", "Tamara Carrington", [["Economic Policy and Planning", "Trevor Maddox"], ["Industry and Economic Diversification", "Hon. Sonia Quinlan"]]],
      ["Trade and Investment", "Dr. Bradely McDaniel", [["International Trade", "Malcolm Gentry"], ["Investment Promotion", "Clarence Kemp"]]],
      ["Enterprise and Consumer Affairs", "Uz. Fathimath Shiyana Saleem", [["Enterprise and SME Development", "Katherine Salazar"], ["Consumer Protection and Competition", "Diana Jamison"]]],
    ],
  }),
  department("infrastructure", "Department of Infrastructure", "Marcus Thorne", "Secretary of Infrastructure", {
    line: "Transport, housing, construction and the CSA’s major projects.",
    executiveDirector: "Kevin Bennett",
    domain: "infrastructure.csa",
    policies: [
      ["Transport", "FA. Mi Heintz, PhD", [["Land Transport", "Olivia Hargrove"], ["Maritime Transport", "Rilwan Imthiyaz Manik"], ["Civil Aviation", "Alicia Donovan"]]],
      ["Housing and Urban Development", "Jennifer Guerrero", [["Housing", "Zoe Hensley"], ["Urban Development and Land Use", "Camille Grayson"]]],
      ["Construction and Public Works", "Dessie Baird", [["Construction", "Alicia Nash"], ["Public Works", "Bianca Pacheco"]]],
      ["Infrastructure Innovation, Planning and Major Projects", "Wilma Massie", [["Infrastructure Innovation, Planning and Major Projects", "Caleb Yoder"]]],
    ],
  }),
  department("environment-and-resources", "Department of Environment and Resources", "Leona Mercer", "Secretary of Environment and Resources", {
    line: "Marine resources, agriculture, climate and meteorology, environmental protection, and energy and water.",
    executiveDirector: "James Abernathy",
    domain: "environment.csa",
    policies: [
      ["Marine Exploration and Fisheries", "Thomas Fitch", [["Marine Exploration and Investigations", "Lucas Navaro"], ["Fisheries and Marine Resources", "Simone Tolliver"]]],
      ["Agriculture and Animal Welfare", "Angela Berkman", [["Agriculture and Food Security", "Rebecca Ainsley"], ["Animal Welfare", "Genevieve Ramsey"]]],
      ["Climate Change and Meteorology", "Hon. Fathimath Shiama", [["Climate Change", "Felicia Lockhart"], ["Meteorology", "Robert Pryor"]]],
      ["Environmental Protection", "Dr. Brian Underwood", [["Pollution Control and Waste Management", "Ethan Coleman"], ["Biodiversity and Protected Areas", "Emily Sutherland"], ["Coastal Protection", "Katherine Vaughn"]]],
      ["Energy and Water", "Tyler Pemberton", [["Energy", "Jasmine Greer"], ["Water and Sanitation", "Spencer Irving"]]],
    ],
  }),
].map(({ policies = [], ...rest }) => ({ ...rest, policies: policies.map(policy) }));

export const departmentBySlug = (slug) => departments.find((d) => d.slug === slug);
