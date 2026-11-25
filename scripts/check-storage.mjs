// Checks the Supabase Storage key in .env actually works, without printing it.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }),
);

const url = env.SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.log(`✗ ${!url ? 'SUPABASE_URL' : 'SUPABASE_SECRET_KEY'} is empty`);
  process.exit(1);
}

const kind = key.startsWith('sb_secret_')
  ? 'secret key (sb_secret_)'
  : key.startsWith('sb_publishable_')
    ? 'PUBLISHABLE key — wrong one'
    : key.split('.').length === 3
      ? (() => {
          try {
            const role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role;
            return role === 'service_role' ? 'legacy service_role key' : `legacy "${role}" key — wrong one`;
          } catch {
            return 'unreadable JWT';
          }
        })()
      : 'unrecognised format';

console.log(`key type: ${kind} (${key.length} chars)`);
if (/wrong one|unrecognised|unreadable/.test(kind)) process.exit(1);

const sb = createClient(url, key, { auth: { persistSession: false } });
const { data: buckets, error } = await sb.storage.listBuckets();
if (error) {
  console.log(`✗ storage refused the key: ${error.message}`);
  process.exit(1);
}
const ours = buckets.find((b) => b.id === 'discover-files');
console.log(`✓ storage accepted the key — ${buckets.length} bucket(s)`);
console.log(ours ? `✓ discover-files found, ${ours.public ? 'PUBLIC (wrong)' : 'private'}` : '✗ discover-files not found');

// Round trip: sign an upload, put a tiny file, confirm, delete.
const path = `uploads/_check/${Date.now()}.txt`;
const { data: signed, error: e1 } = await sb.storage.from('discover-files').createSignedUploadUrl(path);
if (e1) { console.log(`✗ could not sign an upload: ${e1.message}`); process.exit(1); }
const put = await fetch(signed.signedUrl, { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: 'ok' });
console.log(put.ok ? '✓ direct upload through a signed URL works' : `✗ direct upload failed: HTTP ${put.status}`);
const { data: dl } = await sb.storage.from('discover-files').createSignedUrl(path, 60);
const got = dl ? await (await fetch(dl.signedUrl)).text() : '';
console.log(got === 'ok' ? '✓ signed download works' : '✗ signed download failed');
await sb.storage.from('discover-files').remove([path]);
console.log('✓ test object removed');
process.exit(put.ok && got === 'ok' && ours && !ours.public ? 0 : 1);
