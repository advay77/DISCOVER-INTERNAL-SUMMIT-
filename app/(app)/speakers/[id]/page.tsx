import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCan, allows, redact, SPEAKER_GATES, scopeOf } from '@/lib/authz';
import { db } from '@/lib/db';
import { Card, Pill, StatusPill, Avatar } from '@/components/ui';
import { Thread } from '@/components/Thread';
import { SpeakerEditor } from './SpeakerEditor';

export default async function SpeakerDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCan('speakers:view');
  const { id } = await params;

  const found = await db.speaker.findUnique({
    where: { id },
    include: { owner: true, workstream: true, sessions: { include: { session: true } } },
  });
  if (!found) notFound();
  if (!allows(user, 'speakers:view', found)) notFound();

  const speaker: any = redact(user, found as any, SPEAKER_GATES as any);
  const editable = allows(user, 'speakers:edit', found);
  const canSeeContact = scopeOf(user, 'speakers:contact') !== 'none';

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/speakers" className="mb-3 inline-block text-[13px] font-medium text-ink-muted hover:text-brand">
        ← Back to speakers
      </Link>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={speaker.status} />
              <Pill tone={speaker.speakerType === 'Keynote' ? 'brand' : 'neutral'}>{speaker.speakerType}</Pill>
              {speaker.priority && <Pill tone="navy">Priority {speaker.priority}</Pill>}
              {speaker.prepCallNeeded && <Pill tone="warn">Prep call needed</Pill>}
            </div>

            <h1 className="mt-4 text-[24px] font-bold tracking-tight text-ink">{speaker.name}</h1>
            <p className="mt-1 text-[13.5px] text-ink-muted">
              {speaker.title}
              {speaker.company ? ` · ${speaker.company}` : ''}
            </p>

            {speaker.topicFit && (
              <div className="mt-5 rounded-lg bg-paper p-4">
                <p className="label">Session fit</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink">{speaker.topicFit}</p>
              </div>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-3">
              <div>
                <dt className="label">Relationship owner</dt>
                <dd className="mt-1.5 flex items-center gap-2">
                  {speaker.owner ? (
                    <>
                      <Avatar name={speaker.owner.name} accent={speaker.owner.accent} size={24} />
                      <span className="text-[13.5px] font-medium">{speaker.owner.name}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="label">Programme book</dt>
                <dd className="mt-1.5 flex gap-1.5">
                  <Pill tone={speaker.bio ? 'ok' : 'bad'}>Bio {speaker.bio ? '✓' : '✗'}</Pill>
                  <Pill tone={speaker.headshot ? 'ok' : 'bad'}>Photo {speaker.headshot ? '✓' : '✗'}</Pill>
                </dd>
              </div>
              <div>
                <dt className="label">Registered</dt>
                <dd className="mt-1.5 text-[13.5px] font-medium">{speaker.registered ? 'Yes' : 'Not yet'}</dd>
              </div>
              {canSeeContact && (
                <div className="col-span-2">
                  <dt className="label">Contact</dt>
                  <dd className="mt-1.5 text-[13.5px]">{speaker.email ?? '—'}</dd>
                </div>
              )}
            </dl>

            {!canSeeContact && (
              <p className="mt-4 rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink-faint">
                Contact details are not part of your access.
              </p>
            )}

            {speaker.notes && (
              <p className="mt-5 whitespace-pre-wrap border-t border-line pt-5 text-[13.5px] leading-relaxed text-ink-muted">
                {speaker.notes}
              </p>
            )}
          </Card>

          {editable && <SpeakerEditor speaker={speaker} />}
        </div>

        <Card title="Discussion" bodyClass="p-4">
          <Thread
            entityType="speaker"
            entityId={speaker.id}
            meId={user.id}
            meName={user.name}
            meAccent={user.accent}
            compact
            placeholder="Add an outreach update…"
            emptyHint="No notes yet. Record what they said, so the next owner knows."
          />
        </Card>
      </div>
    </div>
  );
}
