'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@/app/actions';

export function ProfileForm({
  profile,
}: {
  profile: { name: string; title: string | null; company: string | null; phone: string | null };
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await updateProfile(fd);
          if (res?.error) {
            setSaved(false);
            setError(res.error);
            return;
          }
          setError(null);
          setSaved(true);
          router.refresh();
          setTimeout(() => setSaved(false), 2200);
        })
      }
      className="space-y-3.5"
    >
      <div>
        <label className="label" htmlFor="profile-name">Name</label>
        <input id="profile-name" name="name" defaultValue={profile.name} className="input mt-1.5" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="profile-title">Title</label>
          <input id="profile-title" name="title" defaultValue={profile.title ?? ''} className="input mt-1.5" />
        </div>
        <div>
          <label className="label" htmlFor="profile-company">Company</label>
          <input id="profile-company" name="company" defaultValue={profile.company ?? ''} className="input mt-1.5" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="profile-phone">Phone</label>
        <input id="profile-phone" name="phone" defaultValue={profile.phone ?? ''} className="input mt-1.5" />
      </div>
      {error && <p className="text-[13px] font-medium text-brick">{error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <button className="btn-primary" disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </button>
        {saved && <span className="text-[13px] font-medium text-forest">Saved</span>}
      </div>
    </form>
  );
}
