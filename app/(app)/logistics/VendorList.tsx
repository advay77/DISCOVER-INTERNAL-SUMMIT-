'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Avatar, StatusPill } from '@/components/ui';
import { saveVendor, deleteVendor } from '@/app/actions';

export type VendorRow = {
  id: string;
  name: string;
  service: string;
  paymentMethod: string | null;
  /** Null when the viewer cannot see money. */
  amount: number | null;
  paymentStatus: string;
  dueDate: string | null;
  notes: string | null;
  owner: { id: string; name: string; accent: string } | null;
  workstreamId: string | null;
  editable: boolean;
};

type Option = { id: string; name: string };

const STATUSES = ['Not started', 'Quoted', 'Deposit paid', 'Paid'];
const SERVICES = ['Venue', 'Catering', 'AV & tech', 'Printing & signage', 'Badges & lanyards', 'Photography', 'Hotel / room block', 'Transport', 'Gala dinner', 'Other'];

const fmtMoney = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function dueText(iso: string | null, status: string) {
  if (!iso) return { text: '—', tone: 'text-ink-faint' };
  const d = new Date(iso);
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (status === 'Paid') return { text: label, tone: 'text-ink-faint' };
  if (days < 0) return { text: `${label} · overdue`, tone: 'text-brick font-medium' };
  if (days <= 14) return { text: `${label} · in ${days}d`, tone: 'text-brass font-medium' };
  return { text: label, tone: 'text-ink-muted' };
}

