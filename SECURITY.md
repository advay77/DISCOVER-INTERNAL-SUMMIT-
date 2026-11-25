# Security audit — DISCOVER OS

Run against the codebase on 25 November 2026. Every line below was checked, not
assumed; where something is weaker than it looks, it says so.

| # | Item | State |
|---|---|---|
| 1 | Hide API keys | ✅ none exist |
| 2 | Check env variables | ✅ |
| 3 | Protect admin routes | ✅ |
| 4 | Proper authentication | ✅ hardened |
| 5 | Users access own data | ✅ |
| 6 | Sanitize forms | ✅ added |
| 7 | Block XSS | ✅ |
| 8 | Rate limiting | ✅ added and proven |
| 9 | CORS settings | ✅ |
| 10 | Security headers | ✅ added |
| 11 | Debug mode off | ✅ |
| 12 | Update dependencies | ✅ 0 vulnerabilities |
| 13 | Unused packages | ✅ none |
| 14 | Check exposed files | ✅ |
| 15 | Secure database | ⚠️ pending Supabase |
| 16 | Hash passwords | ✅ strengthened |
| 17 | Secrets in git history | ✅ clean |
| 18 | Full security audit | this document |

---

## 1–2. API keys and environment variables

The app calls no third-party API, so there are no keys to leak. The only secrets
are `DATABASE_URL` and `SESSION_SECRET`, both injected by the host.

- `git grep` for key and secret patterns across all tracked files: **nothing**
- `.env`, `.env.local`, `*.db`, `storage/`, `*.log` are gitignored **and**
  `.vercelignore`d, so a CLI deploy cannot upload them either
- `git ls-files` contains no `.env`, database, or log file

**Fixed during this pass:** a CLI deploy had previously uploaded the local
`.env`. That is what made a broken build appear to work. `.vercelignore` now
prevents it.

## 3. Admin routes

`/admin` requires `admin:users`, `admin:permissions` or `admin:event`; without
them the request is redirected to an explanation page. Every admin action
re-checks on the server — the page guard is not the control.

Verified as a volunteer: `/admin` blocked, `/api/attendees/export` **403**.

## 4. Authentication

| | |
|---|---|
| Passwords | bcrypt, **12 rounds** (raised from 10) |
| Session | signed JWT (HS256) in an HTTP-only, SameSite=Lax, Secure cookie |
| Lifetime | **14 days** (reduced from 30) |
| Algorithm | pinned — a token claiming `alg: none` is rejected |
| Secret | **production refuses to start** if `SESSION_SECRET` is missing or under 32 characters |
| Revocation | **new** — `sessionEpoch` on the user; deactivating someone bumps it and every existing cookie dies immediately |
| Enumeration | one message for "no such account" and "wrong password", and the bcrypt comparison runs even when no user exists, so the two take the same time |

No public sign-up and no self-serve reset; the President issues accounts.

## 5. Users access own data

One module decides everything: `lib/authz.ts`.

- scope narrows the **database query** before it runs, never after
- gated fields are stripped server-side, so a hidden field is absent from the
  response rather than hidden with CSS
- the Finance workstream is `restricted`, and one rule removes everything inside
  it for anyone without `finance:view`

Verified as a volunteer: Finance invisible in team, chat and tasks; speakers and
sponsors open; export refused.

## 6. Sanitize forms

**New: `lib/validate.ts`.** Every server action and API route now passes input
through it:

- text is trimmed, control characters stripped, length capped per field
- statuses, priorities and visibilities accept only values from a known list
- dates must parse and fall between 2000 and 2100
- numbers are clamped to a range
- ids must look like a cuid before they reach a query
- emails are shape-checked

This is not about injection — Prisma parameterises every query — it is about
unbounded input: an 8 MB message, a 2,000-character channel name, `priority:
"DROP TABLE"`.

## 7. XSS

- React escapes everything it renders; there is **no `dangerouslySetInnerHTML`**
  anywhere in the codebase
