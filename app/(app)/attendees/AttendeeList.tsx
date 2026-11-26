'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Pill, StatusPill } from '@/components/ui';
import { IconSearch } from '@/components/icons';
import { saveAttendee, deleteAttendee } from '@/app/actions';

export type AttendeeRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  ticketType: string;
  status: string;
  paid: boolean;
};

const TICKETS = ['General', 'VIP', 'Student', 'Speaker'];
const STATUSES = ['Confirmed', 'Pending', 'Waitlist', 'Cancelled'];

const ticketTone = (t: string) => (t === 'VIP' ? 'brand' : t === 'Student' ? 'warn' : t === 'Speaker' ? 'ok' : 'neutral');

export function AttendeeList({
  attendees,
  canEdit,
  showContact,
  exportAction,
}: {
  attendees: AttendeeRow[];
  canEdit: boolean;
  showContact: boolean;
  exportAction: React.ReactNode;
}) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState<AttendeeRow | 'new' | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return attendees.filter(
      (a) =>
        (!status || a.status === status) &&
        (!needle || `${a.name} ${a.company ?? ''} ${a.email ?? ''} ${a.ticketType}`.toLowerCase().includes(needle)),
    );
  }, [attendees, q, status]);

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">Registrations</h2>
          <p className="text-[12.5px] text-ink-muted">
            {shown.length === attendees.length
              ? `${attendees.length} ${attendees.length === 1 ? 'person' : 'people'}`
              : `${shown.length} of ${attendees.length} people`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exportAction}
          {canEdit && (
            <button type="button" className="btn-primary btn-sm" onClick={() => setEditing('new')}>
              + Add attendee
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-4 pt-3 sm:px-5">
        <label className="relative w-full sm:w-64">
          <IconSearch size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, company, ticket"
            aria-label="Search attendees"
            className="input rounded-full bg-panel py-1.5 pl-9"
          />
        </label>
        <div className="chip-row flex flex-wrap gap-1.5">
          {[null, ...STATUSES].map((s) => {
            const n = s ? attendees.filter((a) => a.status === s).length : attendees.length;
            const active = status === s;
            return (
              <button
                key={s ?? 'all'}
                type="button"
                onClick={() => setStatus(s)}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition',
                  active ? 'bg-navy text-white' : 'bg-panel text-ink-muted hover:text-ink',
                )}
              >
                {s ?? 'All'}
                <span className={clsx('rounded-full px-1.5 text-[11px] font-semibold', active ? 'bg-white/20' : 'bg-white')}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {attendees.length === 0 ? (
        <div className="m-4 rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center sm:m-5">
          <p className="text-[15px] font-semibold text-ink">No one registered yet</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-ink-muted">
            {canEdit
              ? 'Add people as they sign up: name, company, ticket type and whether they have paid. The goals above fill in as you go.'
              : 'Registrations will appear here once the team starts adding them.'}
          </p>
          {canEdit && (
            <button type="button" className="btn-primary mt-4" onClick={() => setEditing('new')}>
              + Add the first attendee
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-y border-line">
              <tr>
                <th className="th">Name</th>
                <th className="th">Company</th>
                {showContact && <th className="th">Email</th>}
                <th className="th">Ticket</th>
                <th className="th">Paid</th>
                <th className="th">Status</th>
                {canEdit && <th className="th w-px" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((a) => (
                <tr key={a.id} className="hover:bg-panel/60">
                  <td className="td font-medium text-ink">{a.name}</td>
                  <td className="td text-[13px] text-ink-muted">{a.company ?? '—'}</td>
                  {showContact && <td className="td text-[12.5px] text-ink-muted">{a.email ?? '—'}</td>}
                  <td className="td">
                    <Pill tone={ticketTone(a.ticketType)}>{a.ticketType}</Pill>
                  </td>
                  <td className="td text-[13px]">{a.paid ? <span className="font-medium text-forest">Paid</span> : <span className="text-ink-faint">Not yet</span>}</td>
                  <td className="td">
                    <StatusPill status={a.status} />
                  </td>
                  {canEdit && (
                    <td className="td text-right">
                      <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(a)} aria-label={`Edit ${a.name}`}>
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="td py-8 text-center text-[13px] text-ink-faint">
                    Nobody matches that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <AttendeeForm attendee={editing === 'new' ? null : editing} showContact={showContact} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}

function AttendeeForm({
  attendee,
  showContact,
  onClose,
}: {
  attendee: AttendeeRow | null;
  showContact: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [another, setAnother] = useState(false);
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);

  const done = (res: any) => {
    if (res?.error) return setError(res.error);
    setError(null);
    router.refresh();
    if (another) setFormKey((k) => k + 1);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/45 p-4 py-10" role="dialog" aria-modal="true" aria-label={attendee ? 'Edit attendee' : 'Add attendee'}>
      <div className="card my-auto w-full max-w-lg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">{attendee ? 'Edit attendee' : 'Add attendee'}</h2>
          <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        <form key={formKey} action={(fd) => start(async () => done(await saveAttendee(fd)))} className="space-y-3.5">
          {attendee && <input type="hidden" name="id" value={attendee.id} />}
          <div>
            <label className="label" htmlFor="att-name">Full name</label>
            <input id="att-name" name="name" className="input mt-1.5" defaultValue={attendee?.name} required autoFocus />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="att-company">Company</label>
              <input id="att-company" name="company" className="input mt-1.5" defaultValue={attendee?.company ?? ''} />
            </div>
            {showContact && (
              <div>
                <label className="label" htmlFor="att-email">Email</label>
                <input id="att-email" name="email" type="email" className="input mt-1.5" defaultValue={attendee?.email ?? ''} />
              </div>
            )}
            <div>
              <label className="label" htmlFor="att-ticket">Ticket</label>
              <select id="att-ticket" name="ticketType" className="input mt-1.5" defaultValue={attendee?.ticketType ?? 'General'}>
                {TICKETS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="att-status">Status</label>
              <select id="att-status" name="status" className="input mt-1.5" defaultValue={attendee?.status ?? 'Confirmed'}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2.5 text-[13.5px] text-ink">
            <input type="checkbox" name="paid" defaultChecked={attendee?.paid ?? false} className="h-4 w-4 accent-brand" />
            Ticket paid
          </label>

          {error && <p className="text-[13px] font-medium text-brick">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {attendee ? (
              <button
                type="button"
                className="btn-ghost text-brick"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Remove ${attendee.name} from the list?`)) return;
                  start(async () => {
                    const res = await deleteAttendee(attendee.id);
                    if ((res as any)?.error) setError((res as any).error);
                    else {
                      router.refresh();
                      onClose();
                    }
                  });
                }}
              >
                Remove
              </button>
            ) : (
              <label className="flex items-center gap-2 text-[12.5px] text-ink-muted">
                <input type="checkbox" checked={another} onChange={(e) => setAnother(e.target.checked)} className="h-3.5 w-3.5" />
                Add another after this
              </label>
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={pending}>
                {pending ? 'Saving…' : attendee ? 'Save' : 'Add attendee'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
