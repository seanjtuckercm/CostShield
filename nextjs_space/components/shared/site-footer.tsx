import Link from 'next/link';
import { Terminal } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="bg-dev-bg border-t border-dev-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-dev-accent/10 border border-dev-accent/30 rounded-sm flex items-center justify-center">
              <Terminal className="w-4 h-4 text-dev-accent" />
            </div>
            <span className="text-lg font-semibold text-dev-text font-mono">CostShield</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link href="/docs" className="text-dev-muted hover:text-dev-text transition-colors">
              Docs
            </Link>
            <Link href="/pricing" className="text-dev-muted hover:text-dev-text transition-colors">
              Pricing
            </Link>
            <Link href="/legal/privacy" className="text-dev-muted hover:text-dev-text transition-colors">
              Privacy
            </Link>
            <Link href="/legal/terms" className="text-dev-muted hover:text-dev-text transition-colors">
              Terms
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-sm text-dev-muted font-mono">
            © 2026 CostShield
          </div>
        </div>
      </div>
    </footer>
  );
}
