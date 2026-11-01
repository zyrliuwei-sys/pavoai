import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Drop-in `<section>` that becomes a reveal group when it scrolls into view.
 * Children opt in with `.sv-rv` / `.sv-rv-cards` (see globals.css).
 */
export function RevealSection({
  className,
  id,
  children,
}: {
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  const ref = useRevealGroup<HTMLElement>();
  return (
    <section ref={ref} id={id} className={cn('sv-rv-group', className)}>
      {children}
    </section>
  );
}

/**
 * Adds `.is-in` to the returned ref's element when it enters the viewport
 * (once). Pair with `.sv-rv-group` on the element and `.sv-rv` children —
 * CSS owns the stagger and respects prefers-reduced-motion.
 */
export function useRevealGroup<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('is-in');
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -7% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return ref;
}

/** True once the element has entered the viewport (one-shot). */
export function useInView<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, inView] as const;
}

/**
 * Counts 0 → target with an expo-out curve. Returns target immediately when
 * reduced motion is requested or `start` is false.
 */
export function useCountUp(target: number, start: boolean, duration = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(2, -10 * p); // expo out
      setValue(Math.round(target * (p === 1 ? 1 : eased)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration]);

  return start ? value : 0;
}

/**
 * Typewriter that cycles through phrases: types, holds, deletes, next.
 * Collapses to phrases[0] under prefers-reduced-motion. Set `active: false`
 * to freeze the cycle once the visitor has typed — stops the 55ms re-renders.
 */
export function useTypewriter(
  phrases: string[],
  {
    active = true,
    typeMs = 55,
    holdMs = 2100,
    eraseMs = 24,
  }: {
    active?: boolean;
    typeMs?: number;
    holdMs?: number;
    eraseMs?: number;
  } = {}
) {
  const [text, setText] = useState('');
  // Props arrays get a new identity every render; key the effect on content.
  const phrasesRef = useRef(phrases);
  phrasesRef.current = phrases;
  const key = phrases.join('\u0000');

  useEffect(() => {
    if (!active) return;
    const list = key.split('\u0000').filter(Boolean);
    if (list.length === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setText(list[0]);
      return;
    }
    let phrase = 0;
    let char = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      const current = list[phrase];
      if (!deleting) {
        char += 1;
        setText(current.slice(0, char));
        if (char === current.length) {
          deleting = true;
          timer = setTimeout(step, holdMs);
          return;
        }
        timer = setTimeout(step, typeMs);
      } else {
        char -= 1;
        setText(current.slice(0, char));
        if (char === 0) {
          deleting = false;
          phrase = (phrase + 1) % list.length;
        }
        timer = setTimeout(step, eraseMs);
      }
    };
    timer = setTimeout(step, 500);
    return () => clearTimeout(timer);
  }, [key, active, typeMs, holdMs, eraseMs]);

  return text;
}
