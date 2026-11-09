// The President's initials in the bottom-left corner of a page, as on a Maldivian Qaraar: a
// President's Order carries them on every page of the issue except the Gazette's cover and the
// Order's last page, which has the full signature. Its appendices carry them too.
//
// Placed as in the CSA Gazette skill's "Initials on every page": 36 pt tall, its lower-left corner
// 52 pt from the left edge and 30 pt from the bottom, as the page is seen (so a page turned with
// /Rotate gets them in its seen corner too).

import { inflateSync } from 'node:zlib';
import { PDFDocument, PDFPage, PDFRef, popGraphicsState, pushGraphicsState, concatTransformationMatrix, drawObject } from 'pdf-lib';
import { initialsAlpha, initialsHeight, initialsWidth } from './initials-asset.js';

export const INITIALS = {
  left: 52,
  bottom: 30,
  height: 36,
  // the ink's grey (15/255), as in the skill
  ink: 15,
} as const;

// width in points, kept in the image's proportions
export const INITIALS_WIDTH = (INITIALS.height * initialsWidth) / initialsHeight;

// The image, added to `doc` once and shared by every page: solid ink grey, shown through the
// alpha of the ink.
function embedInitials(doc: PDFDocument): PDFRef {
  const image = { Type: 'XObject', Subtype: 'Image', Width: initialsWidth, Height: initialsHeight, ColorSpace: 'DeviceGray', BitsPerComponent: 8 };
  const alpha = inflateSync(Buffer.from(initialsAlpha, 'base64'));
  const mask = doc.context.register(doc.context.flateStream(alpha, image));
  const ink = new Uint8Array(initialsWidth * initialsHeight).fill(INITIALS.ink);
  return doc.context.register(doc.context.flateStream(ink, { ...image, SMask: mask }));
}

// Where the image goes on `page`: the matrix that maps the image's 1 x 1 space onto the seen
// bottom-left corner.
export function cornerMatrix(page: PDFPage): [number, number, number, number, number, number] {
  const { x, y, width, height } = page.getCropBox();
  const w = INITIALS_WIDTH;
  const h = INITIALS.height;
  const u = INITIALS.left;
  const v = INITIALS.bottom;
  switch ((((page.getRotation().angle % 360) + 360) % 360)) {
    // turned a quarter clockwise: the seen bottom-left is the page's bottom-right
    case 90:
      return [0, w, -h, 0, x + width - v, y + u];
    case 180:
      return [-w, 0, 0, -h, x + width - u, y + height - v];
    // turned a quarter anticlockwise: the seen bottom-left is the page's top-left
    case 270:
      return [0, -w, h, 0, x + v, y + height - u];
    default:
      return [w, 0, 0, h, x + u, y + v];
  }
}

// Puts the initials on the pages of `doc` at `indices`.
export function addInitials(doc: PDFDocument, indices: number[]) {
  if (!indices.length) return;
  const image = embedInitials(doc);
  const pages = doc.getPages();
  for (const index of indices) {
    const page = pages[index];
    // (naming the image also wraps what's already on the page in its own graphics state, so the
    // page's drawing can't move or recolour the initials)
    const name = page.node.newXObject('Initials', image);
    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...cornerMatrix(page)), drawObject(name), popGraphicsState());
  }
}
