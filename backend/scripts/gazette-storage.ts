// Makes the Gazette's two buckets on Supabase Storage, once:
//
//   npm run supabase:gazette-storage
//
// - "gazette": public. The published issues and appendices, which the public Gazette links to.
// - "gazette-drafts": private. Uploaded originals and the portal's previews.
// Both take PDFs only, up to 50 MB each. It needs SUPABASE_URL and SUPABASE_SECRET_KEY in
// .env.supabase (Supabase dashboard → Project Settings → API Keys → a secret key). Running it again
// leaves buckets that are already there alone.

import { config } from '../src/config.js';
import { MAX_FILE_BYTES } from '../src/gazette/storage.js';

const storage = config.storage;
if (storage.kind !== 'supabase') {
  console.error('SUPABASE_URL and SUPABASE_SECRET_KEY are needed (in .env.supabase).');
  process.exit(1);
}

for (const [id, isPublic] of [
  ['gazette', true],
  ['gazette-drafts', false],
] as const) {
  const res = await fetch(`${storage.url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { apikey: storage.key, Authorization: `Bearer ${storage.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name: id, public: isPublic, file_size_limit: MAX_FILE_BYTES, allowed_mime_types: ['application/pdf'] }),
  });
  const body = await res.text();
  if (res.ok) console.log(`Made "${id}" (${isPublic ? 'public' : 'private'}).`);
  else if (/already exists|Duplicate/i.test(body)) console.log(`"${id}" is already there.`);
  else {
    console.error(`Couldn't make "${id}": ${res.status} ${body}`);
    process.exitCode = 1;
  }
}