export function VendorList({
  vendors,
  canAdd,
  canSeeMoney,
  canEditMoney,
  people,
  workstreams,
  meId,
}: {
  vendors: VendorRow[];
  canAdd: boolean;
  canSeeMoney: boolean;
  canEditMoney: boolean;
  people: Option[];
  workstreams: Option[];
  meId: string;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<VendorRow | 'new' | null>(null);
  const shown = useMemo(() => vendors.filter((v) => !filter || v.paymentStatus === filter), [vendors, filter]);

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">Vendors</h2>
          <p className="text-[12.5px] text-ink-muted">Who supplies what, who owns it, and whether they have been paid.</p>
        </div>
        {canAdd && (
          <button type="button" className="btn-primary btn-sm" onClick={() => setEditing('new')}>
            + Add vendor
          </button>
        )}
      </header>

      {vendors.length > 0 && (
        <div className="chip-row flex flex-wrap gap-1.5 px-4 pt-3 sm:px-5">
          {[null, ...STATUSES].map((s) => {
            const n = s ? vendors.filter((v) => v.paymentStatus === s).length : vendors.length;
            const active = filter === s;
            return (
              <button
                key={s ?? 'all'}
                type="button"
                onClick={() => setFilter(s)}
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
      )}

      {vendors.length === 0 ? (
        <div className="m-4 rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center sm:m-5">
          <p className="text-[15px] font-semibold text-ink">No vendors yet</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-ink-muted">
            List everyone the Summit pays: the venue, caterer, AV, printing, badges, photographer. Each gets an owner and a
            payment status, so nothing is left unpaid on the day.
          </p>
          {canAdd && (
            <button type="button" className="btn-primary mt-4" onClick={() => setEditing('new')}>
              + Add the first vendor
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-y border-line">
              <tr>
                <th className="th">Vendor</th>
                <th className="th">Service</th>
                {canSeeMoney && <th className="th">Amount</th>}
                <th className="th">Payment due</th>
                <th className="th">Owner</th>
                <th className="th">Payment</th>
                <th className="th w-px" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((v) => {
                const due = dueText(v.dueDate, v.paymentStatus);
                return (
                  <tr key={v.id} className="hover:bg-panel/60">
                    <td className="td">
                      <p className="font-medium text-ink">{v.name}</p>
                      {v.notes && <p className="max-w-[260px] truncate text-[12px] text-ink-faint">{v.notes}</p>}
                    </td>
                    <td className="td text-[13px] text-ink-muted">
                      {v.service}
                      {v.paymentMethod && <span className="block text-[12px] text-ink-faint">{v.paymentMethod}</span>}
                    </td>
                    {canSeeMoney && <td className="td font-semibold">{fmtMoney(v.amount)}</td>}
                    <td className={clsx('td text-[13px]', due.tone)}>{due.text}</td>
                    <td className="td">
                      {v.owner ? (
                        <span className="flex items-center gap-2">
                          <Avatar name={v.owner.name} accent={v.owner.accent} size={22} />
                          <span className="text-[13px]">{v.owner.name}</span>
                        </span>
                      ) : (
                        <span className="text-[13px] text-ink-faint">No owner</span>
                      )}
                    </td>
                    <td className="td">
                      <StatusPill status={v.paymentStatus} />
                    </td>
                    <td className="td text-right">
                      {v.editable && (
                        <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(v)} aria-label={`Edit ${v.name}`}>
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="h-3" />

      {editing && (
        <VendorForm
          vendor={editing === 'new' ? null : editing}
          canEditMoney={canEditMoney}
          people={people}
          workstreams={workstreams}
          meId={meId}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function VendorForm({
  vendor,
  canEditMoney,
  people,
  workstreams,
  meId,
  onClose,
}: {
  vendor: VendorRow | null;
  canEditMoney: boolean;
  people: Option[];
  workstreams: Option[];
  meId: string;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const summit = workstreams.find((w) => /summit/i.test(w.name))?.id ?? workstreams[0]?.id ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/45 p-4 py-10" role="dialog" aria-modal="true" aria-label={vendor ? 'Edit vendor' : 'Add vendor'}>
      <div className="card my-auto w-full max-w-lg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">{vendor ? 'Edit vendor' : 'Add vendor'}</h2>
          <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        <form
          action={(fd) =>
            start(async () => {
              const res = await saveVendor(fd);
              if ((res as any)?.error) setError((res as any).error);
              else {
                router.refresh();
                onClose();
              }
            })
          }
          className="space-y-3.5"
        >
          {vendor && <input type="hidden" name="id" value={vendor.id} />}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="v-name">Vendor name</label>
              <input id="v-name" name="name" className="input mt-1.5" defaultValue={vendor?.name} placeholder="e.g. Hilton Midtown" required autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="v-service">Service</label>
              <input id="v-service" name="service" list="v-services" className="input mt-1.5" defaultValue={vendor?.service} placeholder="Catering, AV…" required />
              <datalist id="v-services">
                {SERVICES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label" htmlFor="v-status">Payment status</label>
              <select id="v-status" name="paymentStatus" className="input mt-1.5" defaultValue={vendor?.paymentStatus ?? 'Not started'}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="v-due">Payment due</label>
              <input id="v-due" name="dueDate" type="date" className="input mt-1.5" defaultValue={vendor?.dueDate?.slice(0, 10) ?? ''} />
            </div>
            {canEditMoney && (
              <div>
                <label className="label" htmlFor="v-amount">Amount (USD)</label>
                <input id="v-amount" name="amount" inputMode="decimal" className="input mt-1.5" defaultValue={vendor?.amount ?? ''} placeholder="0" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="v-method">Payment method</label>
              <input id="v-method" name="paymentMethod" className="input mt-1.5" defaultValue={vendor?.paymentMethod ?? ''} placeholder="Card, invoice, cheque…" />
            </div>
            <div>
              <label className="label" htmlFor="v-owner">Owner</label>
              <select id="v-owner" name="ownerId" className="input mt-1.5" defaultValue={vendor ? vendor.owner?.id ?? '' : meId}>
                <option value="">No owner</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="v-ws">Workstream</label>
              <select id="v-ws" name="workstreamId" className="input mt-1.5" defaultValue={vendor ? vendor.workstreamId ?? '' : summit}>
                <option value="">None</option>
                {workstreams.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="v-notes">Notes</label>
            <textarea id="v-notes" name="notes" rows={2} className="input mt-1.5" defaultValue={vendor?.notes ?? ''} placeholder="Contact, contract terms, what is still missing…" />
          </div>

          {error && <p className="text-[13px] font-medium text-brick">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {vendor ? (
              <button
                type="button"
                className="btn-ghost text-brick"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Remove ${vendor.name}?`)) return;
                  start(async () => {
                    const res = await deleteVendor(vendor.id);
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
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={pending}>
                {pending ? 'Saving…' : vendor ? 'Save' : 'Add vendor'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
