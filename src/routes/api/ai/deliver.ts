import { createFileRoute } from '@tanstack/react-router';

import { getAuth, getEmailProvider } from '@/core/auth';
import { envConfigs } from '@/config';
import {
  AITaskStatus,
  attachTaskInfo,
  findTask,
} from '@/modules/ai-tasks/service';
import { getAllConfigs } from '@/modules/config/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';

/**
 * Mail a finished generation to the address the visitor left in the paywall.
 * Called by the landing generator when its poll sees the task completed.
 * The email is optional everywhere: no address → nothing to do (200 with
 * sent:false so the client can stop asking).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TASK_ID_MAX = 64;
const DELIVER_INTERVAL_MS = 10_000;

function parseTaskInfo(raw: unknown): Record<string, any> {
  if (typeof raw !== 'string' || !raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function POST({ request }: { request: Request }) {
  try {
    const ipLimited = enforceMinIntervalRateLimit(request, {
      keyPrefix: 'ai-deliver-ip',
      intervalMs: DELIVER_INTERVAL_MS,
    });
    if (ipLimited) return ipLimited;

    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respJson(401, 'Please sign in first');

    const userLimited = enforceMinIntervalRateLimit(request, {
      keyPrefix: 'ai-deliver-user',
      intervalMs: DELIVER_INTERVAL_MS,
      extraKey: session.user.id,
    });
    if (userLimited) return userLimited;

    const body = await request.json().catch(() => ({}));
    const taskId = typeof body.taskId === 'string' ? body.taskId : '';
    if (!taskId || taskId.length > TASK_ID_MAX || !/^[\w-]+$/.test(taskId))
      return respErr('Invalid taskId');

    const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
    const bodyEmail =
      emailRaw.length <= 200 && EMAIL_RE.test(emailRaw) ? emailRaw : '';

    const task = await findTask(taskId);
    if (!task || task.userId !== session.user.id)
      return respErr('Task not found');
    if (task.status !== AITaskStatus.SUCCESS)
      return respErr('Task has not completed successfully');

    const info = parseTaskInfo(task.taskInfo);
    const url: string =
      (task.taskResult as any)?.url ||
      (task.taskResult as any)?.urls?.[0] ||
      '';
    if (!url) return respErr('Task result has no media URL');

    const email =
      bodyEmail || (typeof info.guestEmail === 'string' ? info.guestEmail : '');
    if (!email) return respData({ sent: false, reason: 'no email' });
    if (info.emailSentAt)
      return respData({ sent: false, reason: 'already sent' });

    const configs = await getAllConfigs();
    const emailCtx = getEmailProvider(configs);
    if (!emailCtx) return respErr('Email delivery is not configured');

    const locale = getLocale();
    const appName = configs.app_name || envConfigs.app_name;
    const subject = m['lp.gen.mail_subject']({ app: appName }, { locale });
    const text = m['lp.gen.mail_body'](
      { prompt: task.prompt, url },
      { locale }
    );

    const result = await emailCtx.provider.sendEmail({
      to: email,
      subject,
      text,
    });
    if (!result.success) {
      console.error('[ai-deliver] send failed:', result.error);
      return respErr('Failed to send the email');
    }

    await attachTaskInfo(taskId, { emailSentAt: new Date().toISOString() });
    return respData({ sent: true });
  } catch (error: any) {
    return respErr(error?.message || 'Failed to deliver');
  }
}

export const Route = createFileRoute('/api/ai/deliver')({
  server: { handlers: { POST } },
});
