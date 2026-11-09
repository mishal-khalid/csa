import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { config } from '../config.js';

// Where the Gazette's PDFs are kept.
//
// - "gazette" is public: the published issues and appendices, which the public Gazette links to.
// - "gazette-drafts" is private: the uploaded originals and the portal's previews, reached only
//   through short-lived signed links.
//
// In production that's Supabase Storage. The portal uploads straight to it with a signed upload
// link (a function on Vercel can't take a request over 4.5 MB, and an issue can be far bigger). In
// local development the files go in backend/.gazette-files and this API serves them itself.

export type Bucket = 'gazette' | 'gazette-drafts';
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export interface UploadTarget {
  url: string;
  headers: Record<string, string>;
}

const LOCAL_ROOT = join(process.cwd(), '.gazette-files');
// paths are made by the API itself (drafts/<uuid>/main.pdf, 16.pdf ...); anything else is refused
const SAFE_PATH = /^[a-z0-9][a-z0-9/_.-]{0,200}$/;

const sign = (value: string) => createHmac('sha256', config.cookieSecret).update(`gazette-file:${value}`).digest('base64url');

@Injectable()
export class GazetteStorage {
  private readonly storage = config.storage;

  // Uploads on Vercel need Supabase Storage; a server there can't keep files of its own.
  get ready(): boolean {
    return this.storage.kind === 'supabase' || !config.onVercel;
  }

  private ensureReady() {
    if (!this.ready) throw new ServiceUnavailableException({ code: 'storage_not_set_up' });
  }

  private checkPath(path: string) {
    if (!SAFE_PATH.test(path) || path.includes('..')) throw new Error(`Bad storage path: ${path}`);
  }

  // Supabase's REST calls, with the secret key
  private async supabase(method: string, route: string, init: { body?: BodyInit; headers?: Record<string, string> } = {}) {
    if (this.storage.kind !== 'supabase') throw new Error('Not on Supabase');
    const res = await fetch(`${this.storage.url}/storage/v1${route}`, {
      method,
      headers: { apikey: this.storage.key, Authorization: `Bearer ${this.storage.key}`, ...init.headers },
      body: init.body,
    });
    if (!res.ok) throw new Error(`Supabase Storage ${method} ${route.split('?')[0]}: ${res.status} ${await res.text().catch(() => '')}`.slice(0, 300));
    return res;
  }

  // A link the portal can PUT one PDF to, for a few minutes.
  async uploadTarget(bucket: Bucket, path: string): Promise<UploadTarget> {
    this.ensureReady();
    this.checkPath(path);
    if (this.storage.kind === 'supabase') {
      const res = await this.supabase('POST', `/object/upload/sign/${bucket}/${path}`, { headers: { 'x-upsert': 'true' } });
      const { url } = (await res.json()) as { url: string };
      return { url: `${this.storage.url}/storage/v1${url}`, headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'true' } };
    }
    const expires = Math.floor(Date.now() / 1000) + 600;
    const token = `${bucket}:${path}:${expires}`;
    const query = new URLSearchParams({ bucket, path, expires: String(expires), sig: sign(token) });
    return { url: `${this.storage.apiUrl}/gazette/files/upload?${query}`, headers: { 'Content-Type': 'application/pdf' } };
  }

  // Checks a local upload link (local development only); returns where it may write.
  verifyLocalUpload(query: Record<string, unknown>): { bucket: Bucket; path: string } | null {
    if (this.storage.kind !== 'local') return null;
    const { bucket, path, expires, sig } = query;
    if (typeof bucket !== 'string' || typeof path !== 'string' || typeof expires !== 'string' || typeof sig !== 'string') return null;
    if (bucket !== 'gazette' && bucket !== 'gazette-drafts') return null;
    if (Number(expires) < Date.now() / 1000) return null;
    const expected = Buffer.from(sign(`${bucket}:${path}:${expires}`));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    this.checkPath(path);
    return { bucket, path };
  }

  async get(bucket: Bucket, path: string): Promise<Uint8Array | null> {
    this.checkPath(path);
    if (this.storage.kind === 'supabase') {
      try {
        const res = await this.supabase('GET', `/object/${bucket}/${path}`);
        return new Uint8Array(await res.arrayBuffer());
      } catch {
        return null;
      }
    }
    try {
      return new Uint8Array(await readFile(this.localFile(bucket, path)));
    } catch {
      return null;
    }
  }

  async put(bucket: Bucket, path: string, bytes: Uint8Array): Promise<void> {
    this.ensureReady();
    this.checkPath(path);
    if (this.storage.kind === 'supabase') {
      await this.supabase('POST', `/object/${bucket}/${path}`, {
        body: Buffer.from(bytes),
        headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'true', 'Cache-Control': 'max-age=300' },
      });
      return;
    }
    const file = this.localFile(bucket, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }

  async remove(bucket: Bucket, paths: string[]): Promise<void> {
    if (!paths.length) return;
    paths.forEach((path) => this.checkPath(path));
    if (this.storage.kind === 'supabase') {
      await this.supabase('DELETE', `/object/${bucket}`, { body: JSON.stringify({ prefixes: paths }), headers: { 'Content-Type': 'application/json' } });
      return;
    }
    await Promise.all(paths.map((path) => rm(this.localFile(bucket, path), { force: true })));
  }

  // A link to read a private file for `seconds`; `download` names the file to save it as.
  async signedUrl(bucket: Bucket, path: string, seconds: number, download?: string): Promise<string> {
    this.checkPath(path);
    if (this.storage.kind === 'supabase') {
      const res = await this.supabase('POST', `/object/sign/${bucket}/${path}`, {
        body: JSON.stringify({ expiresIn: seconds }),
        headers: { 'Content-Type': 'application/json' },
      });
      const { signedURL } = (await res.json()) as { signedURL: string };
      const url = `${this.storage.url}/storage/v1${signedURL}`;
      return download ? `${url}&download=${encodeURIComponent(download)}` : url;
    }
    const expires = Math.floor(Date.now() / 1000) + seconds;
    const query = new URLSearchParams({ bucket, path, expires: String(expires), sig: sign(`read:${bucket}:${path}:${expires}`) });
    if (download) query.set('download', download);
    return `${this.storage.apiUrl}/gazette/files/read?${query}`;
  }

  // Checks a local read link (local development only).
  verifyLocalRead(query: Record<string, unknown>): { bucket: Bucket; path: string } | null {
    if (this.storage.kind !== 'local') return null;
    const { bucket, path, expires, sig } = query;
    if (typeof bucket !== 'string' || typeof path !== 'string' || typeof expires !== 'string' || typeof sig !== 'string') return null;
    if (bucket !== 'gazette' && bucket !== 'gazette-drafts') return null;
    if (Number(expires) < Date.now() / 1000) return null;
    const expected = Buffer.from(sign(`read:${bucket}:${path}:${expires}`));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    this.checkPath(path);
    return { bucket, path };
  }

  // The public address of a published file.
  publicUrl(path: string): string {
    this.checkPath(path);
    if (this.storage.kind === 'supabase') return `${this.storage.url}/storage/v1/object/public/gazette/${path}`;
    return `${this.storage.apiUrl}/gazette/files/public/${path}`;
  }

  localFile(bucket: Bucket, path: string): string {
    const file = normalize(join(LOCAL_ROOT, bucket, path));
    if (!file.startsWith(join(LOCAL_ROOT, bucket))) throw new Error('Bad storage path');
    return file;
  }

  get isLocal(): boolean {
    return this.storage.kind === 'local';
  }
}
