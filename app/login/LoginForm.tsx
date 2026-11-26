'use client';

import { useActionState } from 'react';
import { loginAction } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="mt-8 space-y-4">
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
        <p className="rounded-lg border border-brick/30 bg-brick-100 px-3 py-2 text-[12.5px] font-medium text-brick">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
