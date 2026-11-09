// The soft shadow Word puts behind the cover's title (the template's text box has an outer shadow).
// It's drawn the way Word's PDF export does it: a greyscale picture of the title, blurred, set just
// under the text. Measured on the V2-N14 cover: 300 dpi, offset 0.25 pt right and 0.5 pt down, a
// Gaussian blur of 2 px, black at 44.5% at its darkest. Everything here is plain arithmetic, so the
// same title always gives the same picture.

// fontkit's glyph outline commands (font units, y up)
type PathCommand = { command: string; args: number[] };
export interface ShadowGlyph {
  commands: PathCommand[];
  // the glyph's origin on the line, in points from the line's start
  x: number;
}

export const SHADOW = { dpi: 300, dx: 0.25, dy: 0.5, sigmaPx: 2, opacity: 0.445 };

const SUPERSAMPLE = 4;
const CURVE_STEPS = 12;

type Edge = [number, number, number, number]; // x0, y0, x1, y1 in supersampled pixels, y down

// The alpha of the shadow over a box `width` x `height` points (rounded to whole pixels), with the
// line's baseline `baseline` points below the box's top and its start `left` points in from the
// box's left. Returns 8-bit alpha, row by row from the top.
export function shadowAlpha(
  glyphs: ShadowGlyph[],
  unitsPerEm: number,
  size: number,
  box: { width: number; height: number; left: number; baseline: number },
): { width: number; height: number; alpha: Uint8Array } {
  const px = SHADOW.dpi / 72;
  const width = Math.round(box.width * px);
  const height = Math.round(box.height * px);
  const ss = px * SUPERSAMPLE;
  const unit = size / unitsPerEm;

  // the outlines as straight edges, in supersampled pixels
  const edges: Edge[] = [];
  for (const glyph of glyphs) {
    const toX = (fx: number) => (box.left + SHADOW.dx + glyph.x + fx * unit) * ss;
    const toY = (fy: number) => (box.baseline + SHADOW.dy - fy * unit) * ss;
    let start: [number, number] | null = null;
    let pen: [number, number] = [0, 0];
    const line = (x: number, y: number) => {
      edges.push([pen[0], pen[1], x, y]);
      pen = [x, y];
    };
    for (const { command, args } of glyph.commands) {
      if (command === 'moveTo') {
        if (start && (pen[0] !== start[0] || pen[1] !== start[1])) line(start[0], start[1]);
        pen = [toX(args[0]), toY(args[1])];
        start = pen;
      } else if (command === 'lineTo') {
        line(toX(args[0]), toY(args[1]));
      } else if (command === 'quadraticCurveTo') {
        const [x0, y0] = pen;
        const [cx, cy, x1, y1] = [toX(args[0]), toY(args[1]), toX(args[2]), toY(args[3])];
        for (let i = 1; i <= CURVE_STEPS; i++) {
          const t = i / CURVE_STEPS;
          const u = 1 - t;
          line(u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1);
        }
      } else if (command === 'bezierCurveTo') {
        const [x0, y0] = pen;
        const [c1x, c1y, c2x, c2y, x1, y1] = [toX(args[0]), toY(args[1]), toX(args[2]), toY(args[3]), toX(args[4]), toY(args[5])];
        for (let i = 1; i <= CURVE_STEPS; i++) {
          const t = i / CURVE_STEPS;
          const u = 1 - t;
          line(
            u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x1,
            u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y1,
          );
        }
      } else if (command === 'closePath') {
        if (start) line(start[0], start[1]);
      }
    }
    if (start && (pen[0] !== start[0] || pen[1] !== start[1])) line(start[0], start[1]);
  }

  // fill (non-zero winding) at the supersampled size, counting coverage per output pixel
  const coverage = new Float64Array(width * height);
  const ssWidth = width * SUPERSAMPLE;
  const crossings: { x: number; dir: number }[] = [];
  for (let sy = 0; sy < height * SUPERSAMPLE; sy++) {
    const y = sy + 0.5;
    crossings.length = 0;
    for (const [x0, y0, x1, y1] of edges) {
      if (y0 === y1) continue;
      const down = y1 > y0;
      const top = down ? y0 : y1;
      const bottom = down ? y1 : y0;
      if (y < top || y >= bottom) continue;
      crossings.push({ x: x0 + ((y - y0) * (x1 - x0)) / (y1 - y0), dir: down ? 1 : -1 });
    }
    crossings.sort((a, b) => a.x - b.x || a.dir - b.dir);
    let winding = 0;
    for (let i = 0; i < crossings.length - 1; i++) {
      winding += crossings[i].dir;
      if (winding === 0) continue;
      const from = Math.max(0, Math.ceil(crossings[i].x - 0.5));
      const to = Math.min(ssWidth - 1, Math.floor(crossings[i + 1].x - 0.5));
      const row = Math.floor(sy / SUPERSAMPLE) * width;
      for (let sx = from; sx <= to; sx++) coverage[row + Math.floor(sx / SUPERSAMPLE)] += 1;
    }
  }
  const samples = SUPERSAMPLE * SUPERSAMPLE;
  for (let i = 0; i < coverage.length; i++) coverage[i] /= samples;

  // Gaussian blur, rows then columns
  const radius = Math.ceil(SHADOW.sigmaPx * 3);
  const kernel: number[] = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const k = Math.exp(-(i * i) / (2 * SHADOW.sigmaPx * SHADOW.sigmaPx));
    kernel.push(k);
    sum += k;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
  const blurred = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < width) v += coverage[y * width + xx] * kernel[k + radius];
      }
      blurred[y * width + x] = v;
    }
  }
  const alpha = new Uint8Array(width * height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let v = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < height) v += blurred[yy * width + x] * kernel[k + radius];
      }
      alpha[y * width + x] = Math.round(Math.min(1, v) * SHADOW.opacity * 255);
    }
  }
  return { width, height, alpha };
}
