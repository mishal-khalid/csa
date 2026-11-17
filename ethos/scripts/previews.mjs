// Makes the first-page image for each document in lib/documents.js that doesn't have one yet:
// public/previews/<file>.webp, 800 px wide, on white. `npm run previews -- --force` remakes them all.
//
// macOS only: the page is drawn by Quick Look (qlmanage), which renders PDFs the way Preview does.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { documents } from "../lib/documents.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const force = process.argv.includes("--force");
const work = mkdtempSync(path.join(tmpdir(), "ethos-previews-"));

try {
  for (const doc of documents) {
    const pdf = path.join(root, "public/documents", `${doc.file}.pdf`);
    const out = path.join(root, "public/previews", `${doc.file}.webp`);
    if (!existsSync(pdf)) throw new Error(`Missing ${path.relative(root, pdf)}`);
    if (existsSync(out) && !force) continue;

    execFileSync("qlmanage", ["-t", "-s", "1600", "-o", work, pdf], { stdio: "ignore" });
    const rendered = path.join(work, `${doc.file}.pdf.png`);
    if (!existsSync(rendered)) throw new Error(`Quick Look couldn't draw ${doc.file}.pdf`);

    // Quick Look leaves the page transparent; flatten it onto white
    await sharp(rendered).flatten({ background: "#ffffff" }).resize({ width: 800 }).webp({ quality: 82 }).toFile(out);
    console.log(`made ${path.relative(root, out)}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
