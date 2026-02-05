import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-gray-950 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Column 1: Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center mb-4">
              <span className="text-xl font-bold text-white">CostShield</span>
            </Link>
            <p className="text-gray-400 text-sm mb-4">
              Budget protection for AI developers
            </p>
            <p className="text-gray-500 text-xs">
              © 2026 CostShield
            </p>
          </div>

          {/* Column 2: Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/features" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/openclaw" className="text-gray-400 hover:text-white text-sm transition-colors">
                  OpenClaw Integration
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Changelog
                </Link>
              </li>
              <li>
                <Link href="/roadmap" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Roadmap
                </Link>
              </li>
              <li>
                <Link href="/status" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/docs" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/docs/api-reference" className="text-gray-400 hover:text-white text-sm transition-colors">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/use-cases" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Use Cases
                </Link>
              </li>
              <li>
                <Link href="/comparisons" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Comparisons
                </Link>
              </li>
              <li>
                <Link href="/integrations" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Integrations
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white text-sm transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/security" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Security
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-4 text-gray-500 text-xs">
            <span>Status: All Systems Operational ✓</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
