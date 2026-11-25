'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { loginAction } from './actions';
import { IconTeam, IconAdmin } from '@/components/icons';

const DOORS = [
  {
    key: 'board',
    label: 'Board & officers',
    Icon: IconAdmin,
    hint: 'President, officers, directors and workstream leads.',
  },
  {
    key: 'volunteer',
    label: 'Volunteers',
    Icon: IconTeam,
    hint: 'Summit and programme volunteers.',
  },
];

export function LoginForm({ door }: { door: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const router = useRouter();

  return (
    <div className="mt-8">
      <p className="label">Account type</p>
      <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-[5px] border border-line-strong">
        {DOORS.map((d, i) => {
          const active = door === d.key;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => router.replace(`/login?as=${d.key}`)}
              className={clsx(
                'flex items-center justify-center gap-2 px-3 py-2.5 text-[12.5px] font-semibold transition',
                i === 1 && 'border-l border-line-strong',
                active ? 'bg-navy text-white' : 'bg-white text-ink-muted hover:bg-paper hover:text-ink',
              )}
            >
              <d.Icon size={15} className={active ? 'text-brass' : 'text-ink-faint'} />
              {d.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-ink-faint">{DOORS.find((d) => d.key === door)?.hint}</p>

      <form action={action} className="mt-7 space-y-4">
        <input type="hidden" name="door" value={door} />

        <div>
          <label className="label" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="name@discover.org"
            className="input mt-1.5 py-2.5"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••••"
            className="input mt-1.5 py-2.5"
            required
          />
        </div>

        {state?.error && (
          <p className="rounded-[4px] border border-brick/30 bg-brick-100 px-3 py-2 text-[12.5px] font-medium text-brick">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-8 border-t border-line pt-5 text-[12px] leading-relaxed text-ink-faint">
        Accounts are issued by the President. If you have lost your password, ask her to reset it —
        there is no public sign-up and no self-serve reset.
      </p>
    </div>
  );
}
