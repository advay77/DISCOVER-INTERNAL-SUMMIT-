'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireUser, allows, can, scopeOf } from '@/lib/authz';
import { hashPassword } from '@/lib/auth';
import { CAPABILITY_KEYS, SCOPES } from '@/lib/capabilities';
import {
  text,
  optionalText,
  email as validEmail,
  oneOf,
  date as validDate,
  wholeNumber,
  id as validId,
  idList,
  STATUSES,
  LIMITS as BOUND,
} from '@/lib/validate';

async function log(actorId: string, verb: string, entityType: string, summary: string, entityId?: string) {
  await db.activityLog.create({ data: { actorId, verb, entityType, entityId, summary } });
}

/* ------------------------------------------------------------------ tasks */

export async function setTaskStatus(taskId: string, status: string) {
  const user = await requireUser();
  if (!validId(taskId)) return { error: 'Task not found.' };
  const next = oneOf(status, STATUSES.task, 'todo');
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: 'Task not found.' };
  if (!allows(user, 'tasks:edit', task)) return { error: 'You cannot change this task.' };

  await db.task.update({
    where: { id: taskId },
    data: { status: next, completedAt: next === 'done' ? new Date() : null },
  });
  await log(user.id, next === 'done' ? 'completed' : 'moved', 'task', `${task.title} → ${next.replace('_', ' ')}`, taskId);
  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function updateTask(taskId: string, data: FormData) {
  const user = await requireUser();
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: 'Task not found.' };
  if (!allows(user, 'tasks:edit', task)) return { error: 'You cannot change this task.' };

  const ownerId = validId(data.get('ownerId'));
  const patch: any = {
    title: text(data.get('title'), BOUND.title) || task.title,
    description: optionalText(data.get('description'), BOUND.notes),
    status: oneOf(data.get('status'), STATUSES.task, task.status as any),
    priority: oneOf(data.get('priority'), STATUSES.priority, task.priority as any),
    dueDate: validDate(data.get('dueDate')),
  };
  if (ownerId && can(user, 'tasks:assign')) patch.ownerId = ownerId;

  await db.task.update({ where: { id: taskId }, data: patch });
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath('/tasks');
  return { ok: true };
}

export async function createTask(data: FormData) {
  const user = await requireUser();
  if (scopeOf(user, 'tasks:edit') === 'none') return { error: 'You cannot create tasks.' };
  const event = await db.event.findFirst({ where: { isCurrent: true } });

  const title = text(data.get('title'), BOUND.title);
  if (!title) return { error: 'A task needs a title.' };

  const task = await db.task.create({
    data: {
      title,
      description: optionalText(data.get('description'), BOUND.notes),
      category: text(data.get('category'), BOUND.shortText) || 'Summit Logistics',
      priority: oneOf(data.get('priority'), STATUSES.priority, 'medium'),
      status: 'todo',
      dueDate: validDate(data.get('dueDate')),
      workstreamId: validId(data.get('workstreamId')),
      ownerId: validId(data.get('ownerId')) ?? user.id,
      createdById: user.id,
      eventId: event?.id,
    },
  });
  await log(user.id, 'created', 'task', title, task.id);
  revalidatePath('/tasks');
  return { ok: true, id: task.id };
}

/* --------------------------------------------------------------- speakers */

export async function updateSpeaker(id: string, data: FormData) {
  const user = await requireUser();
  const speaker = await db.speaker.findUnique({ where: { id } });
  if (!speaker) return { error: 'Speaker not found.' };
  if (!allows(user, 'speakers:edit', speaker)) return { error: 'You cannot edit this speaker.' };

  const status = oneOf(data.get('status'), STATUSES.speaker, speaker.status as any);
  await db.speaker.update({
    where: { id },
    data: {
      status,
      confirmed: status === 'Confirmed',
      headshot: data.get('headshot') === 'on',
      bio: data.get('bio') === 'on',
      registered: data.get('registered') === 'on',
      prepCallNeeded: data.get('prepCallNeeded') === 'on',
      notes: optionalText(data.get('notes'), BOUND.notes),
      topicFit: optionalText(data.get('topicFit'), BOUND.shortText),
      priority: oneOf(data.get('priority'), ['A', 'B', 'C', ''] as const, '') || null,
    },
  });
  await log(user.id, 'updated', 'speaker', `${speaker.name} → ${status}`, id);
  revalidatePath('/speakers');
  revalidatePath(`/speakers/${id}`);
  return { ok: true };
}

