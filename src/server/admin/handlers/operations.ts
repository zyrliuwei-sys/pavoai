import * as operations from '@/modules/operations/service';
import { respData, respErr } from '@/lib/resp';

import type { AdminHandlerContext } from '../types';

export async function GET({ request }: AdminHandlerContext) {
  const url = new URL(request.url);
  try {
    return respData(
      {
        installed: true,
        ...(await operations.getOperationsReport({
          days: Number(url.searchParams.get('days') ?? 7),
          build: url.searchParams.get('build') || undefined,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    if (/no such table|does not exist/i.test(String(error)))
      return respData({ installed: false });
    throw error;
  }
}
export async function CONFIGURE({ request, actor }: AdminHandlerContext) {
  await operations.configure(await request.json(), actor.userId);
  return respData({ ok: true });
}
export async function CREATE({ request, actor }: AdminHandlerContext) {
  return respData(
    await operations.createExperiment(await request.json(), actor.userId)
  );
}
export async function START(ctx: AdminHandlerContext) {
  return transition(ctx, 'start');
}
export async function PAUSE(ctx: AdminHandlerContext) {
  return transition(ctx, 'pause');
}
export async function APPLY(ctx: AdminHandlerContext) {
  return transition(ctx, 'apply');
}
async function transition(
  { request, actor }: AdminHandlerContext,
  action: 'start' | 'pause' | 'apply'
) {
  try {
    return respData(
      await operations.transitionExperiment(
        (await request.json()).id,
        action,
        actor.userId
      )
    );
  } catch (e) {
    return respErr(e instanceof Error ? e.message : 'Experiment failed', {
      status: 409,
    });
  }
}
export async function EXCLUDE({ request, actor }: AdminHandlerContext) {
  const body = await request.json();
  await operations.excludeVisitor(body.id, body.excluded, actor.userId);
  return respData({ ok: true });
}
export async function INSPECT({ actor }: AdminHandlerContext) {
  return respData(await operations.inspectOperations(actor.userId));
}
