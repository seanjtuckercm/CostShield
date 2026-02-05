import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center bg-gradient-to-b from-gray-900 to-gray-950 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          {/* Left Column: Text Content (60%) */}
          <div className="lg:col-span-3 space-y-8">
            {/* Pre-Headline Badge */}
            <Badge className="bg-brand-green/10 text-brand-green border-brand-green/20 px-4 py-1.5">
              🛡️ Budget Protection for AI Developers
            </Badge>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Your AI Budget,{" "}
              <span className="bg-gradient-to-r from-brand-green to-brand-blue bg-clip-text text-transparent">
                Protected.
              </span>
              <br />
              Your Costs,{" "}
              <span className="bg-gradient-to-r from-brand-green to-brand-blue bg-clip-text text-transparent">
                Optimized.
              </span>
            </h1>

            {/* Sub-Headline */}
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl leading-relaxed">
              CostShield is the OpenAI proxy that enforces budget limits, tracks every token, and prevents runaway costs—so you can build with AI fearlessly.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-brand-green to-brand-green-dark hover:from-brand-green-light hover:to-brand-green text-white text-base px-8 py-6 h-auto"
              >
                <Link href="/sign-up">
                  Start Free - 10K requests/mo
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white text-base px-8 py-6 h-auto"
              >
                <Link href="/docs">
                  View Docs →
                </Link>
              </Button>
            </div>

            {/* Social Proof Line */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <span className="text-brand-green">✓</span>
                No credit card required
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-2">
                <span className="text-brand-green">✓</span>
                2 minute setup
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-2">
                <span className="text-brand-green">✓</span>
                OpenClaw native
              </span>
            </div>
          </div>

          {/* Right Column: Dashboard Visual (40%) */}
          <div className="lg:col-span-2">
            <div className="relative bg-gray-850 border border-gray-700 rounded-lg p-8 shadow-2xl">
              {/* Placeholder for Dashboard Visual */}
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-brand-green/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Dashboard Visual
                  </p>
                  <p className="text-gray-500 text-xs">
                    (Coming soon)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