/* -------------------------------------------------------------- questions */

export async function updateQuestion(id: string, data: FormData) {
  const user = await requireUser();
  const q = await db.openQuestion.findUnique({ where: { id } });
  if (!q) return { error: 'Not found.' };
  if (!allows(user, 'questions:edit', q)) return { error: 'You cannot edit this question.' };

  await db.openQuestion.update({
    where: { id },
    data: {
      status: oneOf(data.get('status'), STATUSES.question, q.status as any),
      update: optionalText(data.get('update'), BOUND.notes),
    },
  });
  revalidatePath('/questions');
  return { ok: true };
}

export async function createQuestion(data: FormData) {
  const user = await requireUser();
  if (scopeOf(user, 'questions:edit') === 'none') return { error: 'You cannot raise questions.' };
  const event = await db.event.findFirst({ where: { isCurrent: true } });
  const question = text(data.get('question'), BOUND.shortText);
  if (!question) return { error: 'Write the question first.' };

  await db.openQuestion.create({
    data: {
      question,
      update: optionalText(data.get('update'), BOUND.notes),
      ownerId: validId(data.get('ownerId')) ?? user.id,
      workstreamId: validId(data.get('workstreamId')),
      eventId: event?.id,
    },
  });
  revalidatePath('/questions');
  return { ok: true };
}

/* ------------------------------------------------------------------ retro */

export async function addRetroItem(data: FormData) {
  const user = await requireUser();
  if (!can(user, 'retro:write')) return { error: 'You cannot add retro notes.' };
  const event = await db.event.findFirst({ where: { isCurrent: true } });
  if (!event) return { error: 'No active cycle.' };

  const note = text(data.get('text'), BOUND.notes);
  if (!note) return { error: 'Write something first.' };

  await db.retroItem.create({
    data: {
      eventId: event.id,
      kind: oneOf(data.get('kind'), STATUSES.retro, 'plus'),
      text: note,
      authorId: user.id,
    },
  });
  revalidatePath('/retro');
  return { ok: true };
}

/* ------------------------------------------------------------------ admin */

export async function setPermission(roleId: string, capability: string, scope: string) {
  const user = await requireUser();
  if (!can(user, 'admin:permissions')) return { error: 'Only the President can change permissions.' };
  if (!validId(roleId)) return { error: 'Role not found.' };
  if (!CAPABILITY_KEYS.includes(capability) || !SCOPES.includes(scope as any)) {
    return { error: 'Unknown permission.' };
  }

  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role) return { error: 'Role not found.' };

  // The President can never be locked out of this screen.
  if (role.key === 'president' && capability === 'admin:permissions' && scope === 'none') {
    return { error: 'The President cannot be removed from the permission editor.' };
  }

  const before = await db.rolePermission.findFirst({ where: { roleId, capability } });
  await db.rolePermission.upsert({
    where: { roleId_capability: { roleId, capability } },
    create: { roleId, capability, scope },
    update: { scope },
  });
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: 'permission.change',
      target: `${role.name} · ${capability}`,
      before: before?.scope ?? 'none',
      after: scope,
    },
  });
  revalidatePath('/admin');
  return { ok: true };
}

