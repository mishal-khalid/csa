import { describe, expect, it } from 'vitest';
import { bodyId, renameOf, sameBody, typeName, typeNamed } from './names.js';
import { coverNumberLine, referenceFor } from './numbering.js';
import { BODY_RENAMES, type BodyRename } from './renames.js';

const renamed = (from: string, to: string): BodyRename => ({
  from,
  to,
  source: 'a later Order',
  effective: { type: 'order', docNumber: '9/2027' },
});

describe('bodies', () => {
  it('resolves The Director’s Office and The President’s Office to one body', () => {
    expect(bodyId('The Director’s Office')).toBe(
      bodyId('The President’s Office'),
    );
    expect(sameBody("the director's office", 'The  President’s Office')).toBe(
      true,
    );
  });

  it('keeps other bodies apart', () => {
    expect(sameBody('Department of Defence', 'The President’s Office')).toBe(
      false,
    );
    expect(
      sameBody('The Director’s Office', 'Department of Economy and Trade'),
    ).toBe(false);
  });

  it('follows a chain of renames', () => {
    const chain = [
      ...BODY_RENAMES,
      renamed('The President’s Office', 'The Presidency'),
    ];
    expect(sameBody('The Director’s Office', 'The Presidency', chain)).toBe(
      true,
    );
    expect(sameBody('The President’s Office', 'The Presidency', chain)).toBe(
      true,
    );
  });

  it('gives one ID to a body renamed back to an old name', () => {
    const back = [
      ...BODY_RENAMES,
      renamed('The President’s Office', 'The Director’s Office'),
    ];
    expect(bodyId('The Director’s Office', back)).toBe(
      bodyId('The President’s Office', back),
    );
  });

  it('records the rename of Director’s Order 02/2026, point 3 (a)', () => {
    expect(renameOf('The Director’s Office')).toEqual({
      from: 'The Director’s Office',
      to: 'The President’s Office',
      source: 'Director’s Order Number 02/2026, point 3 (a)',
      effective: { type: 'order', docNumber: '02/2026' },
    });
    expect(renameOf('The President’s Office')).toBeUndefined();
  });
});

describe('Director’s and President’s Orders', () => {
  it('are one type', () => {
    expect(typeNamed('Director’s Order')).toBe('order');
    expect(typeNamed("President's Order")).toBe('order');
    expect(typeNamed('Act')).toBe('act');
  });

  it('keep the name Director’s Order for 01 and 02/2026 only', () => {
    expect(typeName('order', '01/2026')).toBe('Director’s Order');
    expect(typeName('order', '02/2026')).toBe('Director’s Order');
    expect(typeName('order', '03/2026')).toBe('President’s Order');
    expect(typeName('order', '1/2027')).toBe('President’s Order');
    expect(typeName('order')).toBe('President’s Order');
    expect(typeName('act', '1/2026')).toBe('Act');
  });

  it('are referenced and covered under that name', () => {
    expect(referenceFor('order', '02/2026')).toBe(
      'Director’s Order Number 02/2026',
    );
    expect(referenceFor('order', '03/2026')).toBe(
      'President’s Order Number 03/2026',
    );
    expect(coverNumberLine('order', '03/2026')).toBe(
      'President’s Order: 03/2026',
    );
    expect(referenceFor('act', '3/2026')).toBe('Act Number 3/2026');
  });
});
