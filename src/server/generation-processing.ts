import {
  emailDownloadToken,
  newGenerationAccess,
} from '@/server/generation-access';

import { evoQueryTask } from '@/core/ai/evolink';
import { getEmailProvider } from '@/core/auth';
import { storeWork } from '@/core/storage/works';
import { envConfigs } from '@/config';
import {
  AITaskStatus,
  attachTaskInfo,
  changeTaskInfo,
  findTask,
  finishTaskDelivery,
  pendingDeliveries,
  updateTask,
} from '@/modules/ai-tasks/service';
import { getAllConfigs } from '@/modules/config/service';
import { taskResultUrl } from '@/lib/ai-task-result';
import { deliveryOptions, jsonObject } from '@/lib/generation-delivery';

export async function processGeneration(taskId: string) {
  const leaseId = newGenerationAccess();
  const claimed = await changeTaskInfo(taskId, (info) => {
    if (
      Number(info.leaseUntil) > Date.now() ||
      Number(info.retryAt) > Date.now()
    )
      return null;
    return { ...info, leaseId, leaseUntil: Date.now() + 180_000 };
  });
  if (!claimed) return;
  try {
    let task = await findTask(taskId);
    if (!task || task.provider !== 'evolink') return;
    let info = jsonObject(task.taskInfo);
    const options = deliveryOptions(task.options);
    const configs = await getAllConfigs();
    if (task.status === AITaskStatus.FAILED) {
      await updateTask({ taskId, status: AITaskStatus.FAILED });
      await finishTaskDelivery(taskId);
      return;
    }
    if (task.status !== AITaskStatus.SUCCESS) {
      if (!info.evoTaskId) return;
      if (!configs.evolink_api_key)
        throw new Error('Generation provider is not configured');
      const result = await evoQueryTask(
        {
          apiKey: configs.evolink_api_key,
          baseUrl: configs.evolink_base_url || 'https://api.evolink.ai/v1',
        },
        info.evoTaskId
      );
      if (
        result.status === 'failed' ||
        (result.status === 'completed' && !result.urls[0])
      ) {
        await updateTask({ taskId, status: AITaskStatus.FAILED });
        await finishTaskDelivery(taskId);
        return;
      }
      if (result.status !== 'completed') {
        await attachTaskInfo(taskId, { progress: result.progress });
        await updateTask({ taskId, status: AITaskStatus.PROCESSING });
        return;
      }
      await updateTask({
        taskId,
        status: AITaskStatus.SUCCESS,
        taskResult: { url: result.urls[0], urls: result.urls },
      });
      task = (await findTask(taskId))!;
    }
    // Keep registered/email-delivered media in our private bucket before
    // advertising durable downloads. Temporary guest results stay upstream.
    if (options.delivery !== 'temporary' && !info.storageKey) {
      const url = taskResultUrl(task.taskResult);
      if (!url) throw new Error('Generation returned no media');
      const stored = await storeWork(task.id, url, task.mediaType);
      await attachTaskInfo(taskId, stored);
      info = { ...info, ...stored };
    }
    if (options.delivery === 'email' && !info.emailSentAt) {
      const email = getEmailProvider(configs);
      if (!email || !options.email)
        throw new Error('Email delivery is not configured');
      const url = new URL(`/api/works/${task.id}/download`, envConfigs.app_url);
      url.searchParams.set('mail', emailDownloadToken(task.id));
      const zh = options.locale === 'zh';
      const result = await email.provider.sendEmail({
        to: options.email,
        subject: zh
          ? '你的 Pavo AI 作品已完成'
          : 'Your Pavo AI creation is ready',
        text: zh
          ? `你的作品已生成。点击下方链接下载：\n${url.href}\n\n请保管好此链接，拥有链接的人可以下载作品。\n— Pavo AI`
          : `Your creation is ready. Download it here:\n${url.href}\n\nKeep this link private. Anyone with the link can download your creation.\n— Pavo AI`,
        idempotencyKey: `generation-${task.id}`,
      });
      if (!result.success) throw new Error('Result email could not be sent');
      await attachTaskInfo(taskId, { emailSentAt: new Date().toISOString() });
    }
    await finishTaskDelivery(taskId);
  } catch (error) {
    // Keep the row in the retry queue. Never mark a successful generation as
    // failed/refund it simply because storage or email is temporarily down.
    await changeTaskInfo(taskId, (info) => ({
      ...info,
      deliveryAttempts: Number(info.deliveryAttempts || 0) + 1,
      retryAt:
        Date.now() +
        Math.min(
          30 * 60_000,
          30_000 * 2 ** Math.min(Number(info.deliveryAttempts || 0), 6)
        ),
      deliveryError: 'Delivery is being retried',
    }));
    console.error('[generation-delivery] retry scheduled', taskId);
  } finally {
    await changeTaskInfo(taskId, (info) =>
      info.leaseId === leaseId ? { ...info, leaseUntil: 0, leaseId: '' } : null
    );
  }
}

export async function processPendingGenerations() {
  const tasks = await pendingDeliveries();
  for (const task of tasks) {
    try {
      await processGeneration(task.id);
    } catch {
      console.error('[generation-delivery] processing deferred', task.id);
    }
  }
  return { inspected: tasks.length };
}

export function generationStatus(
  task: NonNullable<Awaited<ReturnType<typeof findTask>>>,
  access = ''
) {
  const info = jsonObject(task.taskInfo);
  const options = deliveryOptions(task.options);
  const ready =
    task.status === AITaskStatus.SUCCESS &&
    (options.delivery === 'temporary' || !!info.storageKey);
  const downloadUrl = new URL(
    `/api/works/${task.id}/download`,
    envConfigs.app_url
  );
  if (options.delivery !== 'account')
    downloadUrl.searchParams.set('access', access);
  const relative = downloadUrl.pathname + downloadUrl.search;
  return {
    status:
      task.status === AITaskStatus.FAILED
        ? 'failed'
        : ready
          ? 'completed'
          : 'processing',
    progress: ready ? 100 : Math.min(95, Number(info.progress || 0)),
    url: ready ? `${relative}${downloadUrl.search ? '&' : '?'}inline=1` : '',
    downloadUrl: ready ? relative : '',
    delivery: options.delivery,
    emailSent: !!info.emailSentAt,
    error:
      task.status === AITaskStatus.FAILED
        ? 'Generation failed; credits have been returned.'
        : '',
  };
}
