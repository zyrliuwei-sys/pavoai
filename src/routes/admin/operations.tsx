import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  FlaskConical,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { matchPermission } from '@/core/auth/rbac';
import { Link } from '@/core/i18n/navigation';
import { apiGet, apiPost } from '@/lib/api-client';
import {
  formatOpsMoney,
  pricingGroupSchema,
  type OperationsReport,
} from '@/lib/operations';
import { m } from '@/paraglide/messages.js';
import { useConfirm } from '@/hooks/use-confirm';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { TextField } from '@/components/form-field';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const formSchema = z
  .object({
    name: z.string().trim().min(2),
    hypothesis: z.string().trim().min(5),
    controlGroup: pricingGroupSchema,
    variantGroup: pricingGroupSchema,
    minVisitors: z
      .string()
      .refine(
        (v) =>
          Number.isInteger(Number(v)) && Number(v) >= 50 && Number(v) <= 10000
      ),
  })
  .refine((v) => v.controlGroup !== v.variantGroup);
const selectClass =
  'border-input bg-background h-9 rounded-md border px-3 text-sm';
const pct = (n: number | null) =>
  n === null ? '—' : `${(n * 100).toFixed(1)}%`;
const num = (n: number) => Number(n).toLocaleString();

function OperationsPage() {
  const [days, setDays] = useState(7),
    [build, setBuild] = useState(''),
    [tab, setTab] = useState<'source' | 'country' | 'landingPath' | 'buildId'>(
      'source'
    ),
    [creating, setCreating] = useState(false);
  const client = useQueryClient();
  const permissions = useUserPermissions();
  const can = (code: string) =>
    matchPermission(
      `admin.operations.${code}`,
      permissions.data?.permissions ?? []
    );
  const { confirm, dialog } = useConfirm();
  const query = useQuery({
    queryKey: ['admin-operations', days, build],
    enabled: can('read'),
    retry: false,
    queryFn: () =>
      apiGet<OperationsReport>(
        `/api/admin/operations/?${new URLSearchParams({ days: String(days), ...(build ? { build } : {}) })}`
      ),
  });
  const report = query.data;
  const mutation = useMutation({
    mutationFn: ({ action, body }: { action: string; body: unknown }) =>
      apiPost(`/api/admin/operations/${action}`, body),
    onSuccess: () => {
      toast.success(m['admin.operations.saved']());
      void client.invalidateQueries({ queryKey: ['admin-operations'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const form = useForm({
    defaultValues: {
      name: '',
      hypothesis: '',
      controlGroup: 'monthly' as 'monthly' | 'yearly' | 'lifetime',
      variantGroup: 'lifetime' as 'monthly' | 'yearly' | 'lifetime',
      minVisitors: '400',
    },
    validators: { onSubmit: formSchema },
    onSubmitInvalid: () => toast.error(m['admin.operations.invalid']()),
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        action: 'create',
        body: { ...value, minVisitors: Number(value.minVisitors) },
      });
      form.reset();
      setCreating(false);
    },
  });
  function groupName(group: string) {
    return group === 'monthly'
      ? m['landing.pricing.monthly']()
      : group === 'yearly'
        ? m['landing.pricing.yearly']()
        : m['landing.pricing.lifetime']();
  }
  function stepName(kind: string) {
    switch (kind) {
      case 'visit':
        return m['admin.operations.visit']();
      case 'generate_clicked':
        return m['admin.operations.generate']();
      case 'signup':
        return m['admin.analytics.signups']();
      case 'pricing_viewed':
        return m['admin.operations.price_view']();
      case 'plan_selected':
        return m['admin.operations.plan_selected']();
      case 'checkout':
        return m['admin.analytics.checkouts']();
      default:
        return m['admin.analytics.paid']();
    }
  }
  function actionName(action: string) {
    switch (action) {
      case 'created':
        return m['admin.operations.created']();
      case 'start':
        return m['admin.operations.started']();
      case 'pause':
        return m['admin.operations.paused']();
      case 'apply':
        return m['admin.operations.applied']();
      case 'configured':
        return m['admin.operations.configured']();
      case 'traffic_excluded':
        return m['admin.operations.exclusion_changed']();
      default:
        return m['admin.operations.inspection']();
    }
  }
  function statusName(status: string) {
    return status === 'running'
      ? m['admin.operations.running']()
      : status === 'paused'
        ? m['admin.operations.paused']()
        : status === 'finished'
          ? m['admin.operations.finished']()
          : m['admin.operations.draft']();
  }
  async function apply(id: string) {
    if (
      await confirm({
        title: m['admin.operations.apply_title'](),
        description: m['admin.operations.apply_description'](),
      })
    )
      await mutation.mutateAsync({ action: 'apply', body: { id } });
  }
  async function copyReport() {
    if (!report) return;
    try {
      const { visitors, ...aggregate } = report;
      await navigator.clipboard.writeText(JSON.stringify(aggregate, null, 2));
      toast.success(m['admin.operations.copied']());
    } catch {
      toast.error(m['admin.agent.copy_failed']());
    }
  }
  const current = report?.current ?? [],
    previous = report?.previous ?? [];
  const currencies = [
    ...new Set([...current, ...previous].map((r) => r.currency)),
  ];
  if (!permissions.isPending && !can('read'))
    return <p className="p-6">{m['admin.operations.denied']()}</p>;
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b pb-6">
        <div>
          <p className="text-primary mb-2 flex items-center gap-2 text-xs font-semibold tracking-[.16em] uppercase">
            <Activity className="size-4" />
            {m['admin.operations.eyebrow']()}
          </p>
          <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
            {m['admin.operations.title']()}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
            {m['admin.operations.description']()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/ops-playbook"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <BookOpen />
            {m['admin.nav.ops_playbook']()}
          </Link>
          <Button
            variant="outline"
            size="sm"
            disabled={!report?.installed}
            onClick={copyReport}
          >
            <Copy />
            {m['admin.operations.copy_report']()}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={query.isFetching ? 'animate-spin' : ''} />
            {m['admin.analytics.refresh']()}
          </Button>
        </div>
      </header>
      {query.isError ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <p role="alert">{m['admin.operations.load_error']()}</p>
            <Button onClick={() => query.refetch()}>
              {m['common.error.retry']()}
            </Button>
          </CardContent>
        </Card>
      ) : !report ? (
        <p aria-live="polite">{m['admin.loading']()}</p>
      ) : !report.installed ? (
        <Card>
          <CardContent className="pt-4">
            {m['admin.operations.migration_required']()}
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="bg-muted/40 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <span
                className={`size-2 rounded-full ${report.control.enabled ? 'bg-primary' : 'bg-muted-foreground'}`}
              />
              <div className="text-sm font-medium">
                {report.control.enabled
                  ? m['admin.operations.tracking_on']()
                  : m['admin.operations.tracking_off']()}
                <p className="text-muted-foreground mt-1 text-xs">
                  {m['admin.operations.timezone']()} ·{' '}
                  {new Date(report.generatedAt).toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    hour12: false,
                  })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label={m['admin.operations.default_layout']()}
                className={selectClass}
                value={report.control.defaultGroup}
                disabled={!can('configure') || mutation.isPending}
                onChange={(e) =>
                  mutation.mutate({
                    action: 'configure',
                    body: {
                      enabled: report.control.enabled,
                      hourly: report.control.hourly,
                      defaultGroup: e.target.value,
                    },
                  })
                }
              >
                {['monthly', 'yearly', 'lifetime'].map((g) => (
                  <option key={g} value={g}>
                    {m['admin.operations.default_layout']()} · {groupName(g)}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                disabled={!can('configure') || mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    action: 'configure',
                    body: {
                      enabled: !report.control.enabled,
                      hourly: report.control.hourly,
                    },
                  })
                }
              >
                <Settings2 />
                {report.control.enabled
                  ? m['admin.operations.disable']()
                  : m['admin.operations.enable']()}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  !report.control.enabled ||
                  !can('configure') ||
                  mutation.isPending
                }
                onClick={() =>
                  mutation.mutate({
                    action: 'configure',
                    body: {
                      enabled: report.control.enabled,
                      hourly: !report.control.hourly,
                    },
                  })
                }
              >
                {report.control.hourly ? <Check /> : <Activity />}
                {report.control.hourly
                  ? m['admin.operations.hourly_on']()
                  : m['admin.operations.hourly_off']()}
              </Button>
              <Button
                size="sm"
                disabled={
                  !report.control.enabled ||
                  !can('inspect') ||
                  mutation.isPending
                }
                onClick={() => mutation.mutate({ action: 'inspect', body: {} })}
              >
                {m['admin.operations.inspect_now']()}
              </Button>
            </div>
          </section>
          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
            <Card className="border-primary/30 border">
              <CardHeader>
                <p className="text-primary text-xs tracking-widest">
                  01 / {m['admin.operations.same_clock']()}
                </p>
                <CardTitle className="font-serif text-2xl">
                  {m['admin.operations.revenue_today']()}
                </CardTitle>
                <p className="text-muted-foreground text-xs">
                  {m['admin.operations.revenue_basis']()}
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                {(currencies.length ? currencies : ['usd']).map((currency) => {
                  const today = Number(
                      current.find((r) => r.currency === currency)?.amount ?? 0
                    ),
                    yesterday = Number(
                      previous.find((r) => r.currency === currency)?.amount ?? 0
                    ),
                    max = Math.max(today, yesterday, 1);
                  return (
                    <div key={currency} className="space-y-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <strong className="font-serif text-4xl tabular-nums md:text-5xl">
                          {formatOpsMoney(today, currency)}
                        </strong>
                        <span className="text-muted-foreground text-sm">
                          {m['admin.operations.yesterday']()}{' '}
                          {formatOpsMoney(yesterday, currency)}
                        </span>
                      </div>
                      <div className="space-y-1.5" aria-label={currency}>
                        <div
                          className="bg-primary h-2 min-w-px rounded-full"
                          style={{
                            width: `${(Math.max(today, 0) / max) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-muted-foreground/30 h-2 min-w-px rounded-full"
                          style={{
                            width: `${(Math.max(yesterday, 0) / max) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {currency.toUpperCase()} ·{' '}
                        {m['admin.operations.paid_orders']({
                          count: Number(
                            current.find((r) => r.currency === currency)
                              ?.orders ?? 0
                          ),
                        })}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  label: m['admin.operations.pending_users'](),
                  value: num(report.pendingUsers),
                  hint: m['admin.operations.last24h'](),
                },
                {
                  label: m['admin.operations.success_rate'](),
                  value: pct(report.health.rate),
                  hint: m['admin.operations.health_counts']({
                    success: report.health.completed,
                    failed: report.health.failed,
                  }),
                },
                {
                  label: m['admin.stats.open_tickets'](),
                  value: num(report.openTickets),
                  hint: m['admin.stats.open_tickets_hint'](),
                },
                {
                  label: m['admin.operations.generating'](),
                  value: num(report.health.pending),
                  hint: m['admin.operations.last24h'](),
                },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="flex h-full flex-col justify-between gap-3 pt-2">
                    <p className="text-muted-foreground text-xs">
                      {item.label}
                    </p>
                    <strong className="font-serif text-3xl tabular-nums">
                      {item.value}
                    </strong>
                    <p className="text-muted-foreground text-xs">{item.hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-primary text-xs tracking-widest">
                  02 / {m['admin.operations.acquisition']()}
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {m['admin.operations.funnel']()}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label={m['admin.operations.range']()}
                  className={selectClass}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                >
                  {[1, 7, 30].map((d) => (
                    <option key={d} value={d}>
                      {m['admin.operations.days']({ count: d })}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={m['admin.operations.build']()}
                  className={selectClass + ' max-w-56'}
                  value={build}
                  onChange={(e) => setBuild(e.target.value)}
                >
                  <option value="">{m['admin.operations.all_builds']()}</option>
                  {report.builds.map((id) => (
                    <option key={id} value={id}>
                      {report.visitors.find((v) => v.buildId === id)
                        ?.buildLabel || id}{' '}
                      · {id.slice(0, 12)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-4 lg:grid-cols-7">
              {report.funnel.map((step, i) => (
                <div className="bg-card p-4" key={step.kind}>
                  <p className="text-muted-foreground text-xs">
                    {String(i + 1).padStart(2, '0')} / {stepName(step.kind)}
                  </p>
                  <p className="mt-3 text-2xl font-semibold tabular-nums">
                    {num(step.count)}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {pct(
                      report.funnel[0].count
                        ? step.count / report.funnel[0].count
                        : null
                    )}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-xs leading-5">
              {m['admin.operations.funnel_basis']()}
            </p>
            <div className="flex flex-wrap gap-2">
              {(['source', 'country', 'landingPath', 'buildId'] as const).map(
                (key) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={tab === key ? 'default' : 'outline'}
                    onClick={() => setTab(key)}
                  >
                    {key === 'source'
                      ? m['admin.operations.source']()
                      : key === 'country'
                        ? m['admin.analytics.dim_country']()
                        : key === 'landingPath'
                          ? m['admin.operations.landing_page']()
                          : m['admin.operations.build']()}
                  </Button>
                )
              )}
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m['admin.operations.dimension']()}</TableHead>
                    {[
                      m['admin.operations.visit'](),
                      m['admin.analytics.signups'](),
                      m['admin.analytics.checkouts'](),
                      m['admin.operations.buyers'](),
                      m['admin.operations.signup_rate'](),
                      m['admin.operations.visitor_paid_rate'](),
                      m['admin.operations.usd_revenue'](),
                    ].map((label) => (
                      <TableHead key={label} className="text-right">
                        {label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.breakdowns[tab].length ? (
                    report.breakdowns[tab].map((row) => (
                      <TableRow key={row.value}>
                        <TableCell
                          className="max-w-52 truncate font-medium"
                          title={row.value}
                        >
                          {row.value}
                        </TableCell>
                        <TableCell className="text-right">
                          {num(row.visitors)}
                        </TableCell>
                        <TableCell className="text-right">
                          {num(row.signups)}
                        </TableCell>
                        <TableCell className="text-right">
                          {num(row.checkouts)}
                        </TableCell>
                        <TableCell className="text-right">
                          {num(row.buyers)}
                        </TableCell>
                        <TableCell className="text-right">
                          {pct(
                            row.visitors ? row.signups / row.visitors : null
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {pct(row.visitors ? row.buyers / row.visitors : null)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatOpsMoney(row.usdRevenue, 'usd')}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-muted-foreground py-10 text-center"
                      >
                        {m['admin.operations.empty']()}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-primary text-xs tracking-widest">
                  03 / {m['admin.operations.experiment']()}
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {m['admin.operations.experiments_title']()}
                </h2>
              </div>
              <Button
                size="sm"
                disabled={!can('experiment-create')}
                onClick={() => setCreating(!creating)}
              >
                <Plus />
                {m['admin.operations.create_experiment']()}
              </Button>
            </div>
            <p className="text-muted-foreground text-sm leading-6">
              {m['admin.operations.experiment_basis']()}
            </p>
            {creating && (
              <Card>
                <CardContent className="pt-4">
                  <form
                    className="grid gap-4 md:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void form.handleSubmit();
                    }}
                  >
                    <form.Field name="name">
                      {(field) => (
                        <TextField
                          field={field}
                          label={m['admin.operations.experiment_name']()}
                          required
                        />
                      )}
                    </form.Field>
                    <form.Field name="hypothesis">
                      {(field) => (
                        <TextField
                          field={field}
                          label={m['admin.operations.hypothesis']()}
                          required
                        />
                      )}
                    </form.Field>
                    {(['controlGroup', 'variantGroup'] as const).map(
                      (name, index) => (
                        <form.Field key={name} name={name}>
                          {(field) => (
                            <label className="grid gap-2 text-sm">
                              {index === 0
                                ? m['admin.operations.control_group']()
                                : m['admin.operations.variant_group']()}
                              <select
                                className={selectClass}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(
                                    e.target.value as
                                      'monthly' | 'yearly' | 'lifetime'
                                  )
                                }
                              >
                                {['monthly', 'yearly', 'lifetime'].map((g) => (
                                  <option key={g} value={g}>
                                    {groupName(g)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </form.Field>
                      )
                    )}
                    <form.Field name="minVisitors">
                      {(field) => (
                        <TextField
                          field={field}
                          type="number"
                          label={m['admin.operations.minimum']()}
                          required
                        />
                      )}
                    </form.Field>
                    <div className="flex items-end gap-2">
                      <Button type="submit" disabled={mutation.isPending}>
                        {m['admin.operations.save_experiment']()}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setCreating(false)}
                      >
                        {m['common.confirm.cancel']()}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
            {report.experiments.length ? (
              report.experiments.map((exp) => (
                <Card key={exp.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FlaskConical className="text-primary size-4" />
                          {exp.name}
                        </CardTitle>
                        <p className="text-muted-foreground mt-2 text-sm">
                          {exp.hypothesis}
                        </p>
                      </div>
                      <span className="bg-muted rounded-full px-3 py-1 text-xs">
                        {statusName(exp.status)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {exp.rows.map((row) => (
                        <div
                          key={row.variant}
                          className="rounded-xl border p-4"
                        >
                          <div className="flex justify-between gap-3 text-sm font-medium">
                            <span>
                              {row.variant} · {groupName(row.group)}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              50%
                            </span>
                          </div>
                          <p className="mt-3 text-2xl font-semibold tabular-nums">
                            {formatOpsMoney(row.revenuePerVisitor, 'usd')}
                            <span className="text-muted-foreground ml-2 text-xs font-normal">
                              {m['admin.operations.per_exposed']()}
                            </span>
                          </p>
                          <div className="text-muted-foreground mt-3 flex flex-wrap justify-between gap-2 text-xs">
                            <span>
                              {m['admin.operations.exposure_progress']({
                                count: row.visitors,
                                min: exp.minVisitors,
                              })}
                            </span>
                            <span>
                              {m['admin.operations.buyer_count']({
                                count: row.buyers,
                              })}{' '}
                              · {pct(row.conversionRate)}
                            </span>
                          </div>
                          <progress
                            className="accent-primary mt-2 h-1.5 w-full"
                            max={exp.minVisitors}
                            value={row.visitors}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-muted-foreground text-xs">
                        {exp.leader
                          ? m['admin.operations.leader']({
                              variant: exp.leader.variant,
                            })
                          : m['admin.operations.observing']()}
                      </p>
                      <div className="flex gap-2">
                        {exp.status === 'draft' || exp.status === 'paused' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              !can('experiment-start') ||
                              mutation.isPending ||
                              !report.control.enabled
                            }
                            onClick={() =>
                              mutation.mutate({
                                action: 'start',
                                body: { id: exp.id },
                              })
                            }
                          >
                            <Play />
                            {m['admin.operations.start']()}
                          </Button>
                        ) : null}
                        {exp.status === 'running' ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                !can('experiment-pause') || mutation.isPending
                              }
                              onClick={() =>
                                mutation.mutate({
                                  action: 'pause',
                                  body: { id: exp.id },
                                })
                              }
                            >
                              <Pause />
                              {m['admin.operations.pause']()}
                            </Button>
                            <Button
                              size="sm"
                              disabled={
                                !exp.leader ||
                                !can('experiment-apply') ||
                                mutation.isPending
                              }
                              onClick={() => apply(exp.id)}
                            >
                              <ArrowUpRight />
                              {m['admin.operations.apply']()}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
                {m['admin.operations.no_experiments']()}
              </div>
            )}
          </section>
          <Card>
            <CardHeader>
              <CardTitle>{m['admin.operations.price_snapshots']()}</CardTitle>
              <p className="text-muted-foreground text-xs">
                {m['admin.operations.snapshot_hint']()}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.snapshots.map((snapshot) => (
                <details key={snapshot.id} className="rounded-lg border p-3">
                  <summary className="cursor-pointer font-mono text-xs">
                    {snapshot.id.slice(0, 16)} ·{' '}
                    {new Date(snapshot.createdAt).toLocaleString('zh-CN', {
                      timeZone: 'Asia/Shanghai',
                    })}
                  </summary>
                  <pre className="bg-muted mt-3 max-h-72 overflow-auto p-3 text-xs">
                    {JSON.stringify(JSON.parse(snapshot.data), null, 2)}
                  </pre>
                </details>
              ))}
            </CardContent>
          </Card>
          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{m['admin.operations.log_title']()}</CardTitle>
                <p className="text-muted-foreground text-xs">
                  {m['admin.operations.log_hint']()}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.logs.length ? (
                  report.logs.map((log) => (
                    <details
                      key={log.id}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <summary className="cursor-pointer">
                        {actionName(log.action)}
                        <span className="text-muted-foreground ml-3 text-xs">
                          {new Date(log.createdAt).toLocaleString('zh-CN', {
                            timeZone: 'Asia/Shanghai',
                            hour12: false,
                          })}
                        </span>
                      </summary>
                      <pre className="bg-muted mt-3 max-h-64 overflow-auto rounded-md p-3 text-xs">
                        {JSON.stringify(JSON.parse(log.detail), null, 2)}
                      </pre>
                    </details>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {m['admin.operations.no_logs']()}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4" />
                  {m['admin.operations.traffic_title']()}
                </CardTitle>
                <p className="text-muted-foreground text-xs">
                  {m['admin.operations.traffic_hint']()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 space-y-3 overflow-auto">
                  {report.visitors.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0 text-xs">
                        <p className="truncate font-medium">
                          {v.source} · {v.country || '—'} · {v.id.slice(0, 8)}
                        </p>
                        <p
                          className="text-muted-foreground mt-1 truncate"
                          title={v.buildLabel}
                        >
                          {v.buildLabel || v.buildId} ·{' '}
                          {v.priceSnapshotId.slice(0, 8)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!can('exclude') || mutation.isPending}
                        onClick={() =>
                          mutation.mutate({
                            action: 'exclude',
                            body: { id: v.id, excluded: !v.excluded },
                          })
                        }
                      >
                        {v.excluded
                          ? m['admin.operations.restore']()
                          : m['admin.operations.exclude']()}
                      </Button>
                    </div>
                  ))}
                  {!report.visitors.length && (
                    <p className="text-muted-foreground text-sm">
                      {m['admin.operations.empty']()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
          <p className="text-muted-foreground border-t pt-5 text-xs leading-6">
            {m['admin.operations.scope_note']()}{' '}
            <Link
              href="/admin/agent"
              className="text-primary underline underline-offset-4"
            >
              {m['admin.operations.agent_link']()}
            </Link>
          </p>
        </>
      )}
      {dialog}
    </div>
  );
}
export const Route = createFileRoute('/admin/operations')({
  component: OperationsPage,
  head: () => ({ meta: [{ title: m['admin.operations.title']() }] }),
});
