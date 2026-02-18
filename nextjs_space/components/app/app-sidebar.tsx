"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Key,
  BarChart3,
  CreditCard,
  Menu,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-dev-border">
        <div className="w-8 h-8 bg-dev-accent/10 border border-dev-accent/30 rounded-sm flex items-center justify-center">
          <Terminal className="w-4 h-4 text-dev-accent" />
        </div>
        <span className="text-lg font-semibold text-dev-text font-mono">CostShield</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems?.map((item) => {
          const Icon = item?.icon;
          const isActive = pathname === item?.href;
          return (
            <Link
              key={item?.href}
              href={item?.href ?? '/'}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors font-mono text-sm ${
                isActive
                  ? "bg-dev-accent/10 text-dev-accent border border-dev-accent/30"
                  : "text-dev-muted hover:text-dev-text hover:bg-dev-surface"
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{item?.label ?? ''}</span>
            </Link>
          );
        }) ?? null}
      </nav>

      {/* Docs link */}
      <div className="px-3 py-2 border-t border-dev-border">
        <Link
          href="/docs"
          className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-dev-muted hover:text-dev-text hover:bg-dev-surface transition-colors font-mono text-sm"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Documentation</span>
        </Link>
      </div>

      {/* User Account */}
      <div className="p-4 border-t border-dev-border">
        <div className="flex items-center justify-between">
          <UserButton afterSignOutUrl="/" />
          <span className="text-xs text-dev-muted font-mono">Account</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-dev-surface border-dev-border text-dev-text hover:bg-dev-border">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-dev-bg border-dev-border">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:bg-dev-surface lg:border-r lg:border-dev-border">
        <NavContent />
      </aside>
    </>
  );
}
