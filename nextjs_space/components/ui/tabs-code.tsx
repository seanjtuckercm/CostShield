"use client";

import { useState } from 'react';
import { CodeBlock } from './code-block';
import { cn } from '@/lib/utils';

interface CodeTab {
  label: string;
  language: string;
  code: string;
}

interface TabsCodeProps {
  tabs: CodeTab[];
  className?: string;
}

export function TabsCode({ tabs, className }: TabsCodeProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className={cn("terminal-window", className)}>
      {/* Tab headers */}
      <div className="flex items-center border-b border-dev-border bg-dev-bg">
        {tabs?.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={cn(
              "px-4 py-2 text-sm font-mono transition-colors border-b-2 -mb-px",
              activeTab === index
                ? "text-dev-accent border-dev-accent bg-dev-surface"
                : "text-dev-muted border-transparent hover:text-dev-text hover:bg-dev-surface/50"
            )}
          >
            {tab?.label ?? 'Tab'}
          </button>
        )) ?? null}
      </div>

      {/* Tab content */}
      <div className="p-0">
        {tabs?.[activeTab] && (
          <div className="[&_.terminal-window]:border-0 [&_.terminal-header]:hidden">
            <CodeBlock
              code={tabs[activeTab]?.code ?? ''}
              language={tabs[activeTab]?.language ?? 'text'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
