'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateEvent } from '@/app/actions';

export function EventSettings({ event }: { event: any }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  return (
    <section className="card p-5">
      <h2 className="text-[15px] font-semibold text-ink">Event settings</h2>
      <p className="mt-1 text-[12.5px] text-ink-muted">
        The source trackers did not state confirmed dates or a venue. Set them here and the countdown, the
        playbook dates and the agenda all follow.
      </p>

      <form
        action={(fd) =>
          start(async () => {
            await updateEvent(fd);
            setSaved(true);
            router.refresh();
            setTimeout(() => setSaved(false), 2400);
          })
        }
        className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <label className="label">Event name</label>
          <input name="name" defaultValue={event.name} className="input mt-1.5" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Theme</label>
          <input name="theme" defaultValue={event.theme ?? ''} className="input mt-1.5" />
        </div>
        <div>
          <label className="label">Day 1 theme</label>
          <input name="dayOneTheme" defaultValue={event.dayOneTheme ?? ''} className="input mt-1.5" />
        </div>
        <div>
          <label className="label">Day 2 theme</label>
          <input name="dayTwoTheme" defaultValue={event.dayTwoTheme ?? ''} className="input mt-1.5" />
        </div>
        <div>
          <label className="label">Start date</label>
          <input type="date" name="startDate" defaultValue={event.startDate} className="input mt-1.5" />
        </div>
        <div>
          <label className="label">End date</label>
          <input type="date" name="endDate" defaultValue={event.endDate} className="input mt-1.5" />
        </div>
        <div>
          <label className="label">Venue</label>
          <input name="venue" defaultValue={event.venue ?? ''} className="input mt-1.5" />
        </div>
        <div>
          <label className="label">City</label>
          <input name="city" defaultValue={event.city ?? ''} className="input mt-1.5" />
        </div>
        <div>
          <label className="label">Goal — paying registrants</label>
          <input type="number" name="goalRegistrants" defaultValue={event.goalRegistrants} className="input mt-1.5" />
        </div>
        <div>
          <label className="label">Goal — organisations</label>
          <input type="number" name="goalOrganizations" defaultValue={event.goalOrganizations} className="input mt-1.5" />
        </div>

        <div className="flex items-center gap-3 sm:col-span-2">
          <button className="btn-primary" disabled={pending}>
            {pending ? 'Saving…' : 'Save event'}
          </button>
          {saved && <span className="text-[13px] font-medium text-forest">Saved</span>}
        </div>
      </form>
    </section>
  );
}
