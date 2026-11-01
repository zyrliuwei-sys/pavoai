import { Check, Loader2, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface PaywallPlan {
  id: string;
  name: string;
  price: string;
  interval?: string;
  description?: string;
  featured?: boolean;
  /** Up to three short feature lines shown under the plan name. */
  featureLabels: string[];
}

export interface PaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Guest-payment reassurance line under the plans. */
  note: string;
  plans: PaywallPlan[];
  onCheckout: (planId: string) => void;
  /** Plan id currently starting a checkout (shows a spinner on that row). */
  processingId?: string | null;
}

/**
 * The landing generator's paywall: opened when a visitor's generation is
 * blocked by credits (or auth) — no error surface, just pick a plan and pay.
 * Pure component; plans and copy arrive via props from the hero block.
 */
export function PaywallDialog({
  open,
  onOpenChange,
  title,
  description,
  note,
  plans,
  onCheckout,
  processingId,
}: PaywallDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0d1319] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkles
              size={16}
              className="text-[var(--sv-iris-bright)]"
              aria-hidden
            />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-2.5">
          {plans.map((plan) => {
            const processing = processingId === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                disabled={!!processingId}
                onClick={() => onCheckout(plan.id)}
                className={cn(
                  'group relative rounded-2xl p-4 text-left ring-1 transition-all',
                  'bg-white/[0.04] ring-white/10 hover:bg-white/[0.07] hover:ring-[var(--sv-iris)]/50',
                  plan.featured &&
                    'bg-[var(--sv-iris-strong)]/15 ring-[var(--sv-iris)]/50',
                  processing && 'cursor-wait opacity-80'
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
                      {plan.name}
                      {plan.featured && (
                        <span className="rounded-full bg-[var(--sv-iris-strong)] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white uppercase">
                          ★
                        </span>
                      )}
                    </p>
                    {plan.description && (
                      <p className="mt-0.5 truncate text-[12px] text-white/55">
                        {plan.description}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-[18px] font-semibold text-white">
                    {plan.price}
                    {plan.interval && (
                      <span className="ml-0.5 text-[11px] font-normal text-white/50">
                        /{plan.interval}
                      </span>
                    )}
                  </p>
                </div>
                <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                  {plan.featureLabels.slice(0, 3).map((label) => (
                    <li
                      key={label}
                      className="flex items-center gap-1 text-[11.5px] text-white/65"
                    >
                      <Check
                        size={11}
                        className="text-[var(--sv-iris-bright)]"
                        aria-hidden
                      />
                      {label}
                    </li>
                  ))}
                </ul>
                {processing && (
                  <Loader2
                    size={15}
                    className="absolute top-4 right-4 animate-spin text-white/70"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-center text-[11.5px] leading-relaxed text-white/45">
          {note}
        </p>
      </DialogContent>
    </Dialog>
  );
}