- a Content-Security-Policy is now served (see 10)
- **uploaded files were the real risk**, and are now handled properly:
  - executables and scripts (`.exe .js .html .svg .php` and others) are refused
    at upload
  - only known-safe media renders inline; everything else downloads
  - a non-inline file is served as `application/octet-stream`, so a file that
    claims to be HTML cannot execute
  - every file response carries `nosniff` and its own
    `Content-Security-Policy: default-src 'none'; sandbox`

## 8. Rate limiting

**New, and the implementation matters.** The first version counted in memory —
which is worthless on a serverless host, because each request can land on a
fresh instance with an empty counter. It now lives in a database table that
every instance shares.

| Action | Limit |
|---|---|
| Sign-in | 8 per 10 minutes, counted **per address and per account** |
| Messages | 40 per minute per person |
| Uploads | 20 per minute per person |
| Channel creation | 10 per minute per person |

**Proven, not assumed:** 45 messages posted in a loop — 40 accepted, the 41st
onward rejected with HTTP 429 and a readable message. A successful sign-in
clears that account's counter.

## 9. CORS

No CORS headers are set anywhere, so the browser's same-origin rule applies and
no other site can call the API with a user's cookie. The session cookie is
`SameSite=Lax`, and `form-action 'self'` stops a form on another origin posting
here.

## 10. Security headers

Served on every response:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:;
  media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none';
  form-action 'self'; base-uri 'self'; object-src 'none';
  upgrade-insecure-requests
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), geolocation=(), payment=(), usb=(), microphone=(self)
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

`X-Powered-By` is switched off, and `/api/*` is `private, no-store`.

**Honest limit:** `script-src` still allows `'unsafe-inline'`, which the Next.js
App Router bootstrap requires. Removing it needs per-request nonces. Worth doing
if this ever holds anything more sensitive than a summit plan.

## 11. Debug mode

`NODE_ENV=production` on the host. Prisma logs errors only in production
(queries and warnings are development-only). No stack traces reach the browser —
Next.js returns a digest, and the detail stays in the server log. Source maps
are not served to the client.

## 12–13. Dependencies

- **Before:** 2 vulnerabilities (1 high, 1 moderate) — a path-traversal in the
  PostCSS copy nested inside Next.js
- **Fixed** with an npm `overrides` entry pinning `postcss ^8.5.33` everywhere,
  rather than a breaking jump to Next 16
- **After: `npm audit` reports 0 vulnerabilities**
- React, autoprefixer and the type packages updated to current patch releases
- Every dependency is imported somewhere; **no unused packages**

## 14. Exposed files

- uploads are never public URLs — each read is permission-checked, by id
- the storage path is resolved and confirmed to sit inside `storage/`, so a
  crafted name cannot escape it
- no `public/` directory, so nothing is served unauthenticated
- the demo database ships only when there is no Postgres, and holds no real data

## 15. Secure database

Local SQLite today. **This is the one item still open**, and it closes when
Supabase is connected:

- use the pooled connection for the app and the direct one for schema changes
- the database password lives only in Vercel's environment
- Supabase enforces TLS
- turn on backups

Access control is enforced in the application, not with Postgres row-level
security. That is a deliberate choice: one connection role, one place where
permission is decided. RLS would be a second, independent layer — worth adding
if the database is ever opened to another client.

## 16. Password hashing

bcrypt at **12 rounds** (was 10). Passwords are never logged, never returned by
an API, and never written to a committed file — the seed writes them to a
gitignored `CREDENTIALS.md` on your own machine.

## 17. Secrets in git history

Checked the **entire history**, not just the current tree:

```
git grep <password patterns> $(git rev-list --all)   → nothing
git log --all --name-only | grep -E '^\.env|credentials|\.db$'  → nothing
```

An earlier commit *would* have published every password in a public repo. It was
caught before the push, the roster was restructured so passwords are generated
at seed time instead, and the commit was amended — so they never entered history
at all.

## 18. What is still open

| | Item | Why it is not done |
|---|---|---|
| 1 | Real database + backups | waiting on Supabase |
| 2 | Nonce-based CSP | needs middleware; current policy is already strong |
| 3 | Postgres row-level security | second layer; app-layer authz is the primary |
| 4 | Automated tests | everything above was verified by hand |
| 5 | Password reset by email | no mail service; the President resets by hand |
| 6 | 2FA | reasonable for the President's account one day |
