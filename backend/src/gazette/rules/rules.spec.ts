import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Block } from '../blocks.js';
import {
  checkDocument,
  RULES,
  type CheckInput,
  type Issue,
  type RegisterEntry,
} from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
// the hand transcriptions, as loaded into the Gazette Register
const seed = join(here, '../../../scripts/gazette-seed.json');
const transcript = (index: string): Block[] =>
  (JSON.parse(readFileSync(seed, 'utf8')) as { legacyIndex: string; blocks: Block[] }[]).find((doc) => doc.legacyIndex === index)!.blocks;

const REGISTER: RegisterEntry[] = [
  {
    type: 'act',
    docNumber: '1/2026',
    title: 'Structural Framework of The Director’s Office',
    publishedOn: '2026-01-01',
  },
  {
    type: 'act',
    docNumber: '2/2026',
    title: 'Public Bonds Companies Act',
    publishedOn: '2026-11-07',
    issuingBody: 'Department of Economy and Trade',
  },
  {
    type: 'order',
    docNumber: '01/2026',
    title: 'Establishment of the Continental Security Agency Gazette',
    publishedOn: '2026-11-07',
  },
];
// Director's Order 02/2026 published, so the new titles are in force
const RENAMED: RegisterEntry[] = [
  ...REGISTER,
  {
    type: 'order',
    docNumber: '02/2026',
    title:
      'Change of the Titles of the Leadership of the Continental Security Agency',
    publishedOn: '2026-11-08',
  },
];

// A complete, compliant Act; each test changes one thing.
function act(over: Partial<CheckInput> = {}): CheckInput {
  return {
    type: 'act',
    docNumber: '3/2026',
    title: 'Test Act',
    issuingBody: 'The President’s Office',
    publishedOn: '2026-11-08',
    cover: true,
    appendices: [],
    register: RENAMED,
    blocks: [
      { type: 'chapter', text: 'First Chapter', subtitle: 'Introduction' },
      {
        type: 'article',
        number: '1',
        title: 'Introduction and title',
        clauses: [
          { label: '(a)', text: 'This Act sets out the rules on testing.' },
          { label: '(b)', text: 'This Act shall be cited as the “Test Act”.' },
        ],
      },
      {
        type: 'article',
        number: '2',
        title: 'Purpose',
        clauses: [
          {
            label: '(a)',
            text: 'The purposes of this Act are:',
            items: [
              { label: '(1)', text: 'to test the rules; and' },
              { label: '(2)', text: 'to apply Article 3 (a) of this Act.' },
            ],
          },
        ],
      },
      { type: 'chapter', text: 'Second Chapter', subtitle: 'Final provisions' },
      {
        type: 'article',
        number: '3',
        title: 'Commencement',
        clauses: [
          {
            label: '(a)',
            text: 'This Act comes into force on the date of its publication.',
          },
        ],
      },
      {
        type: 'article',
        number: '4',
        title: 'Definitions',
        clauses: [
          { text: 'In this Act:' },
          { label: '(a)', text: '“Office” means The President’s Office; and' },
          {
            label: '(b)',
            text: '“PBCA” means Act Number 2/2026 (Public Bonds Companies Act).',
          },
        ],
      },
      { type: 'paragraph', text: 'Signed on 08 November 2026.' },
      {
        type: 'signatures',
        items: [{ name: 'Dr. Enzo Hernandez', title: 'President' }],
      },
    ],
    ...over,
  };
}

// A complete, compliant President's Order.
function order(over: Partial<CheckInput> = {}): CheckInput {
  return {
    type: 'order',
    docNumber: '03/2026',
    title: 'Test Order',
    issuingBody: 'The President’s Office',
    publishedOn: '2026-11-09',
    cover: true,
    appendices: [],
    register: RENAMED,
    blocks: [
      { type: 'heading', text: 'President’s Order Number 03/2026' },
      { type: 'heading', text: 'Test Order' },
      { type: 'heading', text: 'President’s Order' },
      {
        type: 'paragraph',
        text: 'I, Enzo Hernandez, President of the Continental Security Agency, state the following.',
      },
      { type: 'paragraph', text: 'Whereas:' },
      {
        type: 'list',
        items: [
          { label: '1.', text: 'the rules must be tested;' },
          { label: '2.', text: 'tests must be written; and' },
          { label: '3.', text: 'they must pass;' },
        ],
      },
      {
        type: 'paragraph',
        text: 'Under the authority vested in the President to direct the affairs of the Continental Security Agency,',
      },
      {
        type: 'paragraph',
        text: 'I, Enzo Hernandez, President of the Continental Security Agency, hereby order as follows:',
      },
      {
        type: 'list',
        items: [
          {
            label: '1.',
            text: 'The tests are run:',
            items: [
              { label: '(a)', text: 'before publication; and' },
              { label: '(b)', text: 'after every change.' },
            ],
          },
          {
            label: '2.',
            text: 'Point 1 (b) applies to every change; see point 1 (a) of this Order.',
          },
        ],
      },
      {
        type: 'paragraph',
        text: 'This Order was issued on 09 November 2026 at The President’s Office, Washington, D.C.',
      },
      {
        type: 'signatures',
        items: [{ name: 'Dr. Enzo Hernandez', title: 'President' }],
      },
    ],
    ...over,
  };
}

