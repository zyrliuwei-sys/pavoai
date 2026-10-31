import { RevealSection } from '@/components/landing/reveal';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export interface FaqItem {
  q: string;
  a: string;
}

export interface LandingFaqProps {
  label: string;
  title: string;
  items: FaqItem[];
}

function FaqColumn({ items, offset }: { items: FaqItem[]; offset: number }) {
  return (
    <Accordion>
      {items.map((item, i) => (
        <AccordionItem
          key={item.q}
          value={`f-${offset + i}`}
          className="border-b border-zinc-200"
        >
          <AccordionTrigger className="py-4 text-left text-[15px] font-semibold text-zinc-950 hover:no-underline">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-[13.5px] leading-relaxed text-zinc-500">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function LandingFaq({ label, title, items }: LandingFaqProps) {
  const midpoint = Math.ceil(items.length / 2);
  const left = items.slice(0, midpoint);
  const right = items.slice(midpoint);

  return (
    <RevealSection id="faq" className="bg-white py-20 sm:py-28 lg:py-32">
      <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-8">
        <div className="sv-rv text-center">
          <p className="text-[13px] text-zinc-500">{label}</p>
          <h2 className="mt-2 text-[clamp(2rem,1.1rem+2.6vw,4.2rem)] leading-none font-semibold tracking-[-0.04em] text-zinc-950">
            {title}
          </h2>
        </div>

        <div className="mt-10 grid gap-x-10 lg:grid-cols-2">
          <FaqColumn items={left} offset={0} />
          <FaqColumn items={right} offset={midpoint} />
        </div>
      </div>
    </RevealSection>
  );
}
