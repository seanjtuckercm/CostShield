"use client";

import { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({ 
  code, 
  language = 'bash', 
  title,
  showLineNumbers = false,
  className 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code?.split('\n') ?? [];

  return (
    <div className={cn("terminal-window", className)}>
      {/* Terminal header */}
      <div className="terminal-header">
        <div className="flex items-center gap-1.5">
          <div className="terminal-dot bg-red-500" />
          <div className="terminal-dot bg-yellow-500" />
          <div className="terminal-dot bg-green-500" />
        </div>
        {title && (
          <span className="text-xs text-dev-muted ml-2 font-mono">{title}</span>
        )}
        {language && !title && (
          <span className="text-xs text-dev-muted ml-2 font-mono flex items-center gap-1">
            <Terminal className="w-3 h-3" />
            {language}
          </span>
        )}
        <button
          onClick={handleCopy}
          className="ml-auto flex items-center gap-1.5 text-xs text-dev-muted hover:text-dev-accent transition-colors px-2 py-1 rounded hover:bg-dev-border/50"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-dev-accent" />
              <span className="text-dev-accent">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="terminal-content overflow-x-auto">
        <pre className="text-sm leading-relaxed">
          {showLineNumbers ? (
            lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="text-dev-muted/50 select-none w-8 text-right pr-4 flex-shrink-0">
                  {i + 1}
                </span>
                <code className="text-dev-text">{line || ' '}</code>
              </div>
            ))
          ) : (
            <code className="text-dev-text whitespace-pre">{code}</code>
          )}
        </pre>
      </div>
    </div>
  );
}

// Inline code component
export function InlineCode({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code className={cn(
      "font-mono text-sm bg-dev-surface border border-dev-border px-1.5 py-0.5 rounded text-dev-accent",
      className
    )}>
      {children}
    </code>
  );
}

// Command line component with prompt
export function CommandLine({ command, className }: { command: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "flex items-center gap-2 bg-dev-bg border border-dev-border rounded-sm px-4 py-3 font-mono text-sm group",
      className
    )}>
      <span className="text-dev-accent select-none">$</span>
      <span className="text-dev-text flex-1">{command}</span>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-dev-muted hover:text-dev-accent"
      >
        {copied ? (
          <Check className="w-4 h-4 text-dev-accent" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