function regulation(over: Partial<CheckInput> = {}): CheckInput {
  const base = act();
  const blocks = structuredClone(base.blocks);
  blocks[1] = {
    type: 'article',
    number: '1',
    title: 'Introduction and title',
    clauses: [
      {
        label: '(a)',
        text: 'This Regulation is made under Article 12 (a) of Act Number 2/2026 (Public Bonds Companies Act).',
      },
      {
        label: '(b)',
        text: 'This Regulation shall be cited as the “Test Regulation”.',
      },
    ],
  };
  const text = JSON.stringify(blocks)
    .replaceAll('this Act', 'this Regulation')
    .replaceAll('This Act', 'This Regulation');
  return {
    ...base,
    type: 'regulation',
    docNumber: 'R-1/2026',
    title: 'Test Regulation',
    issuingBody: 'Department of Economy and Trade',
    blocks: JSON.parse(text),
    ...over,
  };
}

function notice(over: Partial<CheckInput> = {}): CheckInput {
  return {
    type: 'notice',
    docNumber: 'PO/2026/N/01',
    title: 'Appointment of the Chief of Staff',
    issuingBody: 'The President’s Office',
    publishedOn: '2026-11-09',
    cover: false,
    appendices: [],
    register: RENAMED,
    blocks: [
      { type: 'paragraph', text: 'PO/2026/N/01\n09 November 2026' },
      {
        type: 'paragraph',
        text: 'Jane Doe is appointed Chief of Staff of The President’s Office from 10 November 2026.',
      },
      {
        type: 'signatures',
        items: [{ name: 'Dr. Enzo Hernandez', title: 'President' }],
      },
    ],
    ...over,
  };
}

// the issues of one rule, as "level where: message"
const lines = (issues: Issue[]) =>
  issues.map((i) => `${i.level} ${i.where ?? ''}: ${i.message}`);
const has = (issues: Issue[], level: Issue['level'], text: string | RegExp) =>
  issues.some(
    (i) =>
      i.level === level &&
      (typeof text === 'string'
        ? i.message.includes(text)
        : text.test(i.message)),
  );

