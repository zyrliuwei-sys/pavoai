import { useState, type CSSProperties } from 'react';
import { Check, type LucideIcon } from 'lucide-react';

import { RevealSection } from '@/components/landing/reveal';

export interface ToolCardData {
  icon: LucideIcon;
  category: string;
  title: string;
  description: string;
  features: string[];
  openLabel: string;
  guideLabel: string;
  href: string;
}

export interface LandingToolsProps {
  label: string;
  title: string;
  subtitle: string;
  tabs: { id: string; label: string; tools: ToolCardData[] }[];
}

export function LandingTools({
  label,
  title,
  subtitle,
  tabs,
}: LandingToolsProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <RevealSection id="tools" className="bg-zinc-100 py-20 sm:py-28 lg:py-32">
      <div className="mx-auto w-full max-w-[1240px] px-6 sm:px-8">
        <div className="sv-rv text-center">
          <p className="text-[13px] text-zinc-500">{label}</p>
          <h2 className="mt-2 text-[clamp(2rem,1.1rem+2.6vw,4.2rem)] leading-none font-semibold tracking-[-0.04em] text-zinc-950">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-relaxed text-zinc-500">
            {subtitle}
          </p>
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab?.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveId(tab.id)}
                  className={`h-9 rounded-full px-4 text-sm font-medium transition ${
                    isActive
                      ? 'bg-zinc-950 text-white hover:text-white'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sv-rv sv-rv-cards mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {activeTab?.tools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.title}
                className="sv-hover-lift sv-enter flex h-full flex-col rounded-[16px] border border-zinc-200 bg-white p-5"
                style={{ '--i': index } as CSSProperties}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f4f2] text-[var(--sv-iris-strong)]">
                  <Icon size={18} />
                </div>
                <p className="mt-4 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                  {tool.category}
                </p>
                <h3 className="mt-1 text-[15px] font-semibold text-zinc-950">
                  {tool.title}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                  {tool.description}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {tool.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check size={13} className="shrink-0 text-emerald-500" />
                      <span className="text-[12.5px] text-zinc-600">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center gap-3 border-t border-zinc-100 pt-4">
                  <a
                    href={tool.href}
                    className="text-[12.5px] font-semibold text-[var(--sv-iris-strong)] hover:underline"
                  >
                    {tool.openLabel}
                  </a>
                  <a
                    href={tool.href}
                    className="text-[12.5px] text-zinc-400 hover:text-zinc-600"
                  >
                    {tool.guideLabel}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}
