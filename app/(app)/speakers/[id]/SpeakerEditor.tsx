'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateSpeaker } from '@/app/actions';

export function SpeakerEditor({ speaker }: { speaker: any }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const check = (name: string, label: string, defaultChecked: boolean) => (
    <label className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="accent-brand" />
      {label}
    </label>
  );

  return (
    <section className="card p-5">
      <h2 className="text-[15px] font-semibold text-ink">Move this speaker along</h2>

      <form
        action={(fd) =>
          start(async () => {
            const res = await updateSpeaker(speaker.id, fd);
            if ((res as any)?.error) setError((res as any).error);
            else {
              setError(null);
              setSaved(true);
              router.refresh();
              setTimeout(() => setSaved(false), 2200);
            }
          })
        }
        className="mt-4 space-y-3.5"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={speaker.status} className="input mt-1.5">
              {['Identified', 'Invited', 'Responded', 'Confirmed', 'Declined'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select name="priority" defaultValue={speaker.priority ?? ''} className="input mt-1.5">
              <option value="">None</option>
              <option value="A">A — invite now</option>
              <option value="B">B — invite next month</option>
              <option value="C">C — pause</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Session fit</label>
          <input name="topicFit" defaultValue={speaker.topicFit ?? ''} className="input mt-1.5" />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {check('bio', 'Bio received', !!speaker.bio)}
          {check('headshot', 'Headshot', !!speaker.headshot)}
          {check('registered', 'Registered', !!speaker.registered)}
          {check('prepCallNeeded', 'Prep call', !!speaker.prepCallNeeded)}
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea name="notes" rows={3} defaultValue={speaker.notes ?? ''} className="input mt-1.5" />
        </div>

        {error && <p className="text-[13px] font-medium text-brick">{error}</p>}

        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-[13px] font-medium text-forest">Saved</span>}
        </div>
      </form>
    </section>
  );
}