export async function setUserRole(userId: string, roleId: string) {
  const actor = await requireUser();
  if (!can(actor, 'admin:roles')) return { error: 'You cannot change roles.' };
  if (!validId(userId) || !validId(roleId)) return { error: 'Not found.' };

  const target = await db.user.findUnique({ where: { id: userId }, include: { role: true } });
  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!target || !role) return { error: 'Not found.' };

  // Never leave the organisation without a President.
  if (target.role.key === 'president' && role.key !== 'president') {
    const presidents = await db.user.count({ where: { role: { key: 'president' }, isActive: true } });
    if (presidents <= 1) return { error: 'There must always be one President. Appoint the new one first.' };
  }

  await db.user.update({ where: { id: userId }, data: { roleId } });
  await db.auditLog.create({
    data: { actorId: actor.id, action: 'role.change', target: target.name, before: target.role.name, after: role.name },
  });
  revalidatePath('/admin');
  revalidatePath('/team');
  return { ok: true };
}

export async function setUserActive(userId: string, active: boolean) {
  const actor = await requireUser();
  if (!can(actor, 'admin:users')) return { error: 'You cannot change members.' };
  if (userId === actor.id) return { error: 'You cannot deactivate yourself.' };

  const target = await db.user.findUnique({ where: { id: userId } });
  await db.user.update({
    where: { id: userId },
    data: {
      isActive: active,
      // Ends any session they already have open.
      sessionEpoch: { increment: 1 },
    },
  });
  await db.auditLog.create({
    data: {
      actorId: actor.id,
      action: active ? 'user.activate' : 'user.deactivate',
      target: target?.name ?? userId,
    },
  });
  revalidatePath('/admin');
  return { ok: true };
}

export async function inviteUser(data: FormData) {
  const actor = await requireUser();
  if (!can(actor, 'admin:users')) return { error: 'You cannot invite members.' };

  const email = validEmail(data.get('email'));
  const name = text(data.get('name'), BOUND.name);
  const roleId = validId(data.get('roleId'));
  if (!email) return { error: 'That does not look like an email address.' };
  if (!name || !roleId) return { error: 'Name, email and role are all needed.' };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: 'That email already has an account.' };

  // A random first password. The member resets it on first sign-in.
  const temp = Math.random().toString(36).slice(2, 10) + 'Aa1';
  const created = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(temp),
      title: optionalText(data.get('title'), BOUND.title),
      company: optionalText(data.get('company'), BOUND.name),
      roleId,
    },
  });

  const workstreamIdsRaw = idList(data.getAll('workstreams'), 10);
  if (workstreamIdsRaw.length) {
    await db.membership.createMany({
      data: workstreamIdsRaw.map((workstreamId) => ({ userId: created.id, workstreamId })),
    });
    // Join the matching workstream channels.
    const channels = await db.channel.findMany({ where: { workstreamId: { in: workstreamIdsRaw } } });
    const publics = await db.channel.findMany({ where: { type: 'public' } });
    await db.channelMember.createMany({
      data: [...channels, ...publics].map((c) => ({ channelId: c.id, userId: created.id })),
    });
  }

  await db.auditLog.create({
    data: { actorId: actor.id, action: 'user.invite', target: `${name} <${email}>`, after: temp },
  });
  revalidatePath('/admin');
  return { ok: true, tempPassword: temp };
}

export async function updateEvent(data: FormData) {
  const user = await requireUser();
  if (!can(user, 'admin:event')) return { error: 'You cannot edit the event.' };
  const event = await db.event.findFirst({ where: { isCurrent: true } });
  if (!event) return { error: 'No active cycle.' };

  await db.event.update({
    where: { id: event.id },
    data: {
      name: text(data.get('name'), BOUND.title) || event.name,
      theme: optionalText(data.get('theme'), BOUND.shortText),
      dayOneTheme: optionalText(data.get('dayOneTheme'), BOUND.shortText),
      dayTwoTheme: optionalText(data.get('dayTwoTheme'), BOUND.shortText),
      venue: optionalText(data.get('venue'), BOUND.title),
      city: optionalText(data.get('city'), BOUND.name),
      startDate: validDate(data.get('startDate')) ?? event.startDate,
      endDate: validDate(data.get('endDate')) ?? event.endDate,
      goalRegistrants: wholeNumber(data.get('goalRegistrants'), 0, 100000, event.goalRegistrants),
      goalOrganizations: wholeNumber(data.get('goalOrganizations'), 0, 10000, event.goalOrganizations),
    },
  });
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  return { ok: true };
}