describe('the compliant examples', () => {
  it('pass with nothing to report', () => {
    expect(lines(checkDocument(act()))).toEqual([]);
    expect(lines(checkDocument(order()))).toEqual([]);
    expect(lines(checkDocument(regulation()))).toEqual([]);
    expect(lines(checkDocument(notice()))).toEqual([]);
  });

  it('gives the same answer every time, in document order', () => {
    const aims: Block = {
      type: 'article',
      number: '2',
      title: 'Aims',
      clauses: [
        { label: '(a)', text: 'The aims of this Act are set out here.' },
      ],
    };
    const input = act({
      docNumber: '7/2026',
      cover: false,
      blocks: act().blocks.map((b) =>
        b.type === 'article' && b.number === '2' ? aims : b,
      ),
    });
    const a = checkDocument(input);
    expect(checkDocument(structuredClone(input))).toEqual(a);
    expect(a.map((i) => i.where)).toEqual(['Cover', 'Number', 'Article 2']);
  });

  it('lists every rule with its source', () => {
    expect(RULES.length).toBeGreaterThan(15);
    for (const rule of RULES)
      expect(rule.source).toMatch(/^Director's Order 0[12]\/2026/);
  });
});

describe('details and cover (points 26 and 34)', () => {
  it('needs a title, an issuing body and dates', () => {
    const issues = checkDocument(
      act({
        title: ' ',
        issuingBody: '',
        publishedOn: '8 Nov',
        commencesOn: 'soon',
      }),
    );
    expect(has(issues, 'error', 'no title')).toBe(true);
    expect(has(issues, 'error', 'issuing body is missing')).toBe(true);
    expect(has(issues, 'error', 'publication date')).toBe(true);
    expect(has(issues, 'error', 'commencement date is not a date')).toBe(true);
  });

  it('puts a cover on Acts, Orders, Regulations and Guidelines, never on a Notice', () => {
    expect(
      has(
        checkDocument(act({ cover: false })),
        'error',
        'published with a cover page',
      ),
    ).toBe(true);
    expect(
      has(
        checkDocument(notice({ cover: true })),
        'error',
        'without a cover page',
      ),
    ).toBe(true);
  });
});

describe('issuer (points 7 to 11)', () => {
  it('takes Orders only from The President’s Office', () => {
    expect(
      has(
        checkDocument(order({ issuingBody: 'Department of Defence' })),
        'error',
        'issued only by the President',
      ),
    ).toBe(true);
  });

  it('takes Orders from The Director’s Office only before Director’s Order 02/2026', () => {
    expect(
      has(
        checkDocument(order({ issuingBody: 'The Director’s Office' })),
        'error',
        'issued only by the President',
      ),
    ).toBe(true);
    const before = order({
      issuingBody: 'The Director’s Office',
      register: REGISTER,
    });
    expect(
      checkDocument(before).filter((i) => i.where === 'Issuing body'),
    ).toEqual([]);
  });

  it('asks about ratification when a department issues an Act', () => {
    expect(
      has(
        checkDocument(act({ issuingBody: 'Department of Defence' })),
        'warning',
        'ratifies it',
      ),
    ).toBe(true);
  });
});

describe('numbers (points 17 and 18)', () => {
  it('writes each type’s number exactly', () => {
    expect(
      has(
        checkDocument(regulation({ docNumber: '1/2026' })),
        'error',
        'R-#/year',
      ),
    ).toBe(true);
    expect(
      has(
        checkDocument(act({ docNumber: 'Act No. 3/2026' })),
        'error',
        '“#/year”',
      ),
    ).toBe(true);
    expect(
      has(
        checkDocument(act({ docNumber: '3/2025' })),
        'error',
        'year it’s published',
      ),
    ).toBe(true);
  });

  it('never uses a number twice', () => {
    expect(
      has(
        checkDocument(act({ docNumber: '2/2026' })),
        'error',
        'already used by “Public Bonds Companies Act”',
      ),
    ).toBe(true);
    // 01 and 1 are the same number
    expect(
      has(
        checkDocument(order({ docNumber: '1/2026', blocks: [] })),
        'error',
        'already used',
      ),
    ).toBe(true);
  });

  it('warns when the series skips a number', () => {
    const issues = checkDocument(act({ docNumber: '5/2026' }));
    expect(
      has(
        issues,
        'warning',
        'next free Act number in 2026 is 3; 5 skips 3 to 4',
      ),
    ).toBe(true);
    // the first Regulation of the year is R-1
    expect(
      has(
        checkDocument(regulation({ docNumber: 'R-2/2026' })),
        'warning',
        'next free Regulation number in 2026 is 1',
      ),
    ).toBe(true);
  });

  it('needs a Notice’s reference number', () => {
    expect(
      has(
        checkDocument(notice({ docNumber: '' })),
        'error',
        'reference number',
      ),
    ).toBe(true);
  });
});

describe('amendments (points 19 and 36)', () => {
  it('accepts the set form', () => {
    const issues = checkDocument(
      act({
        title:
          'First Amendment to Act Number 2/2026 (Public Bonds Companies Act)',
      }),
    );
    expect(issues.filter((i) => i.rule.includes('point 19'))).toEqual([]);
  });

  it('flags the wrong form, type, title and order', () => {
    expect(
      has(
        checkDocument(
          act({ title: '1st Amendment of the Public Bonds Companies Act' }),
        ),
        'error',
        'First Amendment to Act Number',
      ),
    ).toBe(true);
    expect(
      has(
        checkDocument(
          regulation({
            title:
              'First Amendment to Act Number 2/2026 (Public Bonds Companies Act)',
          }),
        ),
        'error',
        'same type',
      ),
    ).toBe(true);
    expect(
      has(
        checkDocument(
          act({
            title: 'First Amendment to Act Number 2/2026 (Public Bonds Act)',
          }),
        ),
        'error',
        'is titled “Public Bonds Companies Act”',
      ),
    ).toBe(true);
    expect(
      has(
        checkDocument(
          act({
            title:
              'Second Amendment to Act Number 2/2026 (Public Bonds Companies Act)',
          }),
        ),
        'warning',
        'would be the First Amendment',
      ),
    ).toBe(true);
  });

  it('never amends a Notice', () => {
    expect(
      has(
        checkDocument(notice({ title: 'Amendment to Notice PO/2026/N/01' })),
        'error',
        'never amended',
      ),
    ).toBe(true);
  });
});

describe('enabling provisions (points 9, 10, 14 and 15)', () => {
  const firstArticle = (text: string) => {
    const r = regulation();
    const blocks = structuredClone(r.blocks);
    (blocks[1] as Extract<Block, { type: 'article' }>).clauses[0].text = text;
    return { ...r, blocks };
  };

  it('needs a Regulation’s enabling provision in the set form', () => {
    expect(
      has(
        checkDocument(firstArticle('This Regulation sets out the rules.')),
        'error',
        'made only under an enabling provision',
      ),
    ).toBe(true);
    expect(
      has(
        checkDocument(
          firstArticle(
            'This Regulation is made under the Public Bonds Companies Act.',
          ),
        ),
        'error',
        'set form',
      ),
    ).toBe(true);
  });

  it('checks the enabling document', () => {
    expect(
      has(
        checkDocument(
          firstArticle(
            'This Regulation is made under Article 12 (a) of Act Number 2/2026 (Bonds Act).',
          ),
        ),
        'error',
        'is titled “Public Bonds Companies Act”',
      ),
    ).toBe(true);
    expect(
      has(
        checkDocument(
          firstArticle(
            'This Regulation is made under Article 12 (a) of Act Number 9/2026 (Other Act).',
          ),
        ),
        'warning',
        'isn’t in the Gazette Register',
      ),
    ).toBe(true);
    expect(
      has(
        checkDocument(
          firstArticle(
            'This Regulation is made under Article 2 of Guideline Number G-1/2026 (A Guideline).',
          ),
        ),
        'error',
        'only under an Act or an Order',
      ),
    ).toBe(true);
  });

  it('lets a Guideline for a body’s own functions go without one, with a warning', () => {
    const g = regulation({
      type: 'guideline',
      docNumber: 'G-1/2026',
      title: 'Test Guideline',
    });
    const blocks = JSON.parse(
      JSON.stringify(g.blocks).replaceAll('Regulation', 'Guideline'),
    );
    blocks[1].clauses[0].text =
      'This Guideline sets out how the Department works.';
    expect(
      has(checkDocument({ ...g, blocks }), 'warning', 'own functions'),
    ).toBe(true);
  });
});

describe('Articles and points (points 20 and 27)', () => {
  const withArticles = (edit: (blocks: Block[]) => void) => {
    const input = act();
    edit(input.blocks);
    return checkDocument(input);
  };
  const article = (blocks: Block[], n: string) =>
    blocks.find((b) => b.type === 'article' && b.number === n) as Extract<
      Block,
      { type: 'article' }
    >;

  it('numbers Articles 1 to n and reports a break once', () => {
    const issues = withArticles((b) => {
      article(b, '4').number = '5';
      article(b, '3').number = '4';
      article(b, '2').number = '3';
    });
    expect(
      issues.filter((i) => i.message.startsWith('Expected Article')),
    ).toHaveLength(1);
  });

  it('numbers Chapters in order', () => {
    expect(
      has(
        withArticles(
          (b) => ((b[3] as { text: string }).text = 'Third Chapter'),
        ),
        'error',
        'Expected the Second Chapter',
      ),
    ).toBe(true);
  });

  it('runs (a), (b) and (1), (2) in order', () => {
    expect(
      has(
        withArticles((b) => (article(b, '1').clauses[1].label = '(c)')),
        'error',
        'Expected (b) here',
      ),
    ).toBe(true);
    expect(
      has(
        withArticles(
          (b) => (article(b, '2').clauses[0].items![1].label = '(3)'),
        ),
        'error',
        'Expected (2) here',
      ),
    ).toBe(true);
    expect(
      has(
        withArticles((b) => (article(b, '1').clauses[1].label = 'b)')),
        'error',
        '“b)” should be (b)',
      ),
    ).toBe(true);
  });

  it('never says “section”', () => {
    const issues = withArticles(
      (b) =>
        (article(b, '1').clauses[0].text =
          'This Act sets out the rules in this section and its subsections.'),
    );
    expect(
      issues.filter((i) => i.message.includes('Uses the word')),
    ).toHaveLength(2);
    // quoting the word is fine
    expect(
      withArticles(
        (b) =>
          (article(b, '1').clauses[0].text =
            'This Act never uses the word “section”.'),
      ),
    ).toEqual([]);
  });

  it('opens with Introduction and title, then the purpose', () => {
    expect(
      has(
        withArticles((b) => (article(b, '1').title = 'Introduction and name')),
        'error',
        '“Introduction and title”',
      ),
    ).toBe(true);
    expect(
      has(
        withArticles(
          (b) =>
            (article(b, '1').clauses[1].text =
              'This Act shall be cited as the “Other Act”.'),
        ),
        'error',
        'cited as “Other Act”',
      ),
    ).toBe(true);
    const aims = (b: Block[]) => {
      article(b, '2').title = 'Aims';
      article(b, '2').clauses = [
        { label: '(a)', text: 'The aims of this Act are set out here.' },
      ];
    };
    expect(has(withArticles(aims), 'error', 'Article 2 sets out')).toBe(true);
  });

  it('comes into force in the second last Article, never before publication', () => {
    const transition = (b: Block[]) => {
      article(b, '3').title = 'Transition';
      article(b, '3').clauses = [
        { label: '(a)', text: 'Existing tests continue.' },
      ];
    };
    expect(has(withArticles(transition), 'error', 'no Article does')).toBe(
      true,
    );
    expect(
      has(
        checkDocument(act({ commencesOn: '2026-11-01' })),
        'error',
        'before it’s published',
      ),
    ).toBe(true);
    expect(
      has(
        withArticles(
          (b) =>
            (article(b, '3').clauses[0].text =
              'This Act comes into force on 01 October 2026.'),
        ),
        'warning',
        'before publication',
      ),
    ).toBe(true);
  });

  it('ends signed and dated', () => {
    expect(
      has(
        withArticles((b) => b.splice(-2)),
        'error',
        'no signatures were found',
      ),
    ).toBe(true);
    expect(
      has(
        withArticles((b) => b.splice(-2, 1)),
        'warning',
        'No date of signing',
      ),
    ).toBe(true);
  });
});

describe('President’s Orders (points 21 and 28)', () => {
  const withBlocks = (
    edit: (blocks: Block[]) => void,
    over: Partial<CheckInput> = {},
  ) => {
    const input = order(over);
    edit(input.blocks);
    return checkDocument(input);
  };

  it('opens with the number, the title and the words “President’s Order”', () => {
    expect(
      has(
        withBlocks(
          (b) =>
            ((b[0] as { text: string }).text =
              'President’s Order Number 04/2026'),
        ),
        'error',
        'prints its number',
      ),
    ).toBe(true);
    expect(
      has(
        withBlocks((b) => ((b[2] as { text: string }).text = 'Order')),
        'error',
        'the words “President’s Order”',
      ),
    ).toBe(true);
    // after Director's Order 02/2026, the old name is wrong
    expect(
      has(
        withBlocks(
          (b) => ((b[2] as { text: string }).text = 'Director’s Order'),
        ),
        'error',
        'the words “President’s Order”',
      ),
    ).toBe(true);
  });

  it('needs each part in its place', () => {
    expect(
      has(
        withBlocks((b) => b.splice(3, 1)),
        'error',
        'state the following',
      ),
    ).toBe(true);
    expect(
      has(
        withBlocks((b) => b.splice(4, 2)),
        'error',
        'follow “Whereas:”',
      ),
    ).toBe(true);
    expect(
      has(
        withBlocks((b) => b.splice(6, 1)),
        'error',
        'Under the authority vested in',
      ),
    ).toBe(true);
    expect(
      has(
        withBlocks(
          (b) => ((b[9] as { text: string }).text = 'Issued at the office.'),
        ),
        'error',
        'when and where it was issued',
      ),
    ).toBe(true);
    expect(
      has(
        withBlocks((b) => b.splice(-1)),
        'error',
        'ends with the signature',
      ),
    ).toBe(true);
  });

  it('ends each reason with a semicolon', () => {
    expect(
      has(
        withBlocks(
          (b) =>
            ((b[5] as Extract<Block, { type: 'list' }>).items[0].text =
              'the rules must be tested.'),
        ),
        'warning',
        'semicolon',
      ),
    ).toBe(true);
  });

  it('numbers its points 1., 2. with (a), (b) under them, and has no Articles', () => {
    expect(
      has(
        withBlocks(
          (b) =>
            ((b[8] as Extract<Block, { type: 'list' }>).items[1].label = '3.'),
        ),
        'error',
        'Expected point 2.',
      ),
    ).toBe(true);
    expect(
      has(
        withBlocks((b) =>
          b.splice(8, 0, { type: 'article', number: '1', clauses: [] }),
        ),
        'error',
        'not in Articles',
      ),
    ).toBe(true);
  });

  it('is never published before it’s issued', () => {
    expect(
      has(
        checkDocument(order({ publishedOn: '2026-11-08' })),
        'error',
        'after the publication date',
      ),
    ).toBe(true);
  });
});

describe('citations (points 23 to 25)', () => {
  const saying = (text: string, over: Partial<CheckInput> = {}) => {
    const input = act(over);
    (
      input.blocks[2] as Extract<Block, { type: 'article' }>
    ).clauses[0].items![1].text = text;
    return checkDocument(input);
  };

  it('calls itself by its own type', () => {
    expect(
      has(
        saying('to apply this Regulation.'),
        'error',
        'calls itself “this Act”',
      ),
    ).toBe(true);
  });

  it('cites its own Articles in the set forms, and only ones that exist', () => {
    expect(
      has(saying('to apply Article 9 of this Act.'), 'error', 'no Article 9'),
    ).toBe(true);
    expect(
      has(
        saying('to apply Article 3 (z) of this Act.'),
        'error',
        'Article 3 has no (z)',
      ),
    ).toBe(true);
    expect(has(saying('to apply Article 3.'), 'warning', 'of this Act”')).toBe(
      true,
    );
    expect(
      has(
        saying('to apply Article 3(a) of this Act.'),
        'warning',
        'space after',
      ),
    ).toBe(true);
    expect(
      has(
        saying('to apply Articles 1-3 of this Act.'),
        'warning',
        '“Articles 1 to 3”',
      ),
    ).toBe(true);
    expect(
      has(saying('to apply Appendix 2 of this Act.'), 'error', 'no Appendix 2'),
    ).toBe(true);
  });

  it('cites points of an Order', () => {
    const input = order();
    (input.blocks[8] as Extract<Block, { type: 'list' }>).items[1].text =
      'See point 1 (c) of this Order, point 7 of this Order and Article 2 of this Order.';
    const issues = checkDocument(input);
    expect(has(issues, 'error', 'Point 1 has no (c)')).toBe(true);
    expect(has(issues, 'error', 'no point 7')).toBe(true);
    expect(has(issues, 'error', 'points, not Articles')).toBe(true);
  });

  it('cites other documents in full, as the register has them', () => {
    expect(
      has(saying('to apply Act Number 2/2026.'), 'error', 'title in brackets'),
    ).toBe(true);
    expect(
      has(
        saying('to apply Act Number 2/2026 (Bonds Act).'),
        'error',
        'is titled “Public Bonds Companies Act”',
      ),
    ).toBe(true);
    expect(
      has(
        saying('to apply Act Number 9/2026 (Missing Act).'),
        'warning',
        'isn’t in the Gazette Register',
      ),
    ).toBe(true);
    expect(
      has(saying('to apply Act No. 2/2026.'), 'error', 'not “Act No. 2/2026”'),
    ).toBe(true);
    expect(
      has(
        saying('to apply Issue Number 2/2026 (Public Bonds Companies Act).'),
        'error',
        'not “Issue Number 2/2026”',
      ),
    ).toBe(true);
    expect(
      has(
        saying('to apply Regulation Number 3/2026 (A Regulation).'),
        'error',
        'R-#/year',
      ),
    ).toBe(true);
    // Director's Order 01/2026 may be cited by its old name
    expect(
      saying(
        'to apply point 4 of Director’s Order Number 01/2026 (Establishment of the Continental Security Agency Gazette).',
      ),
    ).toEqual([]);
  });

  it('doesn’t cite the CSA Gazette', () => {
    expect(
      has(
        saying('to publish it in the CSA Gazette.'),
        'warning',
        'Cites the CSA Gazette',
      ),
    ).toBe(true);
    expect(saying('to tell the Gazette Office.')).toEqual([]);
  });
});

describe('Appendices (points 22, 25 and 29)', () => {
  const opening =
    'The Form stated in Article 2 (a) of The President’s Office’s Act Number 3/2026 (Test Act)';
  const withAppendix = (
    first: string,
    over: Partial<CheckInput> = {},
    blocks: Block[] = [],
  ) => {
    const input = act(over);
    (
      input.blocks[2] as Extract<Block, { type: 'article' }>
    ).clauses[0].items![1].text =
      'to apply the form in Appendix 1 of this Act.';
    input.appendices = [
      {
        number: 1,
        firstPageText: first,
        blocks: [
          { type: 'heading', text: 'Appendix 1' },
          { type: 'paragraph', text: first },
          ...blocks,
        ],
      },
    ];
    return checkDocument(input);
  };

  it('accepts a compliant Appendix', () => {
    const issues = withAppendix(`Appendix 1\n${opening}`);
    expect(lines(issues)).toEqual([]);
    // the provision it cites should mention it
    const other = withAppendix(
      `Appendix 1\n${opening.replace('Article 2 (a)', 'Article 3 (a)')}`,
    );
    expect(lines(other)).toEqual([
      'warning Appendix 1: Article 3 (a) doesn’t mention Appendix 1.',
    ]);
  });

  it('carries its number, cites its provision in full, and never says “this Act”', () => {
    expect(
      has(withAppendix(opening), 'error', '“Appendix 1” wasn’t found'),
    ).toBe(true);
    expect(
      has(
        withAppendix(`Appendix 2\n${opening}`, {}, []),
        'error',
        '“Appendix 1” wasn’t found',
      ),
    ).toBe(true);
    expect(
      has(
        withAppendix(
          'Appendix 1\nThe Form stated in Article 2 (a) of this Act',
        ),
        'error',
        'opens by citing the provision',
      ),
    ).toBe(true);
    expect(
      has(
        withAppendix(
          'Appendix 1\nThe Form stated in Article 2 (a) of this Department’s Issue Number 3/2026 (Test Act)',
        ),
        'error',
        'Cite the document in full',
      ),
    ).toBe(true);
    expect(
      has(
        withAppendix(`Appendix 1\n${opening}`, {}, [
          { type: 'paragraph', text: 'Under this Act, the form is filled in.' },
        ]),
        'error',
        'never says “this Act”',
      ),
    ).toBe(true);
  });

  it('calls them Appendices, in order', () => {
    expect(
      has(
        withAppendix(`Appendix 1\n${opening}`, {}, [
          { type: 'paragraph', text: 'See Schedule 2.' },
        ]),
        'error',
        'called Appendices',
      ),
    ).toBe(true);
    const input = act();
    input.appendices = [{ number: 2, firstPageText: 'Appendix 2', blocks: [] }];
    expect(has(checkDocument(input), 'error', 'Expected Appendix 1')).toBe(
      true,
    );
  });
});

describe('Notices and bodies (points 11, 14 and 16)', () => {
  it('doesn’t make rules in a Notice', () => {
    const input = notice();
    (input.blocks[1] as { text: string }).text =
      'Regulation Number R-1/2026 (A Regulation) is hereby repealed.';
    expect(
      has(checkDocument(input), 'warning', 'doesn’t create, amend or repeal'),
    ).toBe(true);
  });

  it('wants the reference and date at the top, and a signature', () => {
    const input = notice();
    input.blocks.shift();
    input.blocks.pop();
    const issues = checkDocument(input);
    expect(has(issues, 'warning', 'reference number (PO/2026/N/01)')).toBe(
      true,
    );
    expect(has(issues, 'warning', 'no signatures')).toBe(true);
  });

  it('establishes bodies only by an Act or an Order', () => {
    const input = regulation();
    (input.blocks[4] as Extract<Block, { type: 'article' }>).clauses[0].text =
      'A Testing Committee is hereby established. This Regulation comes into force on publication.';
    expect(
      has(
        checkDocument(input),
        'warning',
        'Only an Act or an Order can establish a body',
      ),
    ).toBe(true);
    const a = act();
    (a.blocks[4] as Extract<Block, { type: 'article' }>).clauses[0].text =
      'This Act comes into force on publication. The Office may make Acts on testing.';
    expect(has(checkDocument(a), 'error', 'No document creates an Act')).toBe(
      true,
    );
  });
});

describe('titles (Director’s Order 02/2026)', () => {
  const saying = (text: string, over: Partial<CheckInput> = {}) => {
    const input = act(over);
    (
      input.blocks[2] as Extract<Block, { type: 'article' }>
    ).clauses[0].items![1].text = text;
    return checkDocument(input).filter(
      (i) => i.rule === "Director's Order 02/2026",
    );
  };

  it('replaces the old titles once it’s in force', () => {
    expect(saying('to tell the Director.').map((i) => i.message)).toEqual([
      '“the Director” is now “the President” (Director’s Order 02/2026).',
    ]);
    expect(saying('to tell the Deputy Director.')[0].message).toContain(
      'the Vice President',
    );
    expect(saying('to tell The Director’s Office.')[0].message).toContain(
      'The President’s Office',
    );
    expect(
      saying('to write to info@tdo.csa or visit www.tdo.csa.').map(
        (i) => i.message,
      ),
    ).toEqual([
      '“@tdo.csa” is now “@po.csa” (Director’s Order 02/2026).',
      '“www.tdo.csa” is now “www.presidency.csa” (Director’s Order 02/2026).',
    ]);
    expect(
      saying('to tell the Director of the Continental Security Agency.'),
    ).toHaveLength(1);
  });

  it('leaves other directors alone', () => {
    expect(
      saying(
        'to tell the Executive Director, the Managing Director, the Director of Finance and the Directors of the Board.',
      ),
    ).toEqual([]);
  });

  it('flags the terminated titles', () => {
    expect(
      saying('to tell the Adjutant of the Continental Security Agency.')[0]
        .message,
    ).toContain('terminated');
    expect(
      saying('to tell the Commander-in-Chief of the Continental Armed Forces.'),
    ).toEqual([]);
  });

  it('applies only once Director’s Order 02/2026 is published, and not to Orders 01 and 02', () => {
    expect(saying('to tell the Director.', { register: REGISTER })).toEqual([]);
    const second = order({
      docNumber: '02/2026',
      register: REGISTER,
      issuingBody: 'The Director’s Office',
    });
    (second.blocks[8] as Extract<Block, { type: 'list' }>).items[1].text =
      'The Director is now the President.';
    expect(
      checkDocument(second).filter(
        (i) => i.rule === "Director's Order 02/2026",
      ),
    ).toEqual([]);
  });
});

describe('the published documents', () => {
  it('Director’s Order 01/2026: only the missing cover', () => {
    const issues = checkDocument({
      type: 'order',
      docNumber: '01/2026',
      title: 'Establishment of the Continental Security Agency Gazette',
      issuingBody: 'The Director’s Office',
      publishedOn: '2026-11-07',
      cover: false,
      blocks: transcript('2026110702'),
      appendices: [],
      register: REGISTER.filter((e) => e.type === 'act'),
    });
    expect(lines(issues)).toEqual([
      'error Cover: President’s Orders are published with a cover page. Use “Add Cover”.',
    ]);
  });

  // The Act was published before Director's Order 01/2026, which it doesn't follow in places.
  it('Act Number 2/2026: what predates the Order', () => {
    const issues = checkDocument({
      type: 'act',
      docNumber: '2/2026',
      title: 'Public Bonds Companies Act',
      issuingBody: 'Department of Economy and Trade',
      publishedOn: '2026-11-07',
      cover: true,
      blocks: transcript('2026110701'),
      appendices: [],
      register: REGISTER.slice(0, 1),
    });
    const count = (pattern: RegExp) =>
      issues.filter((i) => pattern.test(i.message)).length;
    expect(count(/ratifies/)).toBe(1);
    expect(count(/“Introduction and title”/)).toBe(1); // Article 1 is "Introduction and name"
    expect(count(/Cites the CSA Gazette/)).toBe(5);
    expect(count(/second last Article/)).toBe(1); // commencement is Article 70 of 73
    expect(count(/no signatures were found/)).toBe(1);
    expect(count(/Cite the document in full/)).toBe(4); // each Appendix's opening line
    expect(count(/not “Issue Number 2\/2026”/)).toBe(9);
    expect(count(/never says “this act”/)).toBe(1);
    expect(issues).toHaveLength(23);
  });
});
