import { requireCan, scopeOf, scopeFilter, can, visibleWorkstreams } from '@/lib/authz';
import { db } from '@/lib/db';
import { PageHeader, Card, StatusPill, Avatar, Empty } from '@/components/ui';
import { relativeTime } from '@/lib/format';
import { QuestionRow, NewQuestion } from './QuestionClient';

export default async function QuestionsPage() {
  const user = await requireCan('questions:view');

  const scope = scopeOf(user, 'questions:view');
  const where: any = scopeFilter(user, 'questions:view');

  const [questions, people, workstreams] = await Promise.all([
    db.openQuestion.findMany({ where, orderBy: { updatedAt: 'desc' }, include: { owner: true, workstream: true } }),
    db.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    db.workstream.findMany({ where: visibleWorkstreams(user), orderBy: { order: 'asc' }, select: { id: true, name: true } }),
  ]);

  const editable = scopeOf(user, 'questions:edit') !== 'none';
  const blocked = questions.filter((q) => q.status === 'Blocked');

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Open questions"
        subtitle="The blocker list. An unanswered question is a risk, not a task."
        action={editable ? <NewQuestion people={people} workstreams={workstreams} /> : undefined}
      />

      {blocked.length > 0 && (
        <div className="mb-5 rounded-card border border-brick/30 bg-brick/5 px-5 py-3.5">
          <p className="text-[13.5px] text-ink">
            <strong className="font-semibold">
              {blocked.length} {blocked.length === 1 ? 'question is' : 'questions are'} blocked.
            </strong>{' '}
            Nothing moves behind these until someone decides.
          </p>
        </div>
      )}

      {questions.length === 0 ? (
        <Empty title="Nothing open" hint="When something needs a decision, raise it here instead of in a chat thread that scrolls away." />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id} bodyClass="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-ink">{q.question}</h3>
                  {q.update && <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{q.update}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-ink-faint">
                    {q.owner && (
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={q.owner.name} accent={q.owner.accent} size={18} />
                        {q.owner.name}
                      </span>
                    )}
                    {q.workstream && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: q.workstream.color }} />
                        {q.workstream.name}
                      </span>
                    )}
                    <span>updated {relativeTime(q.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill status={q.status} />
                </div>
              </div>

              {editable && <QuestionRow id={q.id} status={q.status} update={q.update ?? ''} />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
