// Every Dhivehi label in the app. Those marked "mock" are copied from the user's mock; the rest are
// Claude's drafts, for the user to check.

export const words = {
  title: "އިންސްޓްރަކްޓަރުންގެ އިވެލުއޭޝަން", // mock
  syllabusParts: "ސިލަބަހުގެ ބައިތައް", // mock
  students: "އިވެލުއޭޓުވާ ދަރިވަރުން", // mock
  start: "އިވެލުއޭޝަން ފަށާ", // mock
  done: "އިވެލުއޭޝަން ނިންމާލާ", // mock
  issue: "މައްސަލައެއްވާނަމަ މައްސަލަ ލިޔޭ", // mock

  // the four parts: their buttons on the home page, and their pages' titles (mock)
  parts: {
    THEORY: { name: "ތިޔަރީ", page: "ތިޔަރީގެ ބައި" },
    DRILL: { name: "ޑްރިލް", page: "ޑްރިލްގެ ބައި" },
    COMMANDING: { name: "ކޮމާންޑިންގ", page: "ކޮމާންޑުކުރުމުގެ ބައި" },
    INSPECTION: { name: "އިންސްޕެކްޝަން", page: "އިންސްޕެކްޓުކުރުމުގެ ބައި" },
  },

  // the drill's pairs: "first group" and "second group" are the mock's
  group: ["އިވެލުއޭޓުވާ ދަރިވަރުންގެ ފުރަތަމަ ގްރޫޕު", "އިވެލުއޭޓުވާ ދަރިވަރުންގެ ދެވަނަ ގްރޫޕު", "އިވެލުއޭޓުވާ ދަރިވަރުންގެ ތިންވަނަ ގްރޫޕު"],
  allGroupsDone: "ހުރިހާ ގްރޫޕެއް ނިމިއްޖެ",

  // signing in
  name: "ނަން",
  code: "ކޯޑު",
  signIn: "ސައިން އިން",
  signedInAs: "ސައިން އިން ވެފައިވަނީ",
  signOut: "ސައިން އައުޓް",
  wrongCode: "ކޯޑު ރަނގަޅެއް ނޫން",
  unknownName: "މި ނަމެއް އިންސްޓްރަކްޓަރުންގެ ލިސްޓުގައި ނެތް",
  badName: "ނަން ރަނގަޅަށް ލިޔޭ",
  tooMany: "ގިނަ ފަހަރު މަސައްކަތް ކުރެވިއްޖެ. އިރުކޮޅެއް ފަހުން އަލުން މަސައްކަތް ކުރޭ",
  noConnection: "ކަނެކްޝަން ނެތް",

  // saving
  unsaved: (n) => `${n} މާކްސް ސޭވް ނުވެ. އަލުން މަސައްކަތް ކުރަނީ`,

  // finishing
  finish: "އިވެލުއޭޝަން ނިންމާލާ",
  notYet: "މި ބައިތައް އަދި ނުނިމޭ:",
  finished: "ތިބާ ނިންމާލައިފި",
  reopen: "އަލުން ހުޅުވާ",
  locked: "ތިބާ ނިންމާލާފައިވާތީ މާކްސް ބަދަލެއް ނުކުރެވޭނެ",
  resultsOut: "ނަތީޖާ ނެރެވިފައިވާތީ އިތުރަށް މާކްސް ނުދެވޭނެ",
  waitingFor: "ނުނިމެނީ:",
  needMore: (n) => `ނަތީޖާ ފެންނާނީ އެންމެ ކުޑަމިނުން ${n} އިންސްޓްރަކްޓަރުން ނިންމާލުމުން`,

  // a student's page
  yourMarks: "ތިބާގެ މާކްސް",
  everyoneLater: "ހުރިހާ އިންސްޓްރަކްޓަރުން ނިންމާލުމުން އެންމެންގެ މާކްސް ފެންނާނެ",
  instructor: "އިންސްޓްރަކްޓަރު",
  base: "ބޭސް",
  final: "ފައިނަލް",
  average: "އެވްރެޖް",
  overall: "ޖުމްލަ",
  notes: "އިންސްޕެކްޝަންގެ މައްސަލަތައް",
};
