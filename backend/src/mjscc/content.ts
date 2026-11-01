import { theory } from './theory.js';

// What the evaluation is made of: the six students, the theory questions (theory.ts), the drill
// every pair does, and the commands each student's three are drawn from. Students, movements and
// commands are numbered from 1 in the order below; the database stores those numbers.

export const students = ['CPL. Maahin', 'CPL. Rauha', 'CPL. Zeek', 'CPL. Shain', 'LCPL. Auna', 'CPL. Alsan'];

// The drill, done in pairs; every movement is scored for each student. The user's list (2026-11-01),
// in their order and spelling, plus the movement they added to it last.
export const drill = [
  'ކޮއްޅެއްގައި ފަސޭޙަ',
  'ގެމަ & ސަމާލު',
  'ބެންޑް & ޑްރައިވް',
  'ސަފު ތެދުކުރުން',
  'ބަލާ ކުރިޔަށް',
  'ކަނާތަށް އެނބުރުން',
  'ވާތަށް އެނބުރުން',
  'އަނެއްފަރާތަށް އެނބުރުން',
  'ކަނާތަށް އެނބުރުން (2)',
  'ވާތަށް އެނބުރުން (2)',
  'އަނެއްފަރާތަށް އެނބުރުން (2)',
  'އަރުގަޔަށް ކަނާތަށް ވާތަށް',
  'ކުރުނީސް ކުރިޔަށް',
  'ކުރުނީސް ކަނާތަށް ވާތަށް',
  'އަވަސް ހިނގުން',
  '(އހ) ކުރުނީސް ކުރިޔަށް',
  '(އހ) ކުރުނީސް ކ.ވ.',
  '(އހ) އަނެއްފަރާތަށް',
  '(އހ) ބަދަލް ފިޔަވަޅު',
  'އަވަސް ހިނގުން އަވަސް ޓެމްޕޯ',
  'ހުއްޓޭ',
  'ލަސް ހިނގުން',
  'ތިބިތާ އަވަސް ހިނގުން',
  'ޖެއްސުން (5)',
  'ޖައްސައިގެން ހުރުން',
  'ދުވުން',
  'އިސްމަގު މެދުބަލާ  އަވާސް  ހިނގާ',
];

// What a student's three commands are drawn from: the drill, plus the arms commands the user added.
// The double spaces part the words of a command, as the user wrote them.
export const commands = [
  ...drill,
  'ރަސްމީ ކުރުނީސް ވެދުމަށް  ހަތިޔާރު  ވެދުމަށް',
  'އުކުޅަށް  ހަތިޔާރު  އުކުޅަށް',
  'ތިރިޔަށް  ހަތިޔާރު  ތިރިޔަށް',
  'ހުރަހަށް  ހަތިޔާރު  ހުރަހަށް',
  'ބަދަލް  ހަތިޔާރު  ބަދަލް',
];

export const COMMANDS_PER_STUDENT = 3;

export { theory };
