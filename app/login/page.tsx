import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { IS_DEMO } from '@/lib/db';
import { Logo } from '@/components/Logo';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect('/dashboard');

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.08fr_1fr]">
      {/* Left: the institution. One quiet statement, no counters. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 px-14 py-14 lg:flex">
        {/* A single structural mark: the DISCOVER arc, drawn large and faint. */}
        <svg
          className="pointer-events-none absolute -right-24 top-1/2 h-[520px] w-[760px] -translate-y-1/2 opacity-[0.07]"
          viewBox="0 0 400 260"
          fill="none"
          aria-hidden
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M8 ${232 - i * 14}C100 ${80 - i * 26} 300 ${80 - i * 26} 392 ${232 - i * 14}`}
              stroke="#FFFFFF"
              strokeWidth="1.25"
            />
          ))}
        </svg>

        <Logo tone="light" size="lg" />

        <div className="relative max-w-[30rem]">
          <h1 className="display text-[52px] leading-[1.02] text-white">
            The whole cycle,
            <br />
            in one room.
          </h1>

          <p className="mt-7 max-w-[26rem] text-[14.5px] leading-[1.75] text-white/55">
            Tasks, speakers, sponsors, logistics — and the conversation about all of it, attached to
            the work rather than scattered across inboxes and group chats.
          </p>

          <p className="mt-10 border-l-2 border-lime pl-5 text-[13.5px] leading-relaxed text-white/70">
            What you can see follows what you do. The President sets the rest.
          </p>
        </div>

        <p className="relative text-[11px] uppercase tracking-[0.22em] text-white/25">
          Educate. Connect. Lead.
        </p>
      </div>

      {/* Right: the form */}
      <div className="flex items-center justify-center bg-white px-6 py-14 sm:px-14">
        <div className="w-full max-w-[23rem]">
          <div className="mb-10 lg:hidden">
            <Logo tone="dark" size="md" />
          </div>

          <p className="text-2xs font-semibold uppercase tracking-label text-ink-faint">
            DISCOVER internal
          </p>
          <h2 className="display mt-3 text-[32px] leading-tight text-ink">Sign in</h2>

          {IS_DEMO && (
            <div className="mt-5 rounded-xl border-l-2 border-brass bg-brass-100 px-4 py-3">
              <p className="text-[12.5px] font-semibold text-ink">Demo</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                Everything works, and anything you change here resets on its own. Sign in with any
                address below and the password{' '}
                <code className="rounded bg-white px-1 py-0.5 font-semibold text-ink">
                  discover-demo
                </code>
                .
              </p>
              <ul className="mt-2 space-y-0.5 text-[12px] text-ink-muted">
                <li>
                  <strong className="text-ink">yahne@discover.org</strong> — President, sees
                  everything
                </li>
                <li>
                  <strong className="text-ink">gagan@discover.org</strong> — Treasurer, runs Finance
                </li>
                <li>
                  <strong className="text-ink">taylor@discover.org</strong> — Communications lead
                </li>
                <li>
                  <strong className="text-ink">mandy@discover.org</strong> — Volunteer, no Finance
                </li>
              </ul>
            </div>
          )}

          <LoginForm />
        </div>
      </div>
    </main>
  );
}
