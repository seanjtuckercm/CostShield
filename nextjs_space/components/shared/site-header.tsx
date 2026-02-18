"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Terminal } from "lucide-react";

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/pricing", label: "Pricing" },
    { href: "/docs", label: "Docs" },
    { href: "/features", label: "Features" },
  ];

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-200 ${
        isScrolled
          ? "bg-dev-bg/95 backdrop-blur-sm border-b border-dev-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo + Links */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-dev-accent/10 border border-dev-accent/30 rounded-sm flex items-center justify-center">
                <Terminal className="w-4 h-4 text-dev-accent" />
              </div>
              <span className="text-lg font-semibold text-dev-text font-mono">CostShield</span>
            </Link>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {navLinks?.map((link) => (
                <Link
                  key={link?.href}
                  href={link?.href ?? '/'}
                  className="text-dev-muted hover:text-dev-text text-sm font-medium transition-colors"
                >
                  {link?.label ?? ''}
                </Link>
              )) ?? null}
            </div>
          </div>

          {/* Right: Auth + CTA */}
          <div className="flex items-center space-x-4">
            <Link
              href="/sign-in"
              className="hidden md:block text-dev-muted hover:text-dev-text text-sm font-medium transition-colors"
            >
              Sign In
            </Link>
            <Button
              asChild
              className="bg-dev-accent text-dev-bg hover:bg-dev-accent/90 font-mono text-sm rounded-sm"
            >
              <Link href="/sign-up">Get API Key</Link>
            </Button>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-dev-muted hover:text-dev-text">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] bg-dev-bg border-dev-border">
                <div className="flex flex-col space-y-4 mt-8">
                  {navLinks?.map((link) => (
                    <Link
                      key={link?.href}
                      href={link?.href ?? '/'}
                      className="text-dev-muted hover:text-dev-text text-base font-medium transition-colors"
                    >
                      {link?.label ?? ''}
                    </Link>
                  )) ?? null}
                  <Link
                    href="/sign-in"
                    className="text-dev-muted hover:text-dev-text text-base font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
