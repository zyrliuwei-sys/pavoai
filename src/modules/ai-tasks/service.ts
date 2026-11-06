import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { atomic, AtomicGuardError, guard } from '@/core/db/atomic';
import { aiTask } from '@/config/db/schema';
import { planConsume, planRevoke } from '@/modules/credits/service';
import { jsonObject } from '@/lib/generation-delivery';
import { getUuid } from '@/lib/hash';

export enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

/**
 * Create an AI task with optional credit consumption.
 */
export async function createTask(params: {
  userId: string;
  mediaType: string;
  provider: string;
  model: string;
  prompt: string;
  costCredits?: number;
  options?: any;
  scene?: string;
}): Promise<any> {
  const { userId, mediaType, provider, model, prompt, costCredits, options } =
    params;

  for (let attempt = 0; attempt < 3; attempt++) {
    const taskData: typeof aiTask.$inferInsert = {
      id: getUuid(),
      userId,
      mediaType,
      provider,
      model,
      prompt,
      status: AITaskStatus.PENDING,
      costCredits: costCredits || 0,
      options: options ? JSON.stringify(options) : null,
      scene: params.scene || '',
    };

    // Plan the credit charge first, then write the task and the charge in one
    // atomic step (D1-safe) — never a task without its charge or vice versa.
    const plan =
      costCredits && costCredits > 0
        ? await planConsume({
            userId,
            credits: costCredits,
            scene: 'ai_task',
            description: `AI ${mediaType} generation`,
            metadata: JSON.stringify({ taskId: taskData.id }),
          })
        : undefined;
    if (plan === null) throw new Error('Insufficient credits');
    if (plan) {
      // Stored for revocation if the task fails.
      taskData.taskInfo = JSON.stringify({
        creditId: plan.consumedCredit.id,
      });
    }

    try {
      await atomic((q) => [
        q.insert(aiTask).values(taskData),
        ...(plan ? plan.steps(q) : []),
      ]);
    } catch (error) {
      // A concurrent spend drained the grants we planned on: re-plan.
      if (error instanceof AtomicGuardError) continue;
      throw error;
    }

    const [task] = await db()
      .select()
      .from(aiTask)
      .where(eq(aiTask.id, taskData.id))
      .limit(1);
    return task;
  }
  throw new Error('Insufficient credits');
}

/**
 * Update task status. Revokes credits on failure.
 */
export async function updateTask(params: {
  taskId: string;
  status: AITaskStatus;
  taskResult?: any;
}) {
  const { taskId, status, taskResult } = params;
  for (let attempt = 0; attempt < 5; attempt++) {
    const task = await findTask(taskId);
    if (!task) throw new Error('Task not found');
    if (
      task.status === AITaskStatus.SUCCESS ||
      task.status === AITaskStatus.CANCELED
    )
      return;
    if (task.status === AITaskStatus.FAILED && status !== AITaskStatus.FAILED)
      return;
    const updateData: any = { status };
    if (taskResult) updateData.taskResult = JSON.stringify(taskResult);
    const info = jsonObject(task.taskInfo);
    const refund =
      status === AITaskStatus.FAILED && info.creditId
        ? await planRevoke(info.creditId)
        : undefined;
    try {
      // Claim the task and restore its charge in the same D1-safe batch.
      // A stale success/failure cannot overwrite the winning terminal state.
      await atomic((q) => [
        guard({
          table: aiTask,
          column: 'userId',
          where: eq(aiTask.id, taskId),
          require: eq(aiTask.status, task.status),
          message: 'Task state changed',
        }),
        q.update(aiTask).set(updateData).where(eq(aiTask.id, taskId)),
        ...(refund ? refund.steps(q) : []),
      ]);
      return;
    } catch (error) {
      if (error instanceof AtomicGuardError) continue;
      throw error;
    }
  }
  throw new Error('Task state changed; retry shortly');
}

/**
 * Get tasks for a user.
 */
export async function getTasks(params: {
  userId: string;
  mediaType?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { userId, mediaType, status, page = 1, limit = 20 } = params;

  return db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        status ? eq(aiTask.status, status) : undefined,
        isNull(aiTask.deletedAt)
      )
    )
    .orderBy(desc(aiTask.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

/**
 * Find task by ID.
 */
export async function findTask(taskId: string) {
  const [result] = await db()
    .select()
    .from(aiTask)
    .where(and(eq(aiTask.id, taskId), isNull(aiTask.deletedAt)))
    .limit(1);
  return result;
}

/**
 * Attach provider-side info (e.g. the external task id) onto a task, merging
 * with the existing taskInfo so the creditId kept for revocation survives.
 */
export async function attachTaskInfo(
  taskId: string,
  patch: Record<string, unknown>
) {
  await changeTaskInfo(taskId, (info) => ({ ...info, ...patch }));
}

/** Compare-and-swap prevents a poll, scheduler and delivery from losing each other's metadata. */
export async function changeTaskInfo(
  taskId: string,
  mutate: (info: Record<string, any>) => Record<string, any> | null
): Promise<boolean> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const task = await findTask(taskId);
    if (!task) throw new Error('Task not found');
    const next = mutate(jsonObject(task.taskInfo));
    if (!next) return false;
    const changed = await db()
      .update(aiTask)
      .set({ taskInfo: JSON.stringify(next) })
      .where(
        and(
          eq(aiTask.id, taskId),
          task.taskInfo === null
            ? isNull(aiTask.taskInfo)
            : eq(aiTask.taskInfo, task.taskInfo)
        )
      )
      .returning({ id: aiTask.id });
    if (changed.length) return true;
  }
  throw new Error('Task is being updated; retry shortly');
}

export async function finishTaskDelivery(taskId: string) {
  await db()
    .update(aiTask)
    .set({ scene: 'generation_delivered' })
    .where(eq(aiTask.id, taskId));
}

export async function pendingDeliveries(limit = 10) {
  const candidates = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.scene, 'generation_delivery_pending'),
        isNull(aiTask.deletedAt)
      )
    )
    .orderBy(asc(aiTask.updatedAt))
    .limit(200);
  return candidates
    .filter(
      (task: any) =>
        Number(jsonObject(task.taskInfo).retryAt || 0) <= Date.now()
    )
    .slice(0, limit);
}

export async function getWorks(userId: string, page = 1, limit = 12) {
  const where = and(
    eq(aiTask.userId, userId),
    eq(aiTask.provider, 'evolink'),
    isNull(aiTask.deletedAt)
  );
  const [items, totals] = await Promise.all([
    db()
      .select()
      .from(aiTask)
      .where(where)
      .orderBy(desc(aiTask.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db().select({ n: count() }).from(aiTask).where(where),
  ]);
  return { items, total: Number(totals[0]?.n || 0) };
}
